from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func as sql_func, case
from datetime import timedelta
from typing import List
from app.core.config import get_settings
from app.core.database import get_db
from app.core.redis import get_redis
from app.core.storage import upload_file
from app.api.deps import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.trich_yeu_history import TrichYeuHistory
from app.schemas.document import DocumentCreate, DocumentResponse, DocumentUpdate
from app.services.document_pipeline_service import process_document_background
from datetime import datetime
import json
import logging
import re
import uuid

logger = logging.getLogger(__name__)

router = APIRouter()

# Prefix theo NĐ30 cho từng loại văn bản (abbreviation key)
_TRICH_YEU_PREFIX: dict[str, str] = {
    "CV": "V/v ",
    "TB": "Về việc ",
    "TTr": "Về việc ",
    "BC": "Về ",
    "GM": "Về việc ",
    "GGT": "Về việc ",
}


def _normalize_trich_yeu(trich_yeu: str, loai_vb: str | None) -> str:
    t = trich_yeu.strip()
    if not t:
        return t
    if t.startswith(("V/v", "Về việc", "Về ")):
        return t
    prefix = _TRICH_YEU_PREFIX.get(loai_vb or "", "")
    return f"{prefix}{t.lstrip()}" if prefix else t


async def _save_trich_yeu_history(
    doc: Document,
    db: AsyncSession,
    user_id: str,
) -> None:
    try:
        content = json.loads(doc.content or "{}")
        trich_yeu = content.get("trichYeu", "").strip()
        loai_vb = content.get("loaiVanBan", doc.loai_vb or "VB")
    except (json.JSONDecodeError, AttributeError):
        return

    if not trich_yeu or len(trich_yeu) < 3:
        return

    normalized = _normalize_trich_yeu(trich_yeu, loai_vb)

    existing = (await db.execute(
        select(TrichYeuHistory).where(
            TrichYeuHistory.loai_van_ban == loai_vb,
            TrichYeuHistory.trich_yeu == normalized,
            TrichYeuHistory.created_by == user_id,
        )
    )).scalar_one_or_none()

    if existing:
        existing.used_count += 1
        existing.last_used_at = datetime.utcnow()
    else:
        db.add(TrichYeuHistory(
            loai_van_ban=loai_vb,
            trich_yeu=normalized,
            created_by=user_id,
            source_doc_id=str(doc.id),
        ))
    logger.debug("[trich_yeu_history] saved: %s / %s", loai_vb, normalized[:50])


@router.get("/", response_model=list[DocumentResponse])
async def list_documents(
    skip: int = 0,
    limit: int = 100,
    source: str | None = None,
    sort: str = "created_at",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Document).where(Document.owner_id == current_user.id)
    if source in ("editor", "upload"):
        query = query.where(Document.source == source)
    order_col = Document.updated_at if sort == "updated_at" else Document.created_at
    query = query.offset(skip).limit(limit).order_by(order_col.desc())
    result = await db.execute(query)
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
        source="editor",
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)
    return document


