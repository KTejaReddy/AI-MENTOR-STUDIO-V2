from sqlalchemy.orm import Session
from app.models.history import HistoryEntry
from app.schemas.history import HistoryEntryCreate, HistoryEntryUpdate, HistoryEntryResponse
from app.repositories.history import HistoryRepository
from app.services.base import BaseService


class HistoryService(BaseService[HistoryEntry, HistoryEntryCreate, HistoryEntryUpdate, HistoryEntryResponse]):
    def __init__(self, db: Session, user_id: str | None = None):
        super().__init__(HistoryRepository(db, user_id=user_id), HistoryEntryResponse)
