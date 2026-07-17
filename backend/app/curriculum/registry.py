"""Curriculum Registry — centralized access to all branches and subjects."""

from typing import Dict, List, Optional

from app.curriculum.schemas import Branch, Subject, BranchSummary, SubjectSummary, CurriculumStats
from app.curriculum.loader import load_all_branches, get_subject_index
from app.curriculum.validator import validate_curriculum


class CurriculumRegistry:
    """Thread-safe registry that loads all curriculum data on init."""

    def __init__(self):
        self._branches: Dict[str, Branch] = {}
        self._subject_index: Dict[str, tuple[str, str, Subject]] = {}
        self._validation_errors: List[str] = []
        self._initialized = False

    def initialize(self) -> None:
        if self._initialized:
            return
        self._branches = load_all_branches()
        self._subject_index = get_subject_index(self._branches)
        self._validation_errors = validate_curriculum(self._branches, self._subject_index)
        if self._validation_errors:
            import logging
            logger = logging.getLogger(__name__)
            for err in self._validation_errors:
                logger.warning("Curriculum validation: %s", err)
        self._initialized = True

    def get_branches(self) -> List[BranchSummary]:
        self.initialize()
        return [
            BranchSummary(
                branch_id=b.branch_id,
                name=b.name,
                description=b.description,
                category=b.category,
                subject_count=len(b.subjects),
                lab_count=sum(1 for s in b.subjects if s.has_lab),
            )
            for b in self._branches.values()
        ]

    def get_branch(self, branch_id: str) -> Branch | None:
        self.initialize()
        return self._branches.get(branch_id)

    def get_subjects(self, branch_id: str | None = None) -> List[SubjectSummary]:
        self.initialize()
        results = []
        for bid, branch in self._branches.items():
            if branch_id and bid != branch_id:
                continue
            for s in branch.subjects:
                results.append(SubjectSummary(
                    id=s.id,
                    name=s.name,
                    code=s.code,
                    branch_id=bid,
                    branch_name=branch.name,
                    category=s.category,
                    semester=s.semester,
                    difficulty=s.difficulty,
                    tags=s.tags,
                ))
        return results

    def get_subject(self, subject_id: str) -> Subject | None:
        self.initialize()
        result = self._subject_index.get(subject_id)
        return result[2] if result else None

    def get_subject_with_branch(self, subject_id: str) -> tuple[Subject, str, str] | None:
        self.initialize()
        result = self._subject_index.get(subject_id)
        if result:
            return (result[2], result[0], result[1])
        return None

    def get_stats(self) -> CurriculumStats:
        self.initialize()
        total_labs = sum(1 for s_ref in self._subject_index.values() if s_ref[2].has_lab)
        return CurriculumStats(
            total_branches=len(self._branches),
            total_subjects=len(self._subject_index),
            total_labs=total_labs,
            branches=self.get_branches(),
        )

    def get_validation_errors(self) -> List[str]:
        self.initialize()
        return self._validation_errors

    def validate_topic(self, subject_id: str, topic: str) -> dict:
        """Check if a topic is relevant to the given subject.

        Uses LLM-assisted analysis via the topic analyzer. Accepts all topics
        that are reasonably related to the subject; rejects only obviously
        unrelated topics. The user's branch->subject->topic selection is trusted.
        """
        self.initialize()
        subject = self.get_subject(subject_id)
        if not subject:
            return {"valid": False, "reason": f"Subject '{subject_id}' not found"}
        from app.ai.topic_analyzer import topic_analyzer
        analysis = topic_analyzer.analyze(subject.name, topic)
        is_related = analysis.confidence >= 0.3
        return {
            "valid": is_related,
            "confidence": round(analysis.confidence, 2),
            "category": analysis.category,
            "subject_name": subject.name,
            "subject_id": subject.id,
        }

    def validate_topic_by_subject(self, subject_id: str, topic: str) -> dict:
        """Validate a topic against a specific subject.

        Uses AI-assisted analysis (via topic_analyzer) to determine relevance.
        Returns the subject info and confidence. Only marks invalid for clearly
        unrelated topics (confidence < 0.3).
        """
        self.initialize()
        subject = self.get_subject(subject_id)
        if not subject:
            return {"valid": False, "reason": f"Subject '{subject_id}' not found"}
        return self.validate_topic(subject_id, topic)

    def validate_topic_by_branch(self, branch_id: str, topic: str) -> dict:
        """Check if a topic is relevant to any subject in the given branch."""
        self.initialize()
        branch = self._branches.get(branch_id)
        if not branch:
            return {"valid": False, "reason": f"Branch '{branch_id}' not found"}
        topic_lower = topic.lower()
        topic_words = {w for w in topic_lower.replace("-", " ").split() if len(w) >= 3}
        best_score = 0
        best_subject = None
        for subject in branch.subjects:
            subject_name_lower = subject.name.lower()
            tag_names = [t.lower() for t in (subject.tags or [])]
            desc_lower = (subject.description or "").lower()
            keywords = [subject_name_lower, *tag_names, *subject_name_lower.split()]
            score = 0
            for kw in keywords:
                if len(kw) < 3:
                    continue
                if kw in topic_lower or topic_lower in kw:
                    score += 2
                kw_stem = kw[:-1] if kw.endswith("s") and len(kw) > 4 else kw
                for tw in topic_words:
                    tw_stem = tw[:-1] if tw.endswith("s") and len(tw) > 4 else tw
                    if kw in tw or tw in kw or kw_stem in tw or tw_stem in kw:
                        score += 1
            for tw in topic_words:
                tw_stem = tw[:-1] if tw.endswith("s") and len(tw) > 4 else tw
                if tw in desc_lower or desc_lower in tw or tw_stem in desc_lower or desc_lower in tw_stem:
                    score += 1
                    break
            for tw in topic_words:
                if tw in subject_name_lower or subject_name_lower in tw:
                    score += 2
            if score > best_score:
                best_score = score
                best_subject = {"id": subject.id, "name": subject.name}
        valid = best_score >= 1
        result = {
            "valid": valid,
            "score": min(best_score, 5),
            "branch_name": branch.name,
            "matched_subject": best_subject,
        }
        if not valid:
            from app.curriculum.search import search_curriculum
            results = search_curriculum(topic)
            alternatives = []
            seen_ids = set()
            for s in results.subjects:
                if s.id not in seen_ids:
                    seen_ids.add(s.id)
                    alt_branch = self._branches.get(s.branch_id)
                    if alt_branch and alt_branch.name != branch.name:
                        alternatives.append({"id": s.id, "name": s.name, "branch": alt_branch.name})
            result["reason"] = f"Topic may not belong to '{branch.name}'"
            result["alternatives"] = alternatives[:5]
        return result

    def reload(self) -> None:
        self._initialized = False
        self._branches = {}
        self._subject_index = {}
        self._validation_errors = []
        self.initialize()


curriculum_registry = CurriculumRegistry()
