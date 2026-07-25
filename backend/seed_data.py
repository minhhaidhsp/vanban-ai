"""
Seed data script — VănBản.AI
Chạy: cd backend && venv\Scripts\python.exe seed_data.py

Tạo dữ liệu mẫu cho:
  1. Hồ sơ hành chính (5 cases đa dạng trạng thái)
  2. Nhắc hẹn (5 cases đa dạng kênh / trạng thái)
  3. Speech-to-text không có DB — xem ghi chú cuối file
"""

import asyncio
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, text
from app.core.database import AsyncSessionLocal
from app.models.ho_so import HoSo, HoSoBuoc, HoSoFile
from app.models.reminder import Reminder
from app.models.user import User

# ── Cấu hình ──────────────────────────────────────────────────────────────────

OWNER_EMAIL = "minhhaidhsp@gmail.com"   # account sẽ sở hữu toàn bộ seed data

# Bộ bước chuẩn (giống BUOC_MAC_DINH trong ho_so.py)
BUOC_MAC_DINH = [
    {"thu_tu": 1, "ten_buoc": "Tiếp nhận và kiểm tra hồ sơ",      "loai_hanh_dong": "kiem_tra"},
    {"thu_tu": 2, "ten_buoc": "Tra cứu thông tin đăng ký",          "loai_hanh_dong": "tra_cuu"},
    {"thu_tu": 3, "ten_buoc": "Soạn thảo Giấy chứng nhận đăng ký", "loai_hanh_dong": "soan_thao"},
    {"thu_tu": 4, "ten_buoc": "Trình ký lãnh đạo",                  "loai_hanh_dong": "trinh_ky"},
    {"thu_tu": 5, "ten_buoc": "Trả kết quả cho công dân",           "loai_hanh_dong": "tra_ket_qua"},
]

now = datetime.now(timezone.utc)


def uid() -> str:
    return str(uuid.uuid4())


def ma_ho_so(prefix: str, n: int) -> str:
    return f"HS-{prefix}-{now.strftime('%Y%m')}-{n:04d}"


# ── Hồ sơ hành chính ──────────────────────────────────────────────────────────
# 5 cases: moi / dang_xu_ly (bước 2) / dang_xu_ly (bước 4) / cho_bo_sung / hoan_thanh / qua_han

