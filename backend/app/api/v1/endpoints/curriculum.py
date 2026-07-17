"""FastAPI endpoints for the Curriculum Management System."""
import logging

from fastapi import APIRouter, HTTPException, Query, Depends
from app.core.dependencies import get_current_user
from app.models.user import User

from app.curriculum.registry import curriculum_registry
from app.curriculum.search import search_curriculum, autocomplete
from app.curriculum.schemas import Branch, Subject, SearchResult, CurriculumStats

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/curriculum", tags=["curriculum"])


@router.get("/branches")
async def list_branches():
    """List all engineering branches with summary info."""
    return {"branches": curriculum_registry.get_branches()}


@router.get("/branches/{branch_id}")
async def get_branch(branch_id: str):
    """Get full branch details including all subjects."""
    branch = curriculum_registry.get_branch(branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail=f"Branch '{branch_id}' not found")
    return branch


@router.get("/subjects")
async def list_subjects(branch_id: str | None = Query(None, description="Filter by branch ID")):
    """List all subjects, optionally filtered by branch."""
    return {"subjects": curriculum_registry.get_subjects(branch_id)}


@router.get("/subjects/{subject_id}")
async def get_subject(subject_id: str):
    """Get a single subject by ID."""
    result = curriculum_registry.get_subject_with_branch(subject_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Subject '{subject_id}' not found")
    subject, branch_id, branch_name = result
    return {
        "subject": subject,
        "branch_id": branch_id,
        "branch_name": branch_name,
    }


@router.get("/search")
async def search(
    query: str = Query(..., min_length=1, description="Search query")
):
    """Full-text search across subjects and branches."""
    return search_curriculum(query)


@router.get("/autocomplete")
async def suggestions(
    query: str = Query(..., min_length=1, description="Partial query for autocomplete"),
    limit: int = Query(10, ge=1, le=50)
):
    """Autocomplete suggestions for partial queries."""
    return {"suggestions": autocomplete(query, limit)}


@router.get("/stats")
async def stats():
    """Get curriculum statistics."""
    return curriculum_registry.get_stats()


@router.get("/validate")
async def validate_topic(
    branch_id: str = Query(..., description="Branch ID to validate against"),
    topic: str = Query(..., min_length=1, description="Topic to validate")
):
    """Check if a topic is relevant to any subject in the given branch."""
    return curriculum_registry.validate_topic_by_branch(branch_id, topic)


@router.get("/validate/subject")
async def validate_topic_subject(
    subject_id: str = Query(..., description="Subject ID to validate against"),
    topic: str = Query(..., min_length=1, description="Topic to validate")
):
    """Validate a topic against a specific subject. Returns alternatives from same branch if invalid."""
    return curriculum_registry.validate_topic_by_subject(subject_id, topic)


@router.post("/reload")
async def reload_curriculum(current_user: User = Depends(get_current_user)):
    """Reload all curriculum data from disk (admin)."""
    curriculum_registry.reload()
    stats = curriculum_registry.get_stats()
    return {
        "status": "reloaded",
        "branches": stats.total_branches,
        "subjects": stats.total_subjects,
    }
