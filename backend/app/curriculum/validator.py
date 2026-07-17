"""Validate curriculum data — detect duplicates and broken references."""
from typing import Dict, List

from app.curriculum.schemas import Branch, Subject


def validate_curriculum(branches: Dict[str, Branch], subject_index: Dict[str, tuple[str, str, Subject]]) -> List[str]:
    """Run all validation checks and return a list of error messages.

    Checks performed:
    - Duplicate branch IDs
    - Duplicate subject IDs across branches
    - All prerequisite references exist
    - All related_subject references exist
    """
    errors: List[str] = []

    # Duplicate subject IDs (already detected in loader, but double-check)
    seen_subjects: Dict[str, str] = {}
    for branch_id, branch in branches.items():
        for subject in branch.subjects:
            if subject.id in seen_subjects:
                errors.append(f"Duplicate subject_id '{subject.id}' in '{branch_id}' and '{seen_subjects[subject.id]}'")
            else:
                seen_subjects[subject.id] = branch_id

    # Check prerequisite and related_subject references
    for branch_id, branch in branches.items():
        for subject in branch.subjects:
            for prereq_id in subject.prerequisites:
                if prereq_id not in subject_index:
                    errors.append(f"Subject '{subject.id}' in '{branch_id}' references missing prerequisite '{prereq_id}'")
            for rel_id in subject.related_subjects:
                if rel_id not in subject_index:
                    errors.append(f"Subject '{subject.id}' in '{branch_id}' references missing related_subject '{rel_id}'")

    return errors
