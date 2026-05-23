"""
RAG (Retrieval-Augmented Generation) service cho VănBản.AI.

Pipeline: retrieve → rerank → build_context → generate → validate
"""
import asyncio
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

DEFAULT_TOP_K = 10
DEFAULT_MIN_SCORE = 0.35
DEFAULT_TOP_N_RERANK = 5
MAX_CONTEXT_CHARS = 2500  # ~1500 tokens (Vietnamese ~1.5 chars/token), an toàn với model 4096 ctx

INSUFFICIENT_CONTEXT_MSG = (
    "Không tìm thấy thông tin liên quan "
    "trong kho văn bản. Vui lòng thử câu hỏi khác "
    "hoặc bổ sung thêm văn bản vào kho."
)

_SYSTEM_PROMPT = """\
Bạn là trợ lý tra cứu văn bản hành chính Việt Nam.
Nhiệm vụ: Trả lời câu hỏi DỰA TRÊN các đoạn văn bản được đánh số [1], [2], [3]... dưới đây.

QUY TẮC BẮT BUỘC:
1. Chỉ dùng thông tin từ các đoạn [1][2][3]...
2. Sau mỗi thông tin, PHẢI ghi citation: ví dụ "...quy định [1]" hoặc "Căn cứ [2]..."
3. Nếu không có thông tin → trả lời: "Không tìm thấy thông tin liên quan."
4. KHÔNG bịa đặt thông tin ngoài các đoạn trích.
5. Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng.

Ví dụ câu trả lời đúng:
"Theo quy định [1], thủ tục đăng ký hộ tịch cần... Căn cứ [2], thời hạn giải quyết là..."\
"""

_RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
_reranker = None  # lazy-loaded


def _get_reranker():
    global _reranker
    if _reranker is None:
        try:
            from sentence_transformers import CrossEncoder
            logger.info("[rag] loading reranker %s", _RERANKER_MODEL)
            _reranker = CrossEncoder(_RERANKER_MODEL)
            logger.info("[rag] reranker loaded")
        except Exception as exc:
            logger.warning("[rag] CrossEncoder load failed: %s — rerank skipped", exc)
    return _reranker


# ── Service ──────────────────────────────────────────────────────────────────

