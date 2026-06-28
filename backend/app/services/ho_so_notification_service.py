"""
Ho-so notification service.

Public API: fire-and-forget wrappers designed for asyncio.create_task().
Each wrapper creates its own DB session to avoid request-session lifecycle issues.
"""
import logging
import uuid
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import get_settings, Settings

logger = logging.getLogger(__name__)


class LoaiNotification(str, Enum):
    TAO_MOI = "tao_moi"
    BUOC_HOAN_THANH = "buoc_hoan_thanh"
    CHO_BO_SUNG = "cho_bo_sung"
    HOAN_THANH = "hoan_thanh"


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _create_notification(
    db: AsyncSession,
    ho_so_id: str,
    loai: LoaiNotification,
    tieu_de: str,
    noi_dung: str,
    nguoi_nhan_id: str,
    gui_email: bool = False,
    to_email: str | None = None,
    settings: Settings | None = None,
) -> None:
    from app.models.ho_so_notification import HoSoNotification

    notif = HoSoNotification(
        id=str(uuid.uuid4()),
        ho_so_id=ho_so_id,
        loai=loai,
        tieu_de=tieu_de,
        noi_dung=noi_dung,
        nguoi_nhan_id=nguoi_nhan_id,
        da_doc=False,
        kenh="both" if gui_email else "in_app",
    )
    db.add(notif)
    await db.flush()

    if gui_email and to_email and settings:
        from app.services.email_service import send_ho_so_email
        await send_ho_so_email(to_email, tieu_de, f"<p>{noi_dung}</p>", settings)


async def _get_user_email(db: AsyncSession, user_id: str) -> str | None:
    from app.models.user import User
    result = await db.execute(select(User.email).where(User.id == user_id))
    return result.scalar_one_or_none()


async def _run_bg(coro_fn, *args) -> None:
    """Chạy một coroutine trong DB session riêng — dùng bởi asyncio.create_task()."""
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        try:
            await coro_fn(db, *args)
            await db.commit()
        except Exception as exc:
            logger.error("[notify] background error in %s: %s", coro_fn.__name__, exc)


# ── Per-event implementations ─────────────────────────────────────────────────

async def _impl_tao_moi(db: AsyncSession, ho_so_id: str, owner_id: str, settings: Settings) -> None:
    from app.models.ho_so import HoSo
    hs = (await db.execute(select(HoSo).where(HoSo.id == ho_so_id))).scalar_one_or_none()
    if not hs:
        return
    tieu_de = f"Hồ sơ mới — {hs.ma_ho_so}"
    noi_dung = (
        f"Hồ sơ {hs.ma_ho_so} ({hs.loai_thu_tuc}) của {hs.ten_chu_ho_so} "
        "đã được tạo thành công."
    )
    email = await _get_user_email(db, owner_id) if settings.sendgrid_api_key else None
    await _create_notification(
        db, ho_so_id, LoaiNotification.TAO_MOI, tieu_de, noi_dung, owner_id,
        gui_email=bool(email), to_email=email, settings=settings,
    )


async def _impl_buoc_hoan_thanh(
    db: AsyncSession, ho_so_id: str, thu_tu: int, ten_buoc: str, settings: Settings,
) -> None:
    from app.models.ho_so import HoSo
    hs = (await db.execute(select(HoSo).where(HoSo.id == ho_so_id))).scalar_one_or_none()
    if not hs:
        return
    tieu_de = f"Bước {thu_tu} hoàn thành — {hs.ma_ho_so}"
    noi_dung = f"Hồ sơ {hs.ma_ho_so}: Bước {thu_tu} ({ten_buoc}) đã được hoàn thành."
    await _create_notification(
        db, ho_so_id, LoaiNotification.BUOC_HOAN_THANH, tieu_de, noi_dung, hs.owner_id,
    )


async def _impl_cho_bo_sung(
    db: AsyncSession, ho_so_id: str, ly_do: str, settings: Settings,
) -> None:
    from app.models.ho_so import HoSo
    hs = (await db.execute(select(HoSo).where(HoSo.id == ho_so_id))).scalar_one_or_none()
    if not hs:
        return
    tieu_de = f"Hồ sơ {hs.ma_ho_so} cần bổ sung"
    noi_dung = f"Hồ sơ {hs.ma_ho_so} của {hs.ten_chu_ho_so} cần bổ sung: {ly_do}"
    email = await _get_user_email(db, hs.owner_id) if settings.sendgrid_api_key else None
    await _create_notification(
        db, ho_so_id, LoaiNotification.CHO_BO_SUNG, tieu_de, noi_dung, hs.owner_id,
        gui_email=bool(email), to_email=email, settings=settings,
    )


async def _impl_hoan_thanh(db: AsyncSession, ho_so_id: str, settings: Settings) -> None:
    from app.models.ho_so import HoSo
    hs = (await db.execute(select(HoSo).where(HoSo.id == ho_so_id))).scalar_one_or_none()
    if not hs:
        return
    tieu_de = f"Hồ sơ {hs.ma_ho_so} đã hoàn thành"
    noi_dung = (
        f"Hồ sơ {hs.ma_ho_so} ({hs.loai_thu_tuc}) của {hs.ten_chu_ho_so} "
        "đã hoàn thành xử lý."
    )
    email = await _get_user_email(db, hs.owner_id) if settings.sendgrid_api_key else None
    await _create_notification(
        db, ho_so_id, LoaiNotification.HOAN_THANH, tieu_de, noi_dung, hs.owner_id,
        gui_email=bool(email), to_email=email, settings=settings,
    )


# ── Public fire-and-forget API ────────────────────────────────────────────────

async def notify_tao_moi(ho_so_id: str, owner_id: str, settings: Settings | None = None) -> None:
    await _run_bg(_impl_tao_moi, ho_so_id, owner_id, settings or get_settings())


async def notify_buoc_hoan_thanh(
    ho_so_id: str, thu_tu: int, ten_buoc: str, settings: Settings | None = None,
) -> None:
    await _run_bg(_impl_buoc_hoan_thanh, ho_so_id, thu_tu, ten_buoc, settings or get_settings())


async def notify_cho_bo_sung(ho_so_id: str, ly_do: str, settings: Settings | None = None) -> None:
    await _run_bg(_impl_cho_bo_sung, ho_so_id, ly_do, settings or get_settings())


async def notify_hoan_thanh(ho_so_id: str, settings: Settings | None = None) -> None:
    await _run_bg(_impl_hoan_thanh, ho_so_id, settings or get_settings())
