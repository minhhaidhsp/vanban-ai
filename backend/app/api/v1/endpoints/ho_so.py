import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.ho_so import HoSo, HoSoBuoc, HoSoFile
from app.schemas.ho_so import (
    HoSoCreate, HoSoUpdate, HoSoOut, HoSoListItem,
    HoSoStats, BuocUpdate, BuocOut, FileOut,
)
import uuid

_MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB
_ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg", "image/jpg", "image/png",
    "image/gif", "image/webp", "image/tiff",
}

logger = logging.getLogger(__name__)
router = APIRouter()

BUOC_MAC_DINH = [
    {
        "thu_tu": 1,
        "ten_buoc": "Tiếp nhận và kiểm tra hồ sơ",
        "mo_ta": "Kiểm tra đủ thành phần: Giấy đề nghị đăng ký HKD, bản sao CCCD, biên bản họp hộ gia đình (nếu có), bản sao văn bản ủy quyền (nếu có)",
        "loai_hanh_dong": "kiem_tra",
    },
    {
        "thu_tu": 2,
        "ten_buoc": "Tra cứu thông tin đăng ký",
        "mo_ta": "Kiểm tra tên HKD chưa trùng với HKD đang hoạt động, ngành nghề kinh doanh không thuộc danh mục cấm, địa chỉ trụ sở hợp lệ",
        "loai_hanh_dong": "tra_cuu",
    },
    {
        "thu_tu": 3,
        "ten_buoc": "Soạn thảo Giấy chứng nhận đăng ký HKD",
        "mo_ta": "Soạn GCN theo mẫu quy định, điền đầy đủ thông tin từ hồ sơ công dân: tên HKD, địa chỉ, ngành nghề, vốn kinh doanh, thông tin chủ hộ",
        "loai_hanh_dong": "soan_thao",
    },
    {
        "thu_tu": 4,
        "ten_buoc": "Trình ký lãnh đạo",
        "mo_ta": "Trình Chủ tịch hoặc Phó Chủ tịch UBND cấp xã ký duyệt Giấy chứng nhận đăng ký hộ kinh doanh",
        "loai_hanh_dong": "trinh_ky",
    },
    {
        "thu_tu": 5,
        "ten_buoc": "Trả kết quả cho công dân",
        "mo_ta": "Thông báo lịch hẹn trả kết quả, trao Giấy chứng nhận trực tiếp tại bộ phận một cửa hoặc gửi qua dịch vụ bưu chính theo đăng ký",
        "loai_hanh_dong": "tra_ket_qua",
    },
]


async def _get_next_ma_ho_so(db: AsyncSession) -> str:
    year = datetime.now(timezone.utc).year
    prefix = f"HS-{year}-"
    result = await db.execute(
        select(func.count(HoSo.id)).where(HoSo.ma_ho_so.like(f"{prefix}%"))
    )
    count = result.scalar() or 0
    return f"{prefix}{str(count + 1).zfill(3)}"


def _hs_access(hs: HoSo, current_user: User) -> None:
    if current_user.role == "admin":
        return
    if hs.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền truy cập hồ sơ này")


def _to_out(hs: HoSo, buocs: list, files: list) -> HoSoOut:
    return HoSoOut(
        id=hs.id,
        ma_ho_so=hs.ma_ho_so,
        loai_thu_tuc=hs.loai_thu_tuc,
        ten_chu_ho_so=hs.ten_chu_ho_so,
        so_dien_thoai=hs.so_dien_thoai,
        dia_chi=hs.dia_chi,
        mo_ta=hs.mo_ta,
        trang_thai=hs.trang_thai,
        nguon=hs.nguon,
        ma_dvc=hs.ma_dvc,
        ly_do_bo_sung=hs.ly_do_bo_sung,
        owner_id=hs.owner_id,
        han_xu_ly=hs.han_xu_ly,
        created_at=hs.created_at,
        updated_at=hs.updated_at,
        buoc=[BuocOut.model_validate(b) for b in buocs],
        files=[FileOut.model_validate(f) for f in files],
    )