HO_SO_CASES = [
    # Case 1 — vừa tiếp nhận, bước 1 đang xử lý
    {
        "id": uid(),
        "ma_ho_so": ma_ho_so("HKD", 1),
        "loai_thu_tuc": "Đăng ký hộ kinh doanh",
        "ten_chu_ho_so": "Nguyễn Văn An",
        "so_dien_thoai": "0901234567",
        "dia_chi": "45 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP.HCM",
        "mo_ta": "Đăng ký kinh doanh mới — bán hàng tạp hóa",
        "trang_thai": "moi",
        "nguon": "truc_tiep",
        "han_xu_ly": now + timedelta(days=5),
        "buoc_hien_tai": 1,     # bước 1 đang làm
        "buoc_xong_den": 0,     # chưa bước nào xong
    },
    # Case 2 — đang xử lý, đã qua bước 1-2, đang ở bước 3
    {
        "id": uid(),
        "ma_ho_so": ma_ho_so("HKD", 2),
        "loai_thu_tuc": "Đăng ký thay đổi nội dung đăng ký HKD",
        "ten_chu_ho_so": "Trần Thị Bích",
        "so_dien_thoai": "0912345678",
        "dia_chi": "12 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
        "mo_ta": "Thay đổi địa chỉ và ngành nghề kinh doanh",
        "trang_thai": "dang_xu_ly",
        "nguon": "online",
        "han_xu_ly": now + timedelta(days=3),
        "buoc_hien_tai": 3,
        "buoc_xong_den": 2,
    },
    # Case 3 — đang xử lý, sắp hoàn thành (bước 4 trình ký)
    {
        "id": uid(),
        "ma_ho_so": ma_ho_so("CCN", 3),
        "loai_thu_tuc": "Xác nhận cư trú (tạm trú / thường trú)",
        "ten_chu_ho_so": "Lê Minh Tuấn",
        "so_dien_thoai": "0933456789",
        "dia_chi": "78 Đinh Tiên Hoàng, Phường Đa Kao, Quận 1, TP.HCM",
        "mo_ta": "Xác nhận tạm trú để làm hồ sơ vay vốn ngân hàng",
        "trang_thai": "dang_xu_ly",
        "nguon": "buu_chinh",
        "han_xu_ly": now + timedelta(days=1),
        "buoc_hien_tai": 4,
        "buoc_xong_den": 3,
    },
    # Case 4 — trả về bổ sung hồ sơ
    {
        "id": uid(),
        "ma_ho_so": ma_ho_so("HKD", 4),
        "loai_thu_tuc": "Chấm dứt hoạt động hộ kinh doanh",
        "ten_chu_ho_so": "Phạm Thị Hoa",
        "so_dien_thoai": "0944567890",
        "dia_chi": "30 Hai Bà Trưng, Phường Tân Định, Quận 1, TP.HCM",
        "mo_ta": "Chấm dứt hoạt động do chuyển nhượng",
        "trang_thai": "cho_bo_sung",
        "nguon": "truc_tiep",
        "ly_do_bo_sung": "Thiếu bản sao CCCD công chứng. Thiếu xác nhận không nợ thuế từ Chi cục Thuế.",
        "han_xu_ly": now + timedelta(days=7),
        "buoc_hien_tai": 1,
        "buoc_xong_den": 0,
    },
    # Case 5 — hoàn thành toàn bộ
    {
        "id": uid(),
        "ma_ho_so": ma_ho_so("HKD", 5),
        "loai_thu_tuc": "Đăng ký hộ kinh doanh",
        "ten_chu_ho_so": "Võ Thanh Long",
        "so_dien_thoai": "0955678901",
        "dia_chi": "5 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
        "mo_ta": "Kinh doanh nhà hàng ăn uống — đã hoàn thành",
        "trang_thai": "hoan_thanh",
        "nguon": "online",
        "han_xu_ly": now - timedelta(days=2),    # đã qua hạn nhưng xong trước
        "buoc_hien_tai": None,
        "buoc_xong_den": 5,                       # tất cả 5 bước xong
    },
    # Case 6 — quá hạn, vẫn đang xử lý
    {
        "id": uid(),
        "ma_ho_so": ma_ho_so("CCN", 6),
        "loai_thu_tuc": "Cấp giấy xác nhận tình trạng hôn nhân",
        "ten_chu_ho_so": "Đặng Ngọc Mai",
        "so_dien_thoai": "0966789012",
        "dia_chi": "100 Pasteur, Phường Võ Thị Sáu, Quận 3, TP.HCM",
        "mo_ta": "Cần xác nhận tình trạng hôn nhân để đi xuất cảnh",
        "trang_thai": "dang_xu_ly",
        "nguon": "truc_tiep",
        "han_xu_ly": now - timedelta(days=3),    # quá hạn 3 ngày
        "buoc_hien_tai": 2,
        "buoc_xong_den": 1,
    },
]


def _make_buocs(ho_so_id: str, buoc_hien_tai, buoc_xong_den: int) -> list[HoSoBuoc]:
    """Tạo 5 bước với trạng thái tương ứng."""
    buocs = []
    for tmpl in BUOC_MAC_DINH:
        n = tmpl["thu_tu"]
        if buoc_xong_den >= n:
            trang_thai = "xong"
            hoan_thanh_luc = now - timedelta(days=(buoc_xong_den - n + 1))
            ket_qua = f"Hoàn thành {tmpl['ten_buoc'].lower()}. Kết quả đạt yêu cầu."
        elif buoc_hien_tai == n:
            trang_thai = "dang_lam"
            hoan_thanh_luc = None
            ket_qua = None
        else:
            trang_thai = "cho"
            hoan_thanh_luc = None
            ket_qua = None

        buocs.append(HoSoBuoc(
            id=uid(),
            ho_so_id=ho_so_id,
            thu_tu=n,
            ten_buoc=tmpl["ten_buoc"],
            loai_hanh_dong=tmpl["loai_hanh_dong"],
            trang_thai=trang_thai,
            ket_qua=ket_qua,
            hoan_thanh_luc=hoan_thanh_luc,
        ))
    return buocs


