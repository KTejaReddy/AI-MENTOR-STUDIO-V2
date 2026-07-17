from sqlalchemy.orm import Session
from app.models.note import Note
from app.repositories.base import BaseRepository


class NoteRepository(BaseRepository[Note]):
    def __init__(self, db: Session, user_id: str | None = None):
        super().__init__(Note, db, user_id=user_id)
