from sqlalchemy.orm import Session
from app.models.history import HistoryEntry
from app.repositories.base import BaseRepository


class HistoryRepository(BaseRepository[HistoryEntry]):
    def __init__(self, db: Session, user_id: str | None = None):
        super().__init__(HistoryEntry, db, user_id=user_id)
