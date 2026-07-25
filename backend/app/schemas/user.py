from pydantic import BaseModel, EmailStr, Field
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = None


class UserResponse(UserBase):
    id: str
    is_active: bool
    is_superuser: bool
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUpdateUser(BaseModel):
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None


class AdminCreateUser(BaseModel):
    email: EmailStr
    full_name: str
    role: str = "staff"
    password: str | None = Field(default=None, min_length=8)
    send_email: bool = True


class AdminCreateUserResponse(BaseModel):
    user: UserResponse
    plain_password: str
    email_sent: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class ForgotPasswordResponse(BaseModel):
    message: str
    dev_token: str | None = None