@router.get("/", response_model=List[HoSoListItem])
async def list_ho_so(
    trang_thai: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(HoSo)
    if current_user.role != "admin":
        q = q.where(HoSo.owner_id == current_user.id)
    if trang_thai:
        q = q.where(HoSo.trang_thai == trang_thai)
    q = q.order_by(HoSo.created_at.desc())
    rows = (await db.execute(q)).scalars().all()
    return [HoSoListItem.model_validate(r) for r in rows]


@router.post("/", response_model=HoSoOut, status_code=status.HTTP_201_CREATED)
async def create_ho_so(
    payload: HoSoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Retry up to 3 times to handle race condition on ma_ho_so UNIQUE constraint.
    # Two concurrent requests may compute the same sequence number; the second
    # insert fails with IntegrityError → we recount and try again.
    hs = None
    for attempt in range(3):
        ma_ho_so = await _get_next_ma_ho_so(db)
        hs = HoSo(
            id=str(uuid.uuid4()),
            ma_ho_so=ma_ho_so,
            loai_thu_tuc=payload.loai_thu_tuc,
            ten_chu_ho_so=payload.ten_chu_ho_so,
            so_dien_thoai=payload.so_dien_thoai,
            dia_chi=payload.dia_chi,
            mo_ta=payload.mo_ta,
            nguon=payload.nguon,
            ma_dvc=payload.ma_dvc,
            han_xu_ly=payload.han_xu_ly,
            trang_thai="dang_xu_ly",
            owner_id=current_user.id,
        )
        db.add(hs)
        try:
            await db.flush()
            break
        except IntegrityError:
            await db.rollback()
            hs = None
            if attempt == 2:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Không thể tạo mã hồ sơ do xung đột. Vui lòng thử lại.",
                )

    if hs is None:
        raise HTTPException(status_code=500, detail="Lỗi tạo hồ sơ")

    buocs = []
    for i, tmpl in enumerate(BUOC_MAC_DINH):
        buoc = HoSoBuoc(
            id=str(uuid.uuid4()),
            ho_so_id=hs.id,
            thu_tu=tmpl["thu_tu"],
            ten_buoc=tmpl["ten_buoc"],
            mo_ta=tmpl["mo_ta"],
            loai_hanh_dong=tmpl["loai_hanh_dong"],
            trang_thai="dang_lam" if i == 0 else "cho",
        )
        db.add(buoc)
        buocs.append(buoc)

    await db.commit()
    await db.refresh(hs)
    return _to_out(hs, buocs, [])


@router.get("/stats", response_model=HoSoStats)
async def get_ho_so_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thống kê hồ sơ — admin thấy tất cả, staff thấy của mình."""
    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    q = select(HoSo)
    if current_user.role != "admin":
        q = q.where(HoSo.owner_id == current_user.id)
    rows = (await db.execute(q)).scalars().all()

    return HoSoStats(
        tong=len(rows),
        moi=sum(1 for r in rows if r.trang_thai == "moi"),
        dang_xu_ly=sum(1 for r in rows if r.trang_thai == "dang_xu_ly"),
        cho_bo_sung=sum(1 for r in rows if r.trang_thai == "cho_bo_sung"),
        hoan_thanh=sum(1 for r in rows if r.trang_thai == "hoan_thanh"),
        qua_han=sum(
            1 for r in rows
            if r.han_xu_ly and r.han_xu_ly < now and r.trang_thai != "hoan_thanh"
        ),
        hoan_thanh_thang_nay=sum(
            1 for r in rows
            if r.trang_thai == "hoan_thanh" and r.updated_at >= thirty_days_ago
        ),
    )


@router.get("/{ho_so_id}", response_model=HoSoOut)
async def get_ho_so(
    ho_so_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hs = (await db.execute(select(HoSo).where(HoSo.id == ho_so_id))).scalar_one_or_none()
    if not hs:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ")
    _hs_access(hs, current_user)

    buocs = (await db.execute(
        select(HoSoBuoc).where(HoSoBuoc.ho_so_id == ho_so_id).order_by(HoSoBuoc.thu_tu)
    )).scalars().all()

    files = (await db.execute(
        select(HoSoFile).where(HoSoFile.ho_so_id == ho_so_id).order_by(HoSoFile.created_at)
    )).scalars().all()

    return _to_out(hs, list(buocs), list(files))


@router.patch("/{ho_so_id}", response_model=HoSoOut)
async def update_ho_so(
    ho_so_id: str,
    payload: HoSoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hs = (await db.execute(select(HoSo).where(HoSo.id == ho_so_id))).scalar_one_or_none()
    if not hs:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ")
    _hs_access(hs, current_user)

    # Bug 2 fix: block any trang_thai change once hoan_thanh
    if hs.trang_thai == "hoan_thanh" and payload.trang_thai is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hồ sơ đã hoàn thành, không thể thay đổi trạng thái",
        )

    # Bug 3 fix: cho_bo_sung requires ly_do_bo_sung
    if payload.trang_thai == "cho_bo_sung" and not payload.ly_do_bo_sung and not hs.ly_do_bo_sung:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="ly_do_bo_sung bắt buộc khi chuyển sang chờ bổ sung",
        )

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(hs, field, val)
    hs.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(hs)

    buocs = (await db.execute(
        select(HoSoBuoc).where(HoSoBuoc.ho_so_id == ho_so_id).order_by(HoSoBuoc.thu_tu)
    )).scalars().all()
    files = (await db.execute(
        select(HoSoFile).where(HoSoFile.ho_so_id == ho_so_id).order_by(HoSoFile.created_at)
    )).scalars().all()

    return _to_out(hs, list(buocs), list(files))


@router.patch("/{ho_so_id}/buoc/{buoc_id}", response_model=BuocOut)
async def update_buoc(
    ho_so_id: str,
    buoc_id: str,
    payload: BuocUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hs = (await db.execute(select(HoSo).where(HoSo.id == ho_so_id))).scalar_one_or_none()
    if not hs:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ")
    _hs_access(hs, current_user)

    # Bug 1 fix: block buoc updates after ho_so is hoan_thanh
    if hs.trang_thai == "hoan_thanh":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Hồ sơ đã hoàn thành, không thể cập nhật bước",
        )

    buoc = (await db.execute(
        select(HoSoBuoc).where(HoSoBuoc.id == buoc_id, HoSoBuoc.ho_so_id == ho_so_id)
    )).scalar_one_or_none()
    if not buoc:
        raise HTTPException(status_code=404, detail="Không tìm thấy bước")

    # Bug 4 fix: validate document_id exists before attaching
    if payload.document_id:
        doc_count = (await db.execute(
            select(func.count(Document.id)).where(Document.id == payload.document_id)
        )).scalar()
        if not doc_count:
            raise HTTPException(status_code=404, detail="Document không tồn tại")

    # Bug 5 fix: must be currently dang_lam to set xong (enforce step ordering)
    if payload.trang_thai == "xong" and buoc.trang_thai != "dang_lam":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Chỉ có thể hoàn thành bước đang thực hiện",
        )

    for field, val in payload.model_dump(exclude_none=True).items():
        setattr(buoc, field, val)

    if payload.trang_thai == "xong":
        buoc.hoan_thanh_luc = datetime.now(timezone.utc)

        all_buocs = (await db.execute(
            select(HoSoBuoc).where(HoSoBuoc.ho_so_id == ho_so_id).order_by(HoSoBuoc.thu_tu)
        )).scalars().all()

        if buoc.thu_tu == 5:
            hs.trang_thai = "hoan_thanh"
            hs.updated_at = datetime.now(timezone.utc)
        else:
            for b in all_buocs:
                if b.thu_tu == buoc.thu_tu + 1:
                    b.trang_thai = "dang_lam"
                    break

    await db.commit()
    await db.refresh(buoc)
    return BuocOut.model_validate(buoc)


@router.post("/{ho_so_id}/files", response_model=FileOut)
async def upload_file(
    ho_so_id: str,
    file: UploadFile = File(...),
    loai_file: str = Form(default="ho_so_goc"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hs = (await db.execute(select(HoSo).where(HoSo.id == ho_so_id))).scalar_one_or_none()
    if not hs:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ")
    _hs_access(hs, current_user)

    # Validate file type
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Loại file không hỗ trợ ({content_type}). Chỉ chấp nhận PDF và ảnh.",
        )

    content = await file.read()
    kich_thuoc = len(content)

    # Validate file size
    if kich_thuoc > _MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File quá lớn ({kich_thuoc // 1024 // 1024}MB). Tối đa 15MB.",
        )

    ho_so_file = HoSoFile(
        id=str(uuid.uuid4()),
        ho_so_id=ho_so_id,
        ten_file=file.filename or "unknown",
        loai_file=loai_file,
        duong_dan=None,
        kich_thuoc=kich_thuoc,
        uploaded_by=current_user.id,
    )
    db.add(ho_so_file)
    await db.commit()
    await db.refresh(ho_so_file)
    return FileOut.model_validate(ho_so_file)


@router.delete("/{ho_so_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ho_so(
    ho_so_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    hs = (await db.execute(select(HoSo).where(HoSo.id == ho_so_id))).scalar_one_or_none()
    if not hs:
        raise HTTPException(status_code=404, detail="Không tìm thấy hồ sơ")
    if current_user.role != "admin" and hs.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Không có quyền xóa hồ sơ này")

    await db.delete(hs)
    await db.commit()
