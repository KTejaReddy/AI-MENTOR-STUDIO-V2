from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class ApiKeyResponse(BaseModel):
    id: int
    masked_key: str
    label: Optional[str] = None
    status: str
    provider: str
    is_enabled: bool
    last_used_at: Optional[datetime] = None
    last_error_at: Optional[datetime] = None
    last_error_message: Optional[str] = None
    total_requests: int
    total_errors: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyListResponse(BaseModel):
    items: List[ApiKeyResponse]
    total: int


class ApiKeyUpdate(BaseModel):
    label: Optional[str] = None
    is_enabled: Optional[bool] = None


class ApiKeyImportRequest(BaseModel):
    keys: str = Field(..., min_length=1, description="One or more API keys, one per line")
    provider: str = Field(default="groq", pattern="^(groq)$")


class ApiKeyImportResult(BaseModel):
    imported: int
    failed: int
    skipped: int
    results: List[dict]


class ApiKeyTestResult(BaseModel):
    key_id: int
    status: str
    message: str
    models_accessible: List[str]
    latency_ms: Optional[float] = None