# ── Nhắc hẹn ──────────────────────────────────────────────────────────────────
# 5 cases: upcoming email / upcoming ics / đã gửi / nhiều người nhận / liên quan văn bản

REMINDER_CASES = [
    # Case 1 — nhắc hẹn trả hồ sơ, kênh email, sắp đến
    {
        "id": uid(),
        "title": "Trả kết quả hồ sơ đăng ký HKD — Nguyễn Văn An",
        "description": (
            "Nhớ liên hệ công dân Nguyễn Văn An (0901234567) để thông báo đến nhận "
            "Giấy chứng nhận đăng ký hộ kinh doanh tại bộ phận một cửa.\n"
            "Hồ sơ: " + ma_ho_so("HKD", 1)
        ),
        "remind_at": now + timedelta(days=2, hours=8),
        "channel": "email",
        "status": "pending",
        "recipients": '["minhhaidhsp@gmail.com"]',
    },
    # Case 2 — họp giao ban tuần, kênh ics (calendar)
    {
        "id": uid(),
        "title": "Họp giao ban tuần — Bộ phận một cửa",
        "description": (
            "Họp định kỳ thứ Hai hằng tuần 7:30. Nội dung: tổng kết hồ sơ tuần trước, "
            "phân công nhiệm vụ, cập nhật quy trình mới."
        ),
        "remind_at": now + timedelta(days=1, hours=7, minutes=30),
        "channel": "ics",
        "status": "pending",
        "recipients": None,
    },
    # Case 3 — hạn nộp báo cáo tháng, đã gửi
    {
        "id": uid(),
        "title": "Hạn nộp báo cáo thống kê tháng " + now.strftime("%m/%Y"),
        "description": (
            "Nộp báo cáo số liệu tiếp nhận và giải quyết thủ tục hành chính "
            "lên Văn phòng UBND trước 17:00 ngày 25 hàng tháng."
        ),
        "remind_at": now - timedelta(days=1),     # đã qua
        "channel": "email",
        "status": "sent",
        "recipients": '["minhhaidhsp@gmail.com", "demo@civicai.vn"]',
    },
    # Case 4 — nhắc kiểm tra hồ sơ quá hạn, nhiều người nhận
    {
        "id": uid(),
        "title": "Kiểm tra hồ sơ quá hạn xử lý",
        "description": (
            "Rà soát toàn bộ hồ sơ đã quá hạn xử lý. Liên hệ các bộ phận liên quan "
            "để đôn đốc, cập nhật tiến độ và thông báo cho công dân nếu cần gia hạn."
        ),
        "remind_at": now + timedelta(hours=3),
        "channel": "email",
        "status": "pending",
        "recipients": '["minhhaidhsp@gmail.com", "demo@civicai.vn"]',
    },
    # Case 5 — nhắc tập huấn nghiệp vụ, tuần sau
    {
        "id": uid(),
        "title": "Tập huấn nghiệp vụ — NĐ30/2020/NĐ-CP",
        "description": (
            "Tập huấn soạn thảo văn bản theo Nghị định 30/2020/NĐ-CP do Sở Nội vụ tổ chức. "
            "Địa điểm: Hội trường UBND Quận 1. Mang theo laptop và tài liệu hướng dẫn."
        ),
        "remind_at": now + timedelta(days=7, hours=8),
        "channel": "ics",
        "status": "pending",
        "recipients": None,
    },
]


