from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.document import Document
from app.models.document_source import DocumentSource
from app.models.reference_document import ReferenceDocument
from app.models.user import User
from app.schemas.reference_document import RefDocResponse
from app.core.storage import get_file_url
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

REF_DOCS_BUCKET = "reference-docs"


class AddSourceRequest(BaseModel):
    reference_doc_id: str


def _add_url(doc: ReferenceDocument) -> RefDocResponse:
    resp = RefDocResponse.model_validate(doc)
    if doc.file_path:
        try:
            resp.download_url = get_file_url(doc.file_path, bucket_name=REF_DOCS_BUCKET)
        except Exception:
            pass
    return resp


async def _check_doc_access(document_id: str, user: User, db: AsyncSession) -> Document:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.owner_id == user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


@router.get("/{document_id}/sources", response_model=list[RefDocResponse])
async def list_sources(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Danh sách reference docs đã gắn vào document này."""
    await _check_doc_access(document_id, current_user, db)

    result = await db.execute(
        select(ReferenceDocument)
        .join(DocumentSource, DocumentSource.reference_doc_id == ReferenceDocument.id)
        .where(DocumentSource.document_id == document_id)
        .order_by(DocumentSource.added_at.asc())
    )
    return [_add_url(d) for d in result.scalars().all()]


@router.post("/{document_id}/sources", status_code=status.HTTP_201_CREATED)
async def add_source(
    document_id: str,
    body: AddSourceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gắn một reference doc vào document."""
    await _check_doc_access(document_id, current_user, db)

    # Check reference doc accessible: own private OR org/system
    ref_result = await db.execute(
        select(ReferenceDocument).where(ReferenceDocument.id == body.reference_doc_id)
    )
    ref_doc = ref_result.scalar_one_or_none()
    if not ref_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reference document not found")
    if ref_doc.visibility == "private" and ref_doc.created_by != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Check duplicate
    existing = await db.execute(
        select(DocumentSource).where(
            DocumentSource.document_id == document_id,
            DocumentSource.reference_doc_id == body.reference_doc_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Source already added")

    db.add(DocumentSource(document_id=document_id, reference_doc_id=body.reference_doc_id))
    await db.flush()
    logger.info("[doc_sources] added ref=%s to doc=%s", body.reference_doc_id, document_id)
    return {"status": "added"}


@router.delete("/{document_id}/sources/{reference_doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_source(
    document_id: str,
    reference_doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gỡ một reference doc khỏi document."""
    await _check_doc_access(document_id, current_user, db)
    await db.execute(
        delete(DocumentSource).where(
            DocumentSource.document_id == document_id,
            DocumentSource.reference_doc_id == reference_doc_id,
        )
    )
