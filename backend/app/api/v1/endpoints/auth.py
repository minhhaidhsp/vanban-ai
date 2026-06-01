import logging
import traceback

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token

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
    try:
        db.add(user)
        await db.flush()
        await db.refresh(user)
    except Exception as e:
        traceback.print_exc()
        logger.error("[auth] DB error saving user: %s", e)
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return user
