from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class EntryType(str, enum.Enum):
    QUESTION = "question"
    EXPLANATION = "explanation"
    CODE = "code"
    CONCEPT = "concept"


class HistoryEntry(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False, index=True)
    content = Column(Text, nullable=False)
    entry_type = Column(SAEnum(EntryType), nullable=False, default=EntryType.QUESTION)
    subject = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="history_entries")
