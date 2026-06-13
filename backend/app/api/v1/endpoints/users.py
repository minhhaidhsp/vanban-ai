from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse
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
