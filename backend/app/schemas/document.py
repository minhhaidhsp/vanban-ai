from pydantic import BaseModel
from datetime import datetime


class DocumentBase(BaseModel):
    title: str
    content: str | None = None


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    title: str | None = None
    content: str | None = None


class DocumentResponse(DocumentBase):
    id: str
    file_path: str | None
    file_type: str | None
    owner_id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
