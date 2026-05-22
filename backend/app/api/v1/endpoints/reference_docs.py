from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sql_func, or_
from app.core.database import get_db
from app.core.storage import get_minio_client, ensure_bucket_exists, get_file_url
from app.api.deps import get_current_user
from app.models.user import User
from app.models.reference_document import ReferenceDocument
from app.schemas.reference_document import (
    RefDocCreate, RefDocUpdate, RefDocResponse, RefDocListResponse,
)
import asyncio
import uuid
import io

router = APIRouter()

REF_DOCS_BUCKET = "reference-docs"


def _add_url(doc: ReferenceDocument) -> RefDocResponse:
    resp = RefDocResponse.model_validate(doc)
    if doc.file_path:
        try:
            resp.download_url = get_file_url(doc.file_path, bucket_name=REF_DOCS_BUCKET)
        except Exception:
            pass
    return resp


@router.get("/", response_model=RefDocListResponse)
async def list_ref_docs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    loai: str | None = Query(None),
    hieu_luc: str | None = Query(None),
    q: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = select(ReferenceDocument).where(ReferenceDocument.created_by == current_user.id)
    if loai:
        base = base.where(ReferenceDocument.loai_van_ban == loai)
    if hieu_luc:
        base = base.where(ReferenceDocument.hieu_luc == hieu_luc)
    if q:
        pattern = f"%{q}%"
        base = base.where(
            or_(
                ReferenceDocument.title.ilike(pattern),
                ReferenceDocument.trich_yeu.ilike(pattern),
                ReferenceDocument.so_ki_hieu.ilike(pattern),
                ReferenceDocument.co_quan_ban_hanh.ilike(pattern),
            )
        )

    total_result = await db.execute(select(sql_func.count()).select_from(base.subquery()))
    total = total_result.scalar() or 0

    result = await db.execute(
        base.order_by(ReferenceDocument.created_at.desc()).offset(skip).limit(limit)
    )
    items = [_add_url(d) for d in result.scalars().all()]
    return RefDocListResponse(items=items, total=total, skip=skip, limit=limit)


@router.post("/", response_model=RefDocResponse, status_code=status.HTTP_201_CREATED)
async def create_ref_doc(
    doc_in: RefDocCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = ReferenceDocument(**doc_in.model_dump(), created_by=current_user.id)
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return _add_url(doc)


@router.get("/{doc_id}", response_model=RefDocResponse)
async def get_ref_doc(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ReferenceDocument).where(
            ReferenceDocument.id == doc_id,
            ReferenceDocument.created_by == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return _add_url(doc)


@router.put("/{doc_id}", response_model=RefDocResponse)
async def update_ref_doc(
    doc_id: str,
    doc_in: RefDocUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ReferenceDocument).where(
            ReferenceDocument.id == doc_id,
            ReferenceDocument.created_by == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    for field, value in doc_in.model_dump(exclude_unset=True).items():
        setattr(doc, field, value)

    await db.flush()
    await db.refresh(doc)
    return _add_url(doc)


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ref_doc(
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ReferenceDocument).where(
            ReferenceDocument.id == doc_id,
            ReferenceDocument.created_by == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if doc.file_path:
        try:
            client = get_minio_client()
            client.remove_object(REF_DOCS_BUCKET, doc.file_path)
        except Exception:
            pass

    await db.delete(doc)


@router.post("/{doc_id}/upload", response_model=RefDocResponse)
async def upload_ref_doc_file(
    doc_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ReferenceDocument).where(
            ReferenceDocument.id == doc_id,
            ReferenceDocument.created_by == current_user.id,
        )
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    file_data = await file.read()
    object_name = f"{current_user.id}/{doc_id}/{uuid.uuid4()}_{file.filename}"
    content_type = file.content_type or "application/octet-stream"

    # Run blocking MinIO I/O in a thread so it doesn't starve the DB connection
    def _upload():
        client = get_minio_client()
        ensure_bucket_exists(client, REF_DOCS_BUCKET)
        client.put_object(
            bucket_name=REF_DOCS_BUCKET,
            object_name=object_name,
            data=io.BytesIO(file_data),
            length=len(file_data),
            content_type=content_type,
        )

    await asyncio.get_event_loop().run_in_executor(None, _upload)

    old_path = doc.file_path
    doc.file_path = object_name
    doc.file_size = len(file_data)
    doc.file_type = content_type

    try:
        await db.flush()
        await db.refresh(doc)
    except Exception:
        # DB update failed — remove the just-uploaded file to avoid orphaning it in MinIO
        def _cleanup():
            try:
                get_minio_client().remove_object(REF_DOCS_BUCKET, object_name)
            except Exception:
                pass
        await asyncio.get_event_loop().run_in_executor(None, _cleanup)
        raise

    # Remove old file AFTER the DB flush succeeded
    if old_path and old_path != object_name:
        def _remove_old():
            try:
                get_minio_client().remove_object(REF_DOCS_BUCKET, old_path)
            except Exception:
                pass
        await asyncio.get_event_loop().run_in_executor(None, _remove_old)

    return _add_url(doc)
