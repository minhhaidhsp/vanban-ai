"""
RAG (Retrieval-Augmented Generation) service cho VănBản.AI.

Pipeline: retrieve → rerank → build_context → generate → validate
Fallback: khi LLM offline → trả chunks trực tiếp (không có LLM answer)
"""
import asyncio
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sql_func

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

LLM_OFFLINE_MSG = (
    "⚠️ LLM hiện không khả dụng. "
    "Dưới đây là các đoạn văn bản liên quan nhất từ kho tài liệu:"
)

_SYSTEM_PROMPT = """Bạn là chuyên gia văn bản hành chính Việt Nam.
Nhiệm vụ: Trả lời câu hỏi DỰA TRÊN các văn bản trong [CONTEXT].

QUY TẮC BẮT BUỘC:
1. CHỈ dùng thông tin có trong [CONTEXT] — KHÔNG suy diễn, KHÔNG dùng kiến thức chung
2. MỖI câu trả lời PHẢI kết thúc bằng ít nhất 1 trích dẫn: [Nguồn: tên/số văn bản]
3. Kiểm tra chủ đề trước khi trả lời:
   - Nếu câu hỏi về: giá cả, thị trường, tài chính, thuế, tuyển sinh, thời tiết,
     lịch nghỉ, kết hôn người nước ngoài, hay bất kỳ chủ đề KHÔNG LIÊN QUAN đến
     thủ tục hành chính/văn bản pháp lý trong [CONTEXT] →
     Trả lời ĐÚNG 1 câu: "Kho tài liệu hiện tại không có thông tin về vấn đề này."
   - Nếu câu hỏi liên quan đến nội dung trong [CONTEXT] →
     Trả lời đầy đủ với trích dẫn [Nguồn: ...]
4. Trả lời bằng tiếng Việt, ngắn gọn, đủ ý

VÍ DỤ ĐÚNG — câu hỏi in-scope:
Hỏi: "Thủ tục chứng thực chữ ký gồm gì?"
Đáp: "Theo [Nguồn: QĐ-UBND TP.HCM công bố TTHC chứng thực], thủ tục gồm:
(1) Nộp hồ sơ tại UBND cấp xã...
(2) Cán bộ kiểm tra giấy tờ...
[Nguồn: Danh mục TTHC lĩnh vực chứng thực]"

VÍ DỤ ĐÚNG — câu hỏi out-of-scope:
Hỏi: "Giá vàng hôm nay là bao nhiêu?"
Đáp: "Kho tài liệu hiện tại không có thông tin về vấn đề này."

VÍ DỤ SAI (KHÔNG làm):
- Trả lời câu hỏi không có trong context
- Bịa số văn bản, ngày tháng
- Trả lời mà không có [Nguồn: ...]

[CONTEXT]
{context}
[/CONTEXT]

Câu hỏi: {query}"""

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


def _chunk_row(c: dict) -> dict:
    return {
        "document_title": c.get("document_title"),
        "so_ki_hieu": c.get("so_ki_hieu"),
        "dieu_khoan": c.get("dieu_khoan"),
        "score": float(c.get("score") or 0),
        "rerank_score": c.get("rerank_score"),
        "content_preview": c["content"][:300],
    }


# ── Service ──────────────────────────────────────────────────────────────────

