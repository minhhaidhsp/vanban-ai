import logging
import traceback
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import get_settings
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.schemas.user import (
    UserCreate, UserResponse, Token,
    ForgotPasswordRequest, ResetPasswordRequest, ForgotPasswordResponse,
)
from app.services.email_service import create_reset_token, send_reset_email

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await db.execute(select(User).where(User.email == form_data.username))
        user = result.scalar_one_or_none()
    except Exception as e:
        traceback.print_exc()
        logger.error("[auth] DB error during login: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=user.id)
    return Token(access_token=access_token)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(select(User).where(User.email == user_in.email))
        existing = result.scalar_one_or_none()
    except Exception as e:
        traceback.print_exc()
        logger.error("[auth] DB error during register: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
    )

    # Tự động set admin nếu email khớp config
    settings = get_settings()
    if settings.admin_email and user_in.email.lower() == settings.admin_email.lower():
        user.role = "admin"
        user.is_superuser = True

    try:
        db.add(user)
        await db.flush()
        await db.refresh(user)
    except Exception as e:
        traceback.print_exc()
        logger.error("[auth] DB error saving user: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return user


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user:
        return ForgotPasswordResponse(message="Nếu email tồn tại, bạn sẽ nhận được hướng dẫn.")

    token = await create_reset_token(user.id, db)

    frontend_url = settings.allowed_origins[0] if settings.allowed_origins else "http://localhost:3000"
    sent = await send_reset_email(user.email, token, frontend_url)

    if sent:
        return ForgotPasswordResponse(message="Email đặt lại mật khẩu đã được gửi.")
    else:
        return ForgotPasswordResponse(
            message="[DEV] SendGrid chưa config. Dùng dev_token bên dưới để test.",
            dev_token=token,
        )


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    from app.core.security import get_password_hash

    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == body.token,
            PasswordResetToken.used == False,  # noqa: E712
        )
    )
    reset_token = result.scalar_one_or_none()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Token không hợp lệ hoặc đã được sử dụng.")

    if reset_token.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token đã hết hạn. Vui lòng yêu cầu lại.")

    user_result = await db.execute(select(User).where(User.id == reset_token.user_id))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại.")

    user.hashed_password = get_password_hash(body.new_password)
    reset_token.used = True
    await db.flush()

    return {"message": "Mật khẩu đã được đặt lại thành công."}
