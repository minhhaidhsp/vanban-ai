from pydantic import BaseModel
from datetime import date, datetime
from typing import Any


class RefDocBase(BaseModel):
    title: str
    loai_van_ban: str
    so_ki_hieu: str
    ngay_ban_hanh: date | None = None
    co_quan_ban_hanh: str
    nguoi_ky: str | None = None
    trich_yeu: str
    hieu_luc: str = "chua"
    tom_tat: str | None = None
    tu_khoa: list[str] = []


class RefDocCreate(RefDocBase):
    pass


class RefDocUpdate(BaseModel):
    title: str | None = None
    loai_van_ban: str | None = None
    so_ki_hieu: str | None = None
    ngay_ban_hanh: date | None = None
    co_quan_ban_hanh: str | None = None
    nguoi_ky: str | None = None
    trich_yeu: str | None = None
    hieu_luc: str | None = None
    tom_tat: str | None = None
    tu_khoa: list[str] | None = None


class RefDocResponse(RefDocBase):
    id: str
    file_path: str | None = None
    file_size: int | None = None
    file_type: str | None = None
    created_at: datetime
    updated_at: datetime
    created_by: str
    download_url: str | None = None
    # Populated only by the semantic search endpoint
    score: float | None = None

    model_config = {"from_attributes": True}


class RefDocListResponse(BaseModel):
    items: list[RefDocResponse]
    total: int
    skip: int
    limit: int


class RefDocSearchResponse(BaseModel):
    items: list[RefDocResponse]
    query: str


class RefDocChunkSearchItem(BaseModel):
    document_id: str
    document_title: str
    so_ki_hieu: str
    chunk_index: int
    dieu_khoan: str | None
    content_preview: str
    score: float


class RefDocChunkSearchResponse(BaseModel):
    items: list[RefDocChunkSearchItem]
    query: str


class RefDocFTSItem(RefDocResponse):
    rank: float = 0.0


class RefDocFTSResponse(BaseModel):
    items: list[RefDocFTSItem]
    query: str


# ── Metadata preview / confirm ────────────────────────────────────────────────

class MetadataConfidence(BaseModel):
    so_ki_hieu: str = "unknown"
    ngay_ban_hanh: str = "unknown"
    co_quan_ban_hanh: str = "unknown"
    nguoi_ky: str = "unknown"
    trich_yeu: str = "unknown"
    can_cu: str = "unknown"
    hieu_luc: str = "unknown"
    tom_tat: str = "unknown"

    model_config = {"extra": "allow"}


class MetadataPreviewResponse(BaseModel):
    doc_id: str
    status: str  # "ready" | "processing" | "not_available"
    fields: dict[str, Any] | None = None
    confidence: MetadataConfidence | None = None
    extracted_at: datetime | None = None


class MetadataConfirmRequest(BaseModel):
    so_ki_hieu: str | None = None
    ngay_ban_hanh: date | None = None
    co_quan_ban_hanh: str | None = None
    nguoi_ky: str | None = None
    trich_yeu: str | None = None
    hieu_luc: str | None = None
    tom_tat: str | None = None
    can_cu: list[str] = []
