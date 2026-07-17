from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class BookmarkBase(BaseModel):
    title: str = Field(..., max_length=255)
    url: Optional[str] = None
    content: Optional[str] = None
    subject: Optional[str] = None
    tags: Optional[str] = None
    is_favorite: bool = False


class BookmarkCreate(BookmarkBase):
    pass


class BookmarkUpdate(BaseModel):
    title: Optional[str] = None
    url: Optional[str] = None
    content: Optional[str] = None
    subject: Optional[str] = None
    tags: Optional[str] = None
    is_favorite: Optional[bool] = None


class BookmarkResponse(BookmarkBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BookmarkListResponse(BaseModel):
    items: list[BookmarkResponse]
    total: int
