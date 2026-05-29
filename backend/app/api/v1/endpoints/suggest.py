from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.trich_yeu_history import TrichYeuHistory
from app.models.user import User

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class CanCuSuggestRequest(BaseModel):
    loai_vb: str
    trich_yeu: str
    top_k: int = 5


class CanCuItem(BaseModel):
    text: str
    source_doc: str
    so_ki_hieu: str | None
    score: float
    rerank_score: float


class CanCuSuggestResponse(BaseModel):
    items: list[CanCuItem]
    total: int
    query_used: str


class TrichYeuSuggestRequest(BaseModel):
    loai_vb: str
    mo_ta: str = ""


class TrichYeuSuggestResponse(BaseModel):
    suggestions: list[str]
    fallback: bool


class SoKiHieuResponse(BaseModel):
    so_ki_hieu: str
    format_giai_thich: str
    vi_du: str


class TrichYeuHistoryItem(BaseModel):
    trich_yeu: str
    loai_van_ban: str
    used_count: int
    last_used_at: str | None


class TrichYeuHistoryResponse(BaseModel):
    items: list[TrichYeuHistoryItem]
    total: int


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/can-cu", response_model=CanCuSuggestResponse)
async def suggest_can_cu(
    body: CanCuSuggestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gợi ý căn cứ pháp lý dựa trên RAG pipeline."""
    from app.services.suggest_service import suggest_can_cu as _suggest

    query_used = f"căn cứ pháp lý {body.loai_vb} về {body.trich_yeu}"
    items_raw = await _suggest(body.loai_vb, body.trich_yeu, db, top_k=body.top_k)

    items = [CanCuItem(**item) for item in items_raw]
    return CanCuSuggestResponse(items=items, total=len(items), query_used=query_used)


@router.post("/trich-yeu", response_model=TrichYeuSuggestResponse)
async def suggest_trich_yeu(
    body: TrichYeuSuggestRequest,
    current_user: User = Depends(get_current_user),
):
    """Gợi ý 3 mẫu trích yếu. LLM offline → fallback template."""
    from app.services.suggest_service import suggest_trich_yeu as _suggest

    suggestions, fallback = await _suggest(body.loai_vb, body.mo_ta)
    return TrichYeuSuggestResponse(suggestions=suggestions, fallback=fallback)


@router.get("/so-ki-hieu", response_model=SoKiHieuResponse)
async def suggest_so_ki_hieu(
    loai_vb: str = Query(..., description="Loại văn bản, vd: Quyết định"),
    co_quan: str = Query("", description="Tên cơ quan ban hành"),
    current_user: User = Depends(get_current_user),
):
    """Gợi ý format số/ký hiệu theo NĐ30. Rule-based, không cần LLM."""
    from app.services.suggest_service import suggest_so_ki_hieu as _suggest

    return SoKiHieuResponse(**_suggest(loai_vb, co_quan))


@router.get("/trich-yeu-history", response_model=TrichYeuHistoryResponse)
async def get_trich_yeu_history(
    loai_vb: str = Query(..., description="Loại văn bản, vd: QĐ"),
    limit: int = Query(10, ge=1, le=50),
    q: str = Query("", description="Tìm kiếm trong trích yếu"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lấy lịch sử trích yếu đã dùng, sắp xếp theo tần suất sử dụng."""
    query = select(TrichYeuHistory).where(
        TrichYeuHistory.loai_van_ban == loai_vb,
        TrichYeuHistory.created_by == str(current_user.id),
    )
    if q:
        query = query.where(TrichYeuHistory.trich_yeu.ilike(f"%{q}%"))
    query = query.order_by(
        TrichYeuHistory.used_count.desc(),
        TrichYeuHistory.last_used_at.desc(),
    ).limit(limit)

    result = await db.execute(query)
    rows = result.scalars().all()

    items = [
        TrichYeuHistoryItem(
            trich_yeu=r.trich_yeu,
            loai_van_ban=r.loai_van_ban,
            used_count=r.used_count,
            last_used_at=r.last_used_at.isoformat() if r.last_used_at else None,
        )
        for r in rows
    ]
    return TrichYeuHistoryResponse(items=items, total=len(items))
