from sqlalchemy.orm import Session
from app.models.bookmark import Bookmark
from app.schemas.bookmark import BookmarkCreate, BookmarkUpdate, BookmarkResponse
from app.repositories.bookmark import BookmarkRepository
from app.services.base import BaseService


class BookmarkService(BaseService[Bookmark, BookmarkCreate, BookmarkUpdate, BookmarkResponse]):
    def __init__(self, db: Session, user_id: str | None = None):
        super().__init__(BookmarkRepository(db, user_id=user_id), BookmarkResponse)
