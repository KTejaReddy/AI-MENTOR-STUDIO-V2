from sqlalchemy.orm import Session
from app.models.note import Note
from app.schemas.note import NoteCreate, NoteUpdate, NoteResponse
from app.repositories.note import NoteRepository
from app.services.base import BaseService


class NoteService(BaseService[Note, NoteCreate, NoteUpdate, NoteResponse]):
    def __init__(self, db: Session, user_id: str | None = None):
        super().__init__(NoteRepository(db, user_id=user_id), NoteResponse)
