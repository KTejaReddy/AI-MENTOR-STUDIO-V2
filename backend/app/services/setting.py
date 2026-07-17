from typing import Optional
from sqlalchemy.orm import Session
from app.models.setting import Setting
from app.schemas.setting import SettingCreate, SettingUpdate, SettingResponse
from app.repositories.setting import SettingRepository
from app.services.base import BaseService


class SettingService(BaseService[Setting, SettingCreate, SettingUpdate, SettingResponse]):
    def __init__(self, db: Session, user_id: str | None = None):
        super().__init__(SettingRepository(db, user_id=user_id), SettingResponse)

    def get_by_key(self, key: str) -> Optional[SettingResponse]:
        instance = self.repository.get_by_key(key)
        if not instance:
            return None
        return self.response_schema.model_validate(instance)
