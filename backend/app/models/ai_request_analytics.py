from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float
from app.db.base import Base

class AiRequestAnalytics(Base):
    __tablename__ = "ai_requests"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lesson_id = Column(String(50), nullable=True, index=True)
    section_name = Column(String(100), nullable=True)
    subject = Column(String(100), nullable=True, index=True)
    topic = Column(String(200), nullable=True)
    learning_mode = Column(String(50), nullable=True)
    model_used = Column(String(100), nullable=True, index=True)
    api_key_identifier = Column(String(100), nullable=True)
    provider = Column(String(50), nullable=True)
    request_timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    latency_ms = Column(Float, nullable=False)
    prompt_tokens = Column(Integer, default=0, nullable=False)
    completion_tokens = Column(Integer, default=0, nullable=False)
    total_tokens = Column(Integer, default=0, nullable=False)
    stream_chunks = Column(Integer, default=0, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    fallback_used = Column(Boolean, default=False, nullable=False)
    success = Column(Boolean, default=True, nullable=False)
    error_message = Column(Text, nullable=True)
    quality_score = Column(Float, nullable=True)
    response_characters = Column(Integer, default=0, nullable=False)
    response_words = Column(Integer, default=0, nullable=False)
    response_lines = Column(Integer, default=0, nullable=False)
