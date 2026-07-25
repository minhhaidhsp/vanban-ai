import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from app.api.deps import get_current_user, get_admin_user
from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, AdminUpdateUser, AdminCreateUser, AdminCreateUserResponse
from app.core.security import verify_password, get_password_hash

router = APIRouter()


class UpdateProfileRequest(BaseModel):
    full_name: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    body: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.full_name = body.full_name
    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/me/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(body.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=400,
            detail="Mật khẩu hiện tại không đúng",
        )
    current_user.hashed_password = get_password_hash(body.new_password)
    await db.commit()


_ROLE_LABEL = {"admin": "Quản trị viên", "leader": "Lãnh đạo", "staff": "Cán bộ"}
_ALPHABET = string.ascii_letters + string.digits + "!@#$%"


def _gen_password(length: int = 12) -> str:
    """Tạo mật khẩu ngẫu nhiên đủ mạnh (chữ hoa, thường, số, ký tự đặc biệt)."""
    while True:
        pwd = "".join(secrets.choice(_ALPHABET) for _ in range(length))
        if (any(c.isupper() for c in pwd)
                and any(c.islower() for c in pwd)
                and any(c.isdigit() for c in pwd)):
            return pwd


@router.post("/", response_model=AdminCreateUserResponse, status_code=201)
async def admin_create_user(
    body: AdminCreateUser,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    if body.role not in ("admin", "leader", "staff"):
        raise HTTPException(400, "Role không hợp lệ")

    existing = (await db.execute(select(User).where(User.email == body.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(400, "Email này đã được đăng ký")

    plain_password = body.password or _gen_password()
    user = User(
        email=body.email,
        full_name=body.full_name,
        hashed_password=get_password_hash(plain_password),
        role=body.role,
        is_superuser=(body.role == "admin"),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    email_sent = False
    if body.send_email:
        settings = get_settings()
        from app.services.email_service import send_welcome_email
        login_url = (settings.allowed_origins[0] if settings.allowed_origins else "http://localhost:3000") + "/login"
        email_sent = await send_welcome_email(
            to_email=body.email,
            full_name=body.full_name,
            plain_password=plain_password,
            role_label=_ROLE_LABEL.get(body.role, body.role),
            settings=settings,
            login_url=login_url,
        )

    return AdminCreateUserResponse(user=user, plain_password=plain_password, email_sent=email_sent)


@router.get("/", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).order_by(User.created_at))
    return result.scalars().all()


@router.patch("/{user_id}", response_model=UserResponse)
async def admin_update_user(
    user_id: str,
    body: AdminUpdateUser,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Không tìm thấy user")
    if body.full_name is not None:
        user.full_name = body.full_name
    if body.role is not None:
        if body.role not in ("admin", "leader", "staff"):
            raise HTTPException(400, "Role không hợp lệ")
        user.role = body.role
    if body.is_active is not None:
        user.is_active = body.is_active
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/{user_id}", status_code=204)
async def admin_delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    if user_id == current_user.id:
        raise HTTPException(400, "Không thể xóa chính mình")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "Không tìm thấy user")
    await db.delete(user)
    await db.commit()
