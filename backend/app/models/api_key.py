from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base


class StoredApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True) # Nullable for global keys
    key_value = Column(Text, nullable=False)
    masked_key = Column(String(100), nullable=False)
    label = Column(String(200), nullable=True)

    user = relationship("User")
    status = Column(String(20), nullable=False, default="healthy")
    provider = Column(String(50), nullable=False, default="groq")
    is_enabled = Column(Boolean, default=True, nullable=False)
    last_used_at = Column(DateTime, nullable=True)
    last_error_at = Column(DateTime, nullable=True)
    last_error_message = Column(Text, nullable=True)
    total_requests = Column(Integer, default=0, nullable=False)
    total_errors = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