class RAGService:

    async def retrieve(
        self,
        query: str,
        db: AsyncSession,
        top_k: int = DEFAULT_TOP_K,
        min_score: float = DEFAULT_MIN_SCORE,
        source_ids: list[str] | None = None,
    ) -> list[dict]:
        """
        Embed query rồi tìm top-k chunks gần nhất bằng pgvector cosine.
        Chỉ trả về chunks có score >= min_score.
        Nếu source_ids không rỗng → chỉ tìm trong reference docs đó.
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
                ReferenceDocument.hieu_luc,
                (1 - ReferenceDocChunk.embedding.cosine_distance(query_vector)).label("score"),
            )
            .join(ReferenceDocument, ReferenceDocChunk.document_id == ReferenceDocument.id)
            .where(ReferenceDocChunk.embedding.is_not(None))
            .where(ReferenceDocument.hieu_luc != "het_hieu_luc")
            .where(
                ReferenceDocChunk.embedding.cosine_distance(query_vector) <= max_distance
            )
            .order_by(ReferenceDocChunk.embedding.cosine_distance(query_vector))
            .limit(top_k)
        )

        if source_ids:
            stmt = stmt.where(ReferenceDocChunk.document_id.in_(source_ids))

        result = await db.execute(stmt)
        return [dict(row) for row in result.mappings().all()]

    async def hybrid_search(
        self,
        query: str,
        db: AsyncSession,
        top_k: int = 5,
    ) -> list[dict]:
        """
        Kết hợp semantic search (pgvector) + FTS (tsvector).
        hybrid_score = 0.7 × semantic_score + 0.3 × fts_rank
        """
        # 1. Semantic search với threshold relaxed
        semantic_chunks = await self.retrieve(
            query, db,
            top_k=top_k * 2,
            min_score=0.2,
        )

        # 2. FTS — lấy document-level rank để boost semantic chunks
        terms = [t.strip() for t in query.strip().split() if t.strip()]
        if terms:
            tsquery_str = " & ".join(terms)
            tsq_expr = sql_func.to_tsquery("simple", sql_func.unaccent(tsquery_str))

            from app.models.reference_document import ReferenceDocument
            rank_expr = sql_func.ts_rank(
                ReferenceDocument.search_vector, tsq_expr
            ).label("fts_rank")

            fts_stmt = (
                select(ReferenceDocument.id.label("document_id"), rank_expr)
                .where(ReferenceDocument.search_vector.op("@@")(tsq_expr))
                .limit(top_k * 2)
            )
            try:
                fts_result = await db.execute(fts_stmt)
                fts_docs: dict[str, float] = {
                    str(row.document_id): float(row.fts_rank)
                    for row in fts_result
                }
            except Exception as exc:
                logger.warning("[rag] FTS failed in hybrid_search: %s", exc)
                fts_docs = {}
        else:
            fts_docs = {}

        # 3. Merge — thêm hybrid_score vào mỗi chunk
        for chunk in semantic_chunks:
            doc_id = str(chunk.get("document_id") or "")
            fts_rank = fts_docs.get(doc_id, 0.0)
            chunk["hybrid_score"] = (
                0.7 * float(chunk.get("score") or 0)
                + 0.3 * fts_rank
            )

        # 4. Sort by hybrid_score → top_k
        semantic_chunks.sort(
            key=lambda x: x.get("hybrid_score", 0),
            reverse=True,
        )
        return semantic_chunks[:top_k]

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
        Gọi LLM với context + query, rồi validate đa chiều (citation + semantic).
        Nếu LLM chưa cấu hình → trả INSUFFICIENT_CONTEXT_MSG kèm chunks.
        """
        from app.services.llm_service import llm_service
        from app.services.hallucination_guard import validate_full

        messages = [
            {
                "role": "system",
                "content": _SYSTEM_PROMPT.format(context=context, query=query),
            },
        ]

        try:
            answer = await llm_service.chat(messages, temperature=0.05, max_tokens=512)
        except ValueError:
            logger.warning("[rag] LLM not configured — returning chunks without answer")
            answer = INSUFFICIENT_CONTEXT_MSG
        except Exception as exc:
            logger.error("[rag] LLM generate failed: %s", exc, exc_info=True)
            answer = INSUFFICIENT_CONTEXT_MSG

        validation = await validate_full(answer, chunks)

        confidence = validation.confidence_score
        fallback_mode = False

        # FIX 2: Nếu LLM tự nhận "không có thông tin" → cap confidence thấp
        _OUT_OF_SCOPE_PHRASES = [
            "kho tài liệu hiện tại không có thông tin về vấn đề này",
            "ngoài phạm vi tài liệu",
            "không có trong kho tài liệu",
            "không có thông tin về vấn đề này",
            "không tìm thấy thông tin liên quan",
            "nằm ngoài phạm vi",
            "không thuộc phạm vi",
        ]
        if any(p in answer.lower() for p in _OUT_OF_SCOPE_PHRASES):
            confidence = min(confidence, 0.2)
            fallback_mode = True
            logger.info("[rag] out-of-scope detected in answer — confidence capped to %.2f", confidence)

        logger.info(
            "[rag] validation: confidence=%.3f citation=%.3f semantic=%.3f fallback=%s",
            confidence,
            validation.citation_score,
            validation.semantic_score,
            fallback_mode,
        )

        # Only prepend disclaimer for in-scope low-confidence answers,
        # not for out-of-scope rejections (which already have a clear message)
        if (validation.has_disclaimer or confidence < 0.5) and not fallback_mode:
            answer = (
                "⚠️ Lưu ý: Câu trả lời này cần được kiểm tra lại với văn bản gốc.\n\n"
                + answer
            )

        expired_sources = [c for c in chunks if c.get("hieu_luc") == "het_hieu_luc"]
        if expired_sources:
            answer = (
                "⚠️ Lưu ý: Một số nguồn tham chiếu có thể đã hết hiệu lực.\n\n"
                + answer
            )

        return {
            "answer": answer,
            "citations": validation.valid_citations,
            "confidence": confidence,
            "citation_score": validation.citation_score,
            "semantic_score": validation.semantic_score,
            "has_disclaimer": validation.has_disclaimer or confidence < 0.5,
            "fallback_mode": fallback_mode,
            "chunks_used": [_chunk_row(c) for c in chunks],
        }

    async def query(
        self,
        question: str,
        db: AsyncSession,
        top_k: int = DEFAULT_TOP_K,
        min_score: float = DEFAULT_MIN_SCORE,
    ) -> dict:
        """
        Orchestrator chính với fallback chain:
          1. retrieve → retry với threshold relaxed nếu không có kết quả
          2. Nếu LLM offline → trả chunks trực tiếp (fallback_mode=True)
          3. Nếu không có chunks → INSUFFICIENT_CONTEXT_MSG
          4. Normal: rerank → build_context → generate
        """
        from app.services.llm_service import llm_service

        logger.info("[rag] query: %.100s", question)

        # Bước 1: Retrieve với threshold gốc
        chunks = await self.retrieve(question, db, top_k, min_score)
        logger.info(
            "[rag] retrieved %d chunks (top_k=%d, min_score=%.2f)",
            len(chunks), top_k, min_score,
        )

        # Bước 1b: Retry với threshold relaxed
        if not chunks:
            logger.info("[rag] no chunks at %.2f, retry at 0.2", min_score)
            chunks = await self.retrieve(question, db, top_k, min_score=0.2)
            logger.info("[rag] retry retrieved %d chunks", len(chunks))

        # Bước 2: Kiểm tra LLM availability
        llm_available = bool(llm_service._base_url)

        if not llm_available:
            logger.warning("[rag] LLM offline, fallback to chunks only")

            if not chunks:
                return {
                    "query": question,
                    "answer": INSUFFICIENT_CONTEXT_MSG,
                    "citations": [],
                    "chunks_used": [],
                    "confidence": 0.0,
                    "citation_score": 0.0,
                    "semantic_score": 0.0,
                    "has_disclaimer": True,
                    "llm_available": False,
                    "fallback_mode": True,
                }

            reranked = self.rerank(question, chunks)
            return {
                "query": question,
                "answer": LLM_OFFLINE_MSG,
                "citations": [],
                "chunks_used": [_chunk_row(c) for c in reranked],
                "confidence": 0.0,
                "citation_score": 0.0,
                "semantic_score": 0.0,
                "has_disclaimer": True,
                "llm_available": False,
                "fallback_mode": True,
            }

        # Bước 3: Không có chunks sau retry
        if not chunks:
            return {
                "query": question,
                "answer": INSUFFICIENT_CONTEXT_MSG,
                "citations": [],
                "chunks_used": [],
                "confidence": 0.0,
                "citation_score": 0.0,
                "semantic_score": 0.0,
                "has_disclaimer": False,
                "llm_available": True,
                "fallback_mode": False,
            }

        # Bước 4: Normal flow — rerank → build_context → generate
        reranked = self.rerank(question, chunks)
        logger.info("[rag] reranked → %d chunks", len(reranked))

        context = self.build_context(reranked)
        logger.info("[rag] context built: %d chars", len(context))

        result = await self.generate(question, context, reranked)
        result["query"] = question
        result["llm_available"] = True
        # fallback_mode may be set True by generate() (out-of-scope detection)
        result.setdefault("fallback_mode", False)
        return result


rag_service = RAGService()


async def warm_up_reranker() -> None:
    """Trigger lazy load of CrossEncoder at startup to avoid cold-start latency."""
    try:
        await asyncio.to_thread(_get_reranker)
        logger.info("[rag] reranker warmed up")
    except Exception as exc:
        logger.warning("[rag] reranker warm up failed: %s", exc)
