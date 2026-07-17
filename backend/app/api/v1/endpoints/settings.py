from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession
from app.db.session import get_db
from app.schemas.setting import SettingCreate, SettingUpdate, SettingResponse
from app.services.setting import SettingService

from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


def get_service(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> SettingService:
    return SettingService(db, user_id=current_user.id)


@router.get("", response_model=list[SettingResponse])
def list_settings(service: SettingService = Depends(get_service)):
    items, _ = service.get_all(limit=200)
    return items


@router.get("/{key}", response_model=SettingResponse)
def get_setting(key: str, service: SettingService = Depends(get_service)):
    setting = service.get_by_key(key)
    if not setting:
        from app.exceptions import NotFoundException
        raise NotFoundException("Setting", key)
    return setting


@router.put("/{key}", response_model=SettingResponse)
def upsert_setting(
    key: str,
    data: SettingUpdate,
    service: SettingService = Depends(get_service),
):
    existing = service.get_by_key(key)
    if existing:
        return service.update(existing.id, data)
    return service.create(SettingCreate(key=key, **data.model_dump()))