class RAGService:

    async def retrieve(
        self,
        query: str,
        db: AsyncSession,
        top_k: int = DEFAULT_TOP_K,
        min_score: float = DEFAULT_MIN_SCORE,
    ) -> list[dict]:
        """
        Embed query rồi tìm top-k chunks gần nhất bằng pgvector cosine.
        Chỉ trả về chunks có score >= min_score.
        """
        from app.services.embedding_service import embed_text
        from app.models.reference_doc_chunk import ReferenceDocChunk
        from app.models.reference_document import ReferenceDocument

        query_vector = await asyncio.to_thread(embed_text, query)

        # cosine_distance ∈ [0, 2]; score = 1 - distance ∈ [-1, 1]
        # score >= min_score  ↔  distance <= 1 - min_score
        max_distance = 1.0 - min_score

        stmt = (
            select(
                ReferenceDocChunk.id,
                ReferenceDocChunk.content,
                ReferenceDocChunk.dieu_khoan,
                ReferenceDocChunk.chunk_index,
                ReferenceDocChunk.token_count,
                ReferenceDocument.id.label("document_id"),
                ReferenceDocument.title.label("document_title"),
                ReferenceDocument.so_ki_hieu,
                ReferenceDocument.co_quan_ban_hanh,
                ReferenceDocument.loai_van_ban,
                (1 - ReferenceDocChunk.embedding.cosine_distance(query_vector)).label("score"),
            )
            .join(ReferenceDocument, ReferenceDocChunk.document_id == ReferenceDocument.id)
            .where(ReferenceDocChunk.embedding.is_not(None))
            .where(
                ReferenceDocChunk.embedding.cosine_distance(query_vector) <= max_distance
            )
            .order_by(ReferenceDocChunk.embedding.cosine_distance(query_vector))
            .limit(top_k)
        )

        result = await db.execute(stmt)
        return [dict(row) for row in result.mappings().all()]

    def rerank(
        self,
        query: str,
        chunks: list[dict],
        top_n: int = DEFAULT_TOP_N_RERANK,
    ) -> list[dict]:
        """
        Rerank chunks bằng CrossEncoder. Nếu model chưa load hoặc lỗi
        thì fallback về thứ tự pgvector gốc.
        """
        if not chunks:
            return chunks

        reranker = _get_reranker()
        if reranker is None:
            logger.warning("[rag] reranker unavailable — using pgvector order")
            return chunks[:top_n]

        try:
            pairs = [(query, c["content"]) for c in chunks]
            scores = reranker.predict(pairs)
            ranked = sorted(
                zip(chunks, scores),
                key=lambda x: float(x[1]),
                reverse=True,
            )
            result = []
            for chunk, score in ranked[:top_n]:
                c = dict(chunk)
                c["rerank_score"] = float(score)
                result.append(c)
            return result
        except Exception as exc:
            logger.warning("[rag] rerank predict failed: %s — using pgvector order", exc)
            return chunks[:top_n]

    def build_context(self, chunks: list[dict]) -> str:
        """
        Ghép chunks thành context string gửi cho LLM.
        Mỗi chunk được đánh số [1], [2]... để LLM có thể cite.
        Giới hạn ~3000 token (~12000 ký tự).
        """
        parts: list[str] = []
        total_chars = 0

        for i, chunk in enumerate(chunks):
            so_ki_hieu = chunk.get("so_ki_hieu") or "?"
            title = chunk.get("document_title") or "?"
            header = f"[{i + 1}] Nguồn: {so_ki_hieu} — {title}"
            dieu_khoan = chunk.get("dieu_khoan") or ""
            body = (
                f"{dieu_khoan}:\n{chunk['content']}"
                if dieu_khoan
                else chunk["content"]
            )
            section = f"{header}\n{body}"

            if total_chars + len(section) > MAX_CONTEXT_CHARS:
                break
            parts.append(section)
            total_chars += len(section)

        return "\n\n---\n\n".join(parts)

    async def generate(
        self,
        query: str,
        context: str,
        chunks: list[dict],
    ) -> dict:
        """
        Gọi LLM với context + query, rồi validate citations.
        Nếu LLM chưa cấu hình → trả INSUFFICIENT_CONTEXT_MSG kèm chunks.
        """
        from app.services.llm_service import llm_service
        from app.services import hallucination_guard

        messages = [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Ngữ cảnh:\n\n{context}\n\nCâu hỏi: {query}",
            },
        ]

        try:
            answer = await llm_service.chat(messages, temperature=0.1, max_tokens=512)
        except ValueError:
            # LLM_BASE_URL rỗng
            logger.warning("[rag] LLM not configured — returning chunks without answer")
            answer = INSUFFICIENT_CONTEXT_MSG
        except Exception as exc:
            logger.error("[rag] LLM generate failed: %s", exc, exc_info=True)
            answer = INSUFFICIENT_CONTEXT_MSG

        validation = hallucination_guard.validate(answer, chunks)

        return {
            "answer": answer,
            "citations": validation.valid_citations,
            "confidence": validation.confidence_score,
            "chunks_used": [
                {
                    "document_title": c.get("document_title"),
                    "so_ki_hieu": c.get("so_ki_hieu"),
                    "dieu_khoan": c.get("dieu_khoan"),
                    "score": float(c.get("score") or 0),
                    "rerank_score": c.get("rerank_score"),
                    "content_preview": c["content"][:200],
                }
                for c in chunks
            ],
        }

    async def query(
        self,
        question: str,
        db: AsyncSession,
        top_k: int = DEFAULT_TOP_K,
        min_score: float = DEFAULT_MIN_SCORE,
    ) -> dict:
        """
        Orchestrator chính: retrieve → rerank → build_context → generate.
        """
        logger.info("[rag] query: %.100s", question)

        chunks = await self.retrieve(question, db, top_k, min_score)
        logger.info("[rag] retrieved %d chunks (top_k=%d, min_score=%.2f)",
                    len(chunks), top_k, min_score)

        if not chunks:
            return {
                "query": question,
                "answer": INSUFFICIENT_CONTEXT_MSG,
                "citations": [],
                "confidence": 0.0,
                "chunks_used": [],
            }

        reranked = self.rerank(question, chunks)
        logger.info("[rag] reranked → %d chunks", len(reranked))

        context = self.build_context(reranked)
        logger.info("[rag] context built: %d chars", len(context))

        result = await self.generate(question, context, reranked)
        result["query"] = question
        return result


rag_service = RAGService()
