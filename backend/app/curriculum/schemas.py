"""Pydantic schemas for the Curriculum Management System."""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class Subject(BaseModel):
    id: str = Field(description="Unique subject identifier (e.g. cse-data-structures)")
    name: str = Field(description="Subject display name")
    code: Optional[str] = Field(None, description="University subject code, e.g. CS-201")
    category: str = Field(default="core", description="core | elective | lab | humanities | basic-science | engineering-science | project")
    semester: Optional[int] = Field(None, description="Recommended semester (1-8)")
    description: str = Field(default="", description="Subject description")
    difficulty: str = Field(default="intermediate", description="beginner | intermediate | advanced | expert")
    tags: List[str] = Field(default_factory=list)
    prerequisites: List[str] = Field(default_factory=list, description="List of subject IDs required before this")
    related_subjects: List[str] = Field(default_factory=list, description="Related subject IDs")
    learning_outcomes: List[str] = Field(default_factory=list)
    industry_relevance: str = Field(default="")
    career_paths: List[str] = Field(default_factory=list)
    has_lab: bool = False
    supports_code: bool = False
    supports_formula: bool = False
    supports_diagram: bool = False
    supports_visualizer: bool = False
    supports_quiz: bool = False
    supports_projects: bool = False
    supports_interview: bool = False


class Branch(BaseModel):
    branch_id: str = Field(description="Unique branch identifier (e.g. computer-science-engineering)")
    name: str = Field(description="Branch display name")
    description: str = Field(default="")
    category: str = Field(default="engineering", description="engineering | basic-science | humanities | interdisciplinary")
    duration: int = Field(default=4, description="Duration in years")
    semesters: int = Field(default=8, description="Number of semesters")
    subjects: List[Subject] = Field(default_factory=list)


class BranchSummary(BaseModel):
    branch_id: str
    name: str
    description: str
    category: str
    subject_count: int
    lab_count: int


class SubjectSummary(BaseModel):
    id: str
    name: str
    code: Optional[str] = None
    branch_id: str
    branch_name: str
    category: str
    semester: Optional[int] = None
    difficulty: str
    tags: List[str] = Field(default_factory=list)


class SearchResult(BaseModel):
    query: str
    total: int
    subjects: List[SubjectSummary]
    branches: List[BranchSummary]


class CurriculumStats(BaseModel):
    total_branches: int
    total_subjects: int
    total_labs: int
    branches: List[BranchSummary]
