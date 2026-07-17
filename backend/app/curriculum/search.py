"""Curriculum search engine with fuzzy matching and autocomplete."""
from typing import List

from app.curriculum.registry import curriculum_registry
from app.curriculum.schemas import SearchResult, SubjectSummary, BranchSummary


def search_curriculum(query: str) -> SearchResult:
    """Full-text search across all subjects and branches.

    Matching criteria (case-insensitive):
    - Subject name contains query
    - Subject tags contain query
    - Branch name contains query
    - Subject ID contains query
    """
    q = query.lower().strip()
    registry = curriculum_registry
    registry.initialize()

    matched_subjects: List[SubjectSummary] = []
    matched_branches: List[BranchSummary] = []

    for branch_summary in registry.get_branches():
        if q in branch_summary.name.lower() or q in branch_summary.branch_id.lower():
            matched_branches.append(branch_summary)

    for subject in registry.get_subjects():
        if (q in subject.name.lower()
                or q in subject.id.lower()
                or any(q in tag.lower() for tag in subject.tags)
                or (subject.code and q in subject.code.lower())):
            matched_subjects.append(subject)

    return SearchResult(
        query=query,
        total=len(matched_subjects) + len(matched_branches),
        subjects=matched_subjects,
        branches=matched_branches,
    )


def autocomplete(query: str, limit: int = 10) -> List[dict]:
    """Return autocomplete suggestions for partial queries."""
    q = query.lower().strip()
    registry = curriculum_registry
    registry.initialize()

    suggestions = []
    seen = set()

    for subject in registry.get_subjects():
        if len(suggestions) >= limit:
            break
        if q in subject.name.lower() and subject.name not in seen:
            seen.add(subject.name)
            suggestions.append({
                "type": "subject",
                "label": subject.name,
                "value": subject.id,
                "branch": subject.branch_name,
            })

    if len(suggestions) < limit:
        for branch in registry.get_branches():
            if len(suggestions) >= limit:
                break
            if q in branch.name.lower() and branch.name not in seen:
                seen.add(branch.name)
                suggestions.append({
                    "type": "branch",
                    "label": branch.name,
                    "value": branch.branch_id,
                })

    if len(suggestions) < limit:
        for subject in registry.get_subjects():
            if len(suggestions) >= limit:
                break
            for tag in subject.tags:
                if q in tag.lower() and tag not in seen:
                    seen.add(tag)
                    suggestions.append({
                        "type": "tag",
                        "label": tag,
                        "value": tag,
                    })
                    break

    return suggestions
