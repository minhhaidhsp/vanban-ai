from pydantic import BaseModel
from datetime import datetime


class OcrJobResponse(BaseModel):
    id: str
    user_id: str
    filename: str
    status: str        # "pending" | "processing" | "done" | "error"
    text: str | None
    formatted_text: str | None = None
    page_count: int | None
    char_count: int | None
    error_msg: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class OcrJobStatusResponse(BaseModel):
    id: str
    status: str
    text: str | None
    formatted_text: str | None = None
    page_count: int | None
    char_count: int | None
    error_msg: str | None

    model_config = {"from_attributes": True}


class OcrJobListResponse(BaseModel):
    items: list[OcrJobResponse]
    total: int