# ── Main ───────────────────────────────────────────────────────────────────────

async def seed():
    async with AsyncSessionLocal() as db:
        # Lấy owner
        result = await db.execute(select(User).where(User.email == OWNER_EMAIL))
        owner = result.scalar_one_or_none()
        if not owner:
            print(f"❌  Không tìm thấy user '{OWNER_EMAIL}'. Chạy backend ít nhất 1 lần trước.")
            return

        owner_id = owner.id
        print(f"✅  Owner: {owner.email} ({owner_id})")

        # Xoá seed cũ (idempotent — chỉ xoá record do seed tạo ra)
        existing_ma = [c["ma_ho_so"] for c in HO_SO_CASES]
        existing_hs = await db.execute(
            select(HoSo).where(HoSo.ma_ho_so.in_(existing_ma))
        )
        for hs in existing_hs.scalars().all():
            await db.delete(hs)

        existing_rem = await db.execute(
            select(Reminder).where(
                Reminder.owner_id == owner_id,
                Reminder.title.in_([r["title"] for r in REMINDER_CASES]),
            )
        )
        for rem in existing_rem.scalars().all():
            await db.delete(rem)

        await db.flush()

        # ── 1. Hồ sơ hành chính ──────────────────────────────────────────────
        print("\n📁  Tạo hồ sơ hành chính...")
        for case in HO_SO_CASES:
            hs = HoSo(
                id=case["id"],
                ma_ho_so=case["ma_ho_so"],
                loai_thu_tuc=case["loai_thu_tuc"],
                ten_chu_ho_so=case["ten_chu_ho_so"],
                so_dien_thoai=case.get("so_dien_thoai"),
                dia_chi=case.get("dia_chi"),
                mo_ta=case.get("mo_ta"),
                trang_thai=case["trang_thai"],
                nguon=case.get("nguon"),
                ly_do_bo_sung=case.get("ly_do_bo_sung"),
                han_xu_ly=case.get("han_xu_ly"),
                owner_id=owner_id,
            )
            db.add(hs)

            buocs = _make_buocs(
                case["id"],
                case.get("buoc_hien_tai"),
                case.get("buoc_xong_den", 0),
            )
            for b in buocs:
                db.add(b)

            label = f"[{case['trang_thai'].upper()}]"
            print(f"   {label:<18} {case['ma_ho_so']} — {case['ten_chu_ho_so']}")

        # ── 2. Nhắc hẹn ──────────────────────────────────────────────────────
        print("\n🔔  Tạo nhắc hẹn...")
        for case in REMINDER_CASES:
            rem = Reminder(
                id=case["id"],
                title=case["title"],
                description=case.get("description"),
                remind_at=case["remind_at"],
                channel=case["channel"],
                status=case["status"],
                owner_id=owner_id,
                recipients=case.get("recipients"),
            )
            db.add(rem)
            delta = case["remind_at"] - now
            khi = "đã qua" if delta.total_seconds() < 0 else f"sau {int(abs(delta.total_seconds()) // 3600)}h"
            print(f"   [{case['status'].upper():<7}] [{case['channel'].upper():<5}] {case['title'][:55]} ({khi})")

        await db.commit()

    print("\n✅  Seed hoàn tất!")
    print("\n📝  Ghi chú Speech-to-Text:")
    print("   STT không lưu dữ liệu vào DB — mỗi lần gọi /api/v1/stt/transcribe")
    print("   trả về transcript ngay lập tức (Groq Whisper).")
    print("   Để test: vào Dashboard → Công cụ → Chuyển âm thanh thành văn bản")
    print("   rồi ghi âm hoặc upload file .mp3/.wav/.m4a (tối đa 25MB).")


if __name__ == "__main__":
    import sys, os
    sys.path.insert(0, os.path.dirname(__file__))

    # Load .env
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

    asyncio.run(seed())
