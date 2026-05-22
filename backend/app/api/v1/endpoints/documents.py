from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sql_func
from app.core.database import get_db
from app.core.storage import upload_file
from app.api.deps import get_current_user
from app.models.user import User
from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentResponse, DocumentUpdate
from datetime import datetime
import uuid

router = APIRouter()


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document)
        .where(Document.owner_id == current_user.id)
        .offset(skip)
        .limit(limit)
        .order_by(Document.created_at.desc())
    )
    return result.scalars().all()


@router.post("/", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    document_in: DocumentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = Document(
        **document_in.model_dump(),
        owner_id=current_user.id,
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)
    return document


# Must be before /{document_id} to avoid route conflict
@router.get("/next-number")
async def get_next_number(
    loai: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    nam = datetime.now().year
    result = await db.execute(
        select(sql_func.count(Document.id)).where(
            Document.loai_vb == loai,
            Document.nam == nam,
            Document.owner_id == current_user.id,
        )
    )
    count = result.scalar() or 0
    return {"so": count + 1, "nam": nam, "loai": loai}


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.owner_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: str,
    document_in: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.owner_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    for field, value in document_in.model_dump(exclude_unset=True).items():
        setattr(document, field, value)

    await db.flush()
    await db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.owner_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await db.delete(document)


@router.post("/{document_id}/upload", response_model=DocumentResponse)
async def upload_document_file(
    document_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Document).where(
            Document.id == document_id, Document.owner_id == current_user.id
        )
    )
    document = result.scalar_one_or_none()
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    file_data = await file.read()
    object_name = f"{current_user.id}/{document_id}/{uuid.uuid4()}_{file.filename}"
    await upload_file(file_data, object_name, file.content_type or "application/octet-stream")

    document.file_path = object_name
    document.file_type = file.content_type
    await db.flush()
    await db.refresh(document)
    return document
