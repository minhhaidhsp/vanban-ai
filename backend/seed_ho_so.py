"""Seed 2 hồ sơ demo cho tính năng Hồ sơ hành chính."""
import asyncio
import sys
import uuid
import json
from datetime import datetime, timezone, timedelta

sys.path.insert(0, ".")

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text

from app.core.config import get_settings
from app.models.ho_so import HoSo, HoSoBuoc, HoSoFile
from app.models.document import Document

settings = get_settings()

_db_url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://").replace("postgresql+psycopg2://", "postgresql+asyncpg://")
engine = create_async_engine(_db_url, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

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


async def get_owner_id(db: AsyncSession) -> str:
    result = await db.execute(text("SELECT id FROM users WHERE email = 'canbo@civicai.vn' LIMIT 1"))
    row = result.fetchone()
    if row:
        return str(row[0])
    result = await db.execute(text("SELECT id FROM users LIMIT 1"))
    row = result.fetchone()
    if row:
        return str(row[0])
    raise RuntimeError("Không tìm thấy user nào trong DB. Hãy chạy seed_demo_users.py trước.")


async def seed():
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        owner_id = await get_owner_id(db)
        print(f"[seed] owner_id = {owner_id}")

        # Kiểm tra đã có seed chưa
        existing = (await db.execute(
            select(HoSo).where(HoSo.ma_ho_so.in_(["HS-2026-001", "HS-2026-002"]))
        )).scalars().all()
        if existing:
            print(f"[seed] Da co {len(existing)} ho so demo. Bo qua.")
            return

        # ── Hồ sơ 1: đang xử lý bước 2 ─────────────────────────────────────
        hs1_id = str(uuid.uuid4())
        hs1 = HoSo(
            id=hs1_id,
            ma_ho_so="HS-2026-001",
            loai_thu_tuc="Đăng ký thành lập hộ kinh doanh",
            ten_chu_ho_so="Nguyễn Thị Lan Anh",
            mo_ta="Cửa hàng Hoa Tươi Lan Anh, 45 Lê Lợi",
            ma_dvc="OH-0096751/26",
            trang_thai="dang_xu_ly",
            owner_id=owner_id,
            han_xu_ly=now + timedelta(days=5),
        )
        db.add(hs1)

        buocs1 = []
        for i, tmpl in enumerate(BUOC_MAC_DINH):
            trang_thai = "cho"
            ket_qua = None
            hoan_thanh_luc = None
            if tmpl["thu_tu"] == 1:
                trang_thai = "xong"
                ket_qua = "Hồ sơ đầy đủ 4 loại giấy tờ"
                hoan_thanh_luc = now - timedelta(hours=2)
            elif tmpl["thu_tu"] == 2:
                trang_thai = "dang_lam"
            b = HoSoBuoc(
                id=str(uuid.uuid4()),
                ho_so_id=hs1_id,
                thu_tu=tmpl["thu_tu"],
                ten_buoc=tmpl["ten_buoc"],
                mo_ta=tmpl["mo_ta"],
                loai_hanh_dong=tmpl["loai_hanh_dong"],
                trang_thai=trang_thai,
                ket_qua=ket_qua,
                hoan_thanh_luc=hoan_thanh_luc,
            )
            db.add(b)
            buocs1.append(b)

        # ── Hồ sơ 2: chờ bổ sung ─────────────────────────────────────────────
        hs2_id = str(uuid.uuid4())
        hs2 = HoSo(
            id=hs2_id,
            ma_ho_so="HS-2026-002",
            loai_thu_tuc="Đăng ký thành lập hộ kinh doanh",
            ten_chu_ho_so="Phạm Minh Tuấn",
            mo_ta="Sửa chữa điện tử Minh Tuấn, 12 Nguyễn Trãi",
            ma_dvc="OH-0096629/26",
            trang_thai="cho_bo_sung",
            ly_do_bo_sung="Thiếu bản sao CCCD công chứng của chủ hộ kinh doanh",
            owner_id=owner_id,
            han_xu_ly=now + timedelta(days=12),
        )
        db.add(hs2)

        for tmpl in BUOC_MAC_DINH:
            trang_thai = "cho"
            ket_qua = None
            hoan_thanh_luc = None
            if tmpl["thu_tu"] == 1:
                trang_thai = "xong"
                ket_qua = "Thiếu bản sao CCCD công chứng. Đã thông báo yêu cầu bổ sung."
                hoan_thanh_luc = now - timedelta(days=1)
            b = HoSoBuoc(
                id=str(uuid.uuid4()),
                ho_so_id=hs2_id,
                thu_tu=tmpl["thu_tu"],
                ten_buoc=tmpl["ten_buoc"],
                mo_ta=tmpl["mo_ta"],
                loai_hanh_dong=tmpl["loai_hanh_dong"],
                trang_thai=trang_thai,
                ket_qua=ket_qua,
                hoan_thanh_luc=hoan_thanh_luc,
            )
            db.add(b)

        await db.commit()
        print("[seed] OK Da tao HS-2026-001 (dang xu ly buoc 2)")
        print("[seed] OK Da tao HS-2026-002 (cho bo sung)")



# ── Content NĐ30 cho 2 document ──────────────────────────────────────────────

# Document 1: Giấy đề nghị đăng ký HKD
# loai_vb = "CV" (Công văn — loại gần nhất cho đơn của công dân gửi cơ quan,
#   có kinhGui, không in tên loại riêng theo NĐ30; trichYeu chứa tiêu đề thực)
_CONTENT_DOC1 = {
    "loaiVanBan":     "CV",
    "coQuanChuQuan":  "",
    "coQuanBanHanh":  "",
    "soKyHieu":       "",
    "diaDanh":        "TP. Hồ Chí Minh",
    "ngayThang":      "ngày 02 tháng 01 năm 2026",
    "trichYeu":       "GIẤY ĐỀ NGHỊ ĐĂNG KÝ HỘ KINH DOANH",
    "kinhGui":        "Phòng Kinh tế - Hạ tầng UBND Quận 1, TP. Hồ Chí Minh",
    "doMat":          "Thường",
    "doKhan":         "Thường",
    "canCu":          "",
    "noiDung": (
        "<p>Tôi là: NGUYỄN THỊ LAN ANH &nbsp;|&nbsp; Sinh ngày: 15/03/1990 &nbsp;|&nbsp; Giới tính: Nữ</p>"
        "<p>Số CCCD: 079190003456 &nbsp;|&nbsp; Ngày cấp: 20/01/2022 &nbsp;|&nbsp; Nơi cấp: Cục CS QLHC về TTXH</p>"
        "<p>Nơi thường trú: 45 Lê Lợi, Phường Bến Nghé, Quận 1, TP. HCM</p>"
        "<p>Điện thoại: 0901234567</p>"
        "<p>&nbsp;</p>"
        "<p>Đề nghị đăng ký thành lập hộ kinh doanh:</p>"
        "<ol>"
        "<li>Tên HKD: <strong>HỘ KINH DOANH HOA TƯƠI LAN ANH</strong></li>"
        "<li>Địa chỉ trụ sở: 45 Lê Lợi, Phường Bến Nghé, Quận 1, TP. HCM</li>"
        "<li>Ngành nghề KD chính: Bán lẻ hoa, cây cảnh (Mã ngành: 4776)</li>"
        "<li>Vốn kinh doanh: 50.000.000 đồng (Năm mươi triệu đồng)</li>"
        "<li>Tổng số lao động dự kiến: 2 người</li>"
        "<li>Chủ thể thành lập: Cá nhân</li>"
        "</ol>"
        "<p>&nbsp;</p>"
        "<p>Tôi cam kết chịu trách nhiệm trước pháp luật về tính hợp pháp, chính xác và trung thực của nội dung đăng ký trên.</p>"
    ),
    "quyenHanKy":     "",
    "chucDanhTapThe": "",
    "chucVuKy":       "Chủ hộ kinh doanh",
    "hoTenKy":        "Nguyễn Thị Lan Anh",
    "noiNhan":        ["- Phòng Kinh tế - Hạ tầng UBND Quận 1;", "- Lưu: HS."],
}

# Document 2: GCN Đăng ký HKD (bản nháp)
# loai_vb = "QĐ" (Quyết định — loại gần nhất cho Giấy chứng nhận do cơ quan
#   nhà nước ban hành; GCN là văn bản hành chính có hiệu lực pháp lý tương đương QĐ)
_CONTENT_DOC2 = {
    "loaiVanBan":     "QĐ",
    "coQuanChuQuan":  "UBND QUẬN 1 - TP. HỒ CHÍ MINH",
    "coQuanBanHanh":  "PHÒNG KINH TẾ - HẠ TẦNG",
    "soKyHieu":       "___/GCN-KTHT",
    "diaDanh":        "TP. Hồ Chí Minh",
    "ngayThang":      "ngày ___ tháng ___ năm 2026",
    "trichYeu":       "GIẤY CHỨNG NHẬN ĐĂNG KÝ HỘ KINH DOANH",
    "kinhGui":        "",
    "doMat":          "Thường",
    "doKhan":         "Thường",
    "canCu": (
        "<p>Căn cứ Nghị định số 01/2021/NĐ-CP ngày 04 tháng 01 năm 2021 của Chính phủ "
        "về đăng ký doanh nghiệp;</p>"
        "<p>Căn cứ hồ sơ đăng ký hộ kinh doanh của bà Nguyễn Thị Lan Anh (Mã DVC: OH-0096751/26),</p>"
    ),
    "noiDung": (
        "<p><strong>Mã số hộ kinh doanh:</strong> 41A8027439</p>"
        "<p><strong>Tên hộ kinh doanh:</strong> HỘ KINH DOANH HOA TƯƠI LAN ANH</p>"
        "<p><strong>Địa chỉ trụ sở:</strong> 45 Lê Lợi, Phường Bến Nghé, Quận 1, TP. HCM</p>"
        "<p><strong>Ngành nghề kinh doanh:</strong> Bán lẻ hoa, cây cảnh (Mã: 4776)</p>"
        "<p><strong>Vốn kinh doanh:</strong> 50.000.000 đồng (Năm mươi triệu đồng)</p>"
        "<p>&nbsp;</p>"
        "<p><strong>Thông tin chủ hộ kinh doanh:</strong></p>"
        "<p>Họ tên: NGUYỄN THỊ LAN ANH &nbsp;|&nbsp; Ngày sinh: 15/03/1990</p>"
        "<p>Số CCCD: 079190003456</p>"
        "<p>Nơi thường trú: 45 Lê Lợi, Phường Bến Nghé, Quận 1, TP. HCM</p>"
        "<p>&nbsp;</p>"
        "<p>Đăng ký lần đầu ngày: ___/___/2026</p>"
        "<p>&nbsp;</p>"
        "<p><em>[BẢN NHÁP — CHỜ LÃNH ĐẠO KÝ DUYỆT]</em></p>"
    ),
    "quyenHanKy":     "TM.",
    "chucDanhTapThe": "UBND QUẬN 1",
    "chucVuKy":       "TRƯỞNG PHÒNG KINH TẾ - HẠ TẦNG",
    "hoTenKy":        "(chờ ký)",
    "noiNhan":        ["- Hộ kinh doanh Hoa Tươi Lan Anh;", "- Lưu: VT, KTHT."],
}


async def seed_documents():
    """Tạo 2 document NĐ30 và gắn vào bước 3 + 4 của HS-2026-001."""
    async with AsyncSessionLocal() as db:
        # Lấy HS-2026-001
        hs1 = (await db.execute(
            select(HoSo).where(HoSo.ma_ho_so == "HS-2026-001")
        )).scalar_one_or_none()
        if not hs1:
            print("[seed_docs] HS-2026-001 not found. Chay seed() truoc.")
            return

        owner_id = hs1.owner_id

        # Kiểm tra idempotent: nếu buoc 3 đã có document_id thì bỏ qua
        buoc3 = (await db.execute(
            select(HoSoBuoc).where(
                HoSoBuoc.ho_so_id == hs1.id,
                HoSoBuoc.thu_tu == 3,
            )
        )).scalar_one_or_none()

        if buoc3 and buoc3.document_id:
            print(f"[seed_docs] Buoc 3 da co document_id={buoc3.document_id}. Bo qua.")
            return

        # ── Document 1: Giấy đề nghị ──────────────────────────────────────
        doc1_id = str(uuid.uuid4())
        doc1 = Document(
            id=doc1_id,
            title="Giay de nghi dang ky ho kinh doanh - Hoa Tuoi Lan Anh",
            content=json.dumps(_CONTENT_DOC1, ensure_ascii=False),
            loai_vb="CV",
            source="editor",
            owner_id=owner_id,
        )
        db.add(doc1)

        # ── Document 2: GCN bản nháp ───────────────────────────────────────
        doc2_id = str(uuid.uuid4())
        doc2 = Document(
            id=doc2_id,
            title="GCN Dang ky HKD Hoa Tuoi Lan Anh (ban nhap)",
            content=json.dumps(_CONTENT_DOC2, ensure_ascii=False),
            loai_vb="QD",
            source="editor",
            owner_id=owner_id,
        )
        db.add(doc2)
        await db.flush()

        # ── Gắn document_id vào bước 3 (soan_thao) ────────────────────────
        if buoc3:
            buoc3.document_id = doc1_id

        buoc4 = (await db.execute(
            select(HoSoBuoc).where(
                HoSoBuoc.ho_so_id == hs1.id,
                HoSoBuoc.thu_tu == 4,
            )
        )).scalar_one_or_none()
        if buoc4:
            buoc4.document_id = doc2_id

        await db.commit()
        print(f"[seed_docs] doc1 id={doc1_id} (Giay de nghi, loai_vb=CV)")
        print(f"[seed_docs] doc2 id={doc2_id} (GCN ban nhap, loai_vb=QD)")
        buoc3_ok = "OK" if buoc3 else "NOT FOUND"
        buoc4_ok = "OK" if buoc4 else "NOT FOUND"
        print(f"[seed_docs] Buoc 3 document_id updated: {buoc3_ok}")
        print(f"[seed_docs] Buoc 4 document_id updated: {buoc4_ok}")


async def _main():
    await seed()
    await seed_documents()


if __name__ == "__main__":
    asyncio.run(_main())