# Must be before /{document_id} to avoid route conflict
@router.get("/stats")
async def get_document_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thống kê tài liệu của người dùng."""
    uid = current_user.id

    # Aggregate counts in one query
    agg = (await db.execute(
        select(
            sql_func.count(Document.id).label("total"),
            sql_func.count(case((Document.source == "editor", 1))).label("editor_count"),
            sql_func.count(case((Document.source == "upload", 1))).label("upload_count"),
        ).where(Document.owner_id == uid)
    )).one()

    # By loai_vb
    type_rows = (await db.execute(
        select(Document.loai_vb, sql_func.count(Document.id))
        .where(Document.owner_id == uid, Document.loai_vb.isnot(None))
        .group_by(Document.loai_vb)
    )).all()
    by_type = {r[0]: r[1] for r in type_rows}

    # Recent 7 days
    cutoff = datetime.utcnow() - timedelta(days=7)
    recent_7_days = (await db.execute(
        select(sql_func.count(Document.id))
        .where(Document.owner_id == uid, Document.created_at >= cutoff)
    )).scalar() or 0

    return {
        "total": agg.total,
        "editor_count": agg.editor_count,
        "upload_count": agg.upload_count,
        "by_type": by_type,
        "recent_7_days": recent_7_days,
    }


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


@router.post("/upload-batch", status_code=status.HTTP_202_ACCEPTED)
async def upload_batch(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload nhiều file cùng lúc. Trả về 202 ngay, xử lý nền theo từng job."""
    settings = get_settings()
    if len(files) > settings.upload_max_files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tối đa {settings.upload_max_files} file mỗi lần upload",
        )

    redis = await get_redis()
    jobs = []

    for file in files:
        file_data = await file.read()
        job_id = str(uuid.uuid4())
        doc_id = str(uuid.uuid4())
        filename = file.filename or "unknown"
        file_type = file.content_type or "application/octet-stream"

        # Upload file to MinIO immediately
        object_name = f"{current_user.id}/{doc_id}/{uuid.uuid4()}_{filename}"
        await upload_file(file_data, object_name, file_type)

        # Create Document record
        document = Document(
            id=doc_id,
            title=filename,
            owner_id=current_user.id,
            file_path=object_name,
            file_type=file_type,
            source="upload",
        )
        db.add(document)

        # Save initial job status in Redis (TTL 24h)
        await redis.set(
            f"doc_job:{job_id}",
            json.dumps({"status": "pending", "filename": filename, "doc_id": doc_id}),
            ex=settings.doc_job_ttl_seconds,
        )

        # Schedule background processing (file bytes already read — safe after response)
        background_tasks.add_task(
            process_document_background,
            job_id=job_id,
            doc_id=doc_id,
            file_data=file_data,
            filename=filename,
            file_type=file_type,
            owner_id=str(current_user.id),
        )

        jobs.append({"job_id": job_id, "filename": filename})
        logger.info("[upload_batch] queued job=%s doc=%s file=%s", job_id, doc_id, filename)

    await db.flush()
    return {"jobs": jobs}


@router.get("/status/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
):
    """Poll trạng thái xử lý của một file upload job."""
    redis = await get_redis()
    data = await redis.get(f"doc_job:{job_id}")
    if not data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found or expired")
    info = json.loads(data)
    return {
        "job_id": job_id,
        "status": info.get("status", "unknown"),
        "filename": info.get("filename", ""),
        "error": info.get("error", None),
    }


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
    await _save_trich_yeu_history(document, db, current_user.id)
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


@router.post("/{document_id}/export/pdf")
async def export_document_pdf(
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

    try:
        data = json.loads(document.content or "{}")
    except Exception:
        data = {}

    from app.services.pdf_service import generate_pdf
    pdf_bytes = await generate_pdf(data)

    # Build safe filename: {soKyHieu}_{title}.pdf
    so_ky = data.get("soKyHieu") or document.title or document_id
    raw_name = f"{so_ky}_{document.title or ''}".strip("_")
    safe_name = re.sub(r'[/\\:*?"<>|]', "-", raw_name)[:120] + ".pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


@router.post("/{document_id}/upload", response_model=DocumentResponse)
async def upload_document_file(
    document_id: str,
    background_tasks: BackgroundTasks,
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

    # Read bytes and upload to MinIO immediately (needed for the response)
    file_data = await file.read()
    filename = file.filename or "unknown"
    file_type = file.content_type or "application/octet-stream"
    object_name = f"{current_user.id}/{document_id}/{uuid.uuid4()}_{filename}"
    await upload_file(file_data, object_name, file_type)

    document.file_path = object_name
    document.file_type = file_type
    await db.flush()
    await db.refresh(document)

    # Schedule text extraction + embedding in background (avoids timeout on large files)
    settings = get_settings()
    redis = await get_redis()
    job_id = str(uuid.uuid4())
    await redis.set(
        f"doc_job:{job_id}",
        json.dumps({"status": "pending", "filename": filename, "doc_id": document_id}),
        ex=settings.doc_job_ttl_seconds,
    )
    background_tasks.add_task(
        process_document_background,
        job_id=job_id,
        doc_id=document_id,
        file_data=file_data,
        filename=filename,
        file_type=file_type,
        owner_id=str(current_user.id),
    )
    logger.info("[upload] queued background processing job=%s doc=%s", job_id, document_id)

    return document
