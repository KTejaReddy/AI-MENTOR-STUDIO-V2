from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class GenerateLessonRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200)
    topic: str = Field(..., min_length=1, max_length=500)
    difficulty: str = Field(default="intermediate", pattern="^(beginner|intermediate|advanced|expert)$")
    learning_mode: str = Field(default="default", pattern="^(default|quick|deep|interview|project|coding|exam|research|quick_revision)$")
    output_language: str = Field(default="english", max_length=50)
    context: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    history: Optional[List[Dict[str, str]]] = None
    context: Optional[str] = None


class ModelInfo(BaseModel):
    id: str
    provider: str
    category: str


class ModelsResponse(BaseModel):
    models: List[ModelInfo]


class CacheStats(BaseModel):
    size: int
    max_entries: int
    ttl_seconds: int


class HealthResponse(BaseModel):
    status: str
    providers: List[Dict[str, Any]]
    keys: Dict[str, Any]
    cache: CacheStats


class AiStats(BaseModel):
    total_requests: int
    repaired_count: int
    failed_count: int
    cache_size: int


class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None


class TopicSuggestion(BaseModel):
    subject: str
    subject_id: str
    topic: str


class TopicSuggestionsResponse(BaseModel):
    suggestions: List[TopicSuggestion]


class SubjectInfoSchema(BaseModel):
    id: str
    name: str
    category: str
    description: str
    topics: List[str]


class SubjectsResponse(BaseModel):
    subjects: List[SubjectInfoSchema]


class AnalyzeTopicRequest(BaseModel):
    subject: str = Field(..., min_length=1)
    topic: str = Field(..., min_length=1)


class AnalyzeTopicResponse(BaseModel):
    category: str
    confidence: float
    needs_code: bool
    needs_diagram: bool
    needs_formula: bool
    needs_quiz: bool
    needs_complexity: bool
    needs_projects: bool
    needs_case_study: bool
    sections_planned: List[str]
