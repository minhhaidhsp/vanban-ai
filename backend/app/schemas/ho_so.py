from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class HoSoCreate(BaseModel):
    loai_thu_tuc: str
    ten_chu_ho_so: str
    so_dien_thoai: Optional[str] = None
    dia_chi: Optional[str] = None
    mo_ta: Optional[str] = None
    nguon: Optional[str] = None
    ma_dvc: Optional[str] = None
    han_xu_ly: Optional[datetime] = None


class HoSoUpdate(BaseModel):
    trang_thai: Optional[str] = None
    ly_do_bo_sung: Optional[str] = None
    han_xu_ly: Optional[datetime] = None
    mo_ta: Optional[str] = None
    so_dien_thoai: Optional[str] = None
    dia_chi: Optional[str] = None


class BuocUpdate(BaseModel):
    trang_thai: Optional[str] = None
    ket_qua: Optional[str] = None
    document_id: Optional[str] = None


class BuocOut(BaseModel):
    id: str
    ho_so_id: str
    thu_tu: int
    ten_buoc: str
    mo_ta: Optional[str] = None
    loai_hanh_dong: str
    trang_thai: str
    ket_qua: Optional[str] = None
    document_id: Optional[str] = None
    hoan_thanh_luc: Optional[datetime] = None

    model_config = {"from_attributes": True}


class FileOut(BaseModel):
    id: str
    ho_so_id: str
    ten_file: str
    loai_file: str
    duong_dan: Optional[str] = None
    kich_thuoc: Optional[int] = None
    uploaded_by: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class HoSoOut(BaseModel):
    id: str
    ma_ho_so: str
    loai_thu_tuc: str
    ten_chu_ho_so: str
    so_dien_thoai: Optional[str] = None
    dia_chi: Optional[str] = None
    mo_ta: Optional[str] = None
    trang_thai: str
    nguon: Optional[str] = None
    ma_dvc: Optional[str] = None
    ly_do_bo_sung: Optional[str] = None
    owner_id: str
    han_xu_ly: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    buoc: List[BuocOut] = []
    files: List[FileOut] = []

    model_config = {"from_attributes": True}


class HoSoListItem(BaseModel):
    id: str
    ma_ho_so: str
    loai_thu_tuc: str
    ten_chu_ho_so: str
    trang_thai: str
    han_xu_ly: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HoSoStats(BaseModel):
    tong: int
    moi: int
    dang_xu_ly: int
    cho_bo_sung: int
    hoan_thanh: int
    qua_han: int
    hoan_thanh_thang_nay: int


class NotificationOut(BaseModel):
    id: str
    ho_so_id: str
    loai: str
    tieu_de: str
    noi_dung: str
    da_doc: bool
    kenh: str
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListOut(BaseModel):
    items: List[NotificationOut]
    unread_count: int
