from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.history import EntryType


class HistoryEntryBase(BaseModel):
    title: str = Field(..., max_length=255)
    content: str
    entry_type: EntryType = EntryType.QUESTION
    subject: Optional[str] = None


class HistoryEntryCreate(HistoryEntryBase):
    pass


class HistoryEntryUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    entry_type: Optional[EntryType] = None
    subject: Optional[str] = None


class HistoryEntryResponse(HistoryEntryBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HistoryListResponse(BaseModel):
    items: list[HistoryEntryResponse]
    total: int
