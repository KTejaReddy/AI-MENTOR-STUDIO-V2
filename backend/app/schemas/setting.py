from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SettingBase(BaseModel):
    key: str = Field(..., max_length=100)
    value: Optional[str] = None
    category: Optional[str] = "general"


class SettingCreate(SettingBase):
    pass


class SettingUpdate(BaseModel):
    value: Optional[str] = None
    category: Optional[str] = None


class SettingResponse(SettingBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
