from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class NoteBase(BaseModel):
    title: str = Field(..., max_length=255)
    content: str
    subject: Optional[str] = None
    is_pinned: bool = False
    color: Optional[str] = "#1e293b"


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    subject: Optional[str] = None
    is_pinned: Optional[bool] = None
    color: Optional[str] = None


class NoteResponse(NoteBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NoteListResponse(BaseModel):
    items: list[NoteResponse]
    total: int
