from sqlalchemy.orm import Session
from app.models.bookmark import Bookmark
from app.repositories.base import BaseRepository


class BookmarkRepository(BaseRepository[Bookmark]):
    def __init__(self, db: Session, user_id: str | None = None):
        super().__init__(Bookmark, db, user_id=user_id)
