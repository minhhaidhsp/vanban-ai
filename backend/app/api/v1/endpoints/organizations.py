from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.organization import Organization

router = APIRouter()


class UpdateOrganizationRequest(BaseModel):
    ten_chu_quan: str | None = None
    ten_co_quan: str | None = None
    viet_tat: str | None = None
    dia_danh: str | None = None
    chu_ky_mac_dinh: dict | None = None


@router.get("/current")
async def get_current_organization(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Organization).where(Organization.is_active.is_(True)).limit(1)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="No organization configured")
    return {
        "ten_chu_quan": org.ten_chu_quan,
        "ten_co_quan": org.ten_co_quan,
        "viet_tat": org.viet_tat,
        "dia_danh": org.dia_danh,
        "chu_ky_mac_dinh": org.chu_ky_mac_dinh or {},
    }


@router.put("/current")
async def update_organization(
    body: UpdateOrganizationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Organization).where(Organization.is_active.is_(True)).limit(1)
    )
    org = result.scalar_one_or_none()
    if not org:
        raise HTTPException(status_code=404, detail="No organization configured")

    update_data = body.model_dump(exclude_none=True)
    for field, value in update_data.items():
        setattr(org, field, value)

    await db.commit()
    await db.refresh(org)
    return {
        "ten_chu_quan": org.ten_chu_quan,
        "ten_co_quan": org.ten_co_quan,
        "viet_tat": org.viet_tat,
        "dia_danh": org.dia_danh,
        "chu_ky_mac_dinh": org.chu_ky_mac_dinh or {},
    }
