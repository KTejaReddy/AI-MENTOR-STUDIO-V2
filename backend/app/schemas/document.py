from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class DocumentAnalyzeRequest(BaseModel):
    document_id: str = Field(..., description="ID of the uploaded document to analyze")

class DocumentGenerateRequest(BaseModel):
    chapter_id: str = Field(..., description="The chapter title to generate a lesson for")
    difficulty: str = Field(default="intermediate")

class DocumentExplainRequest(BaseModel):
    selection: str = Field(..., description="The text selection to explain", min_length=1)
    chapter_id: Optional[str] = Field(default=None, description="The chapter this selection belongs to")

class DocumentChatRequest(BaseModel):
    query: str = Field(..., description="The user's question", min_length=1)
    context: Optional[str] = Field(default=None, description="Optional specific context block")

class DocumentSummaryRequest(BaseModel):
    chapter_id: Optional[str] = Field(default=None, description="Optional chapter title to summarize, otherwise summarizes the whole document")

class DocumentActionResponse(BaseModel):
    result: str = Field(..., description="The AI generated response text")

class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    pages: int
    status: str

