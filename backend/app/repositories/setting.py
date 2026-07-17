from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.setting import Setting
from app.repositories.base import BaseRepository


class SettingRepository(BaseRepository[Setting]):
    def __init__(self, db: Session, user_id: str | None = None):
        super().__init__(Setting, db, user_id=user_id)

    def get_by_key(self, key: str) -> Optional[Setting]:
        stmt = select(Setting).where(Setting.key == key)
        stmt = self._apply_user_filter(stmt)
        return self.db.scalar(stmt)
