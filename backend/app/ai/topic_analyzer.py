from dataclasses import dataclass
from typing import List, Optional

from app.curriculum.registry import curriculum_registry


@dataclass
class TopicAnalysis:
    category: str
    needs_code: bool = False
    needs_diagram: bool = False
    needs_formula: bool = False
    needs_quiz: bool = True
    needs_complexity: bool = False
    needs_visualizer: bool = False
    needs_case_study: bool = True
    needs_projects: bool = False
    needs_analogy: bool = True
    needs_examples: bool = True
    needs_interview_questions: bool = True
    confidence: float = 1.0


FALLBACK_KEYWORDS = {
    "programming": [
        "function", "variable", "class", "object", "method", "interface",
        "inheritance", "polymorphism", "encapsulation", "abstraction",
        "programming", "coding", "syntax", "oop", "async", "await",
    ],
    "algorithm": [
        "sort", "search", "traversal", "tree", "graph", "complexity",
        "algorithm", "big o", "dynamic programming", "greedy",
        "divide and conquer", "backtracking", "avl", "heap",
    ],
    "database": [
        "sql", "query", "table", "index", "join", "schema",
        "database", "nosql", "transaction", "normalization",
    ],
    "networking": [
        "protocol", "tcp", "ip", "http", "dns", "routing",
        "network", "socket", "osi",
    ],
    "general": [],
}


class TopicAnalyzer:
    def analyze(self, subject: str, topic: str) -> TopicAnalysis:
        combined = f"{subject} {topic}".lower()
        curriculum_subject = self._find_curriculum_subject(subject, topic)
        if curriculum_subject:
            return self._analyze_with_curriculum(curriculum_subject, combined)
        return self._analyze_fallback(combined)

    def _find_curriculum_subject(self, subject: str, topic: str) -> Optional[object]:
        curriculum_registry.initialize()
        subjects = curriculum_registry.get_subjects()
        subject_lower = subject.lower().strip()

        for s in subjects:
            if s.name.lower() == subject_lower:
                return curriculum_registry.get_subject(s.id)

        for s in subjects:
            if subject_lower in s.name.lower() or subject_lower in s.id.lower():
                return curriculum_registry.get_subject(s.id)

        topic_lower = topic.lower()
        best, best_score = None, 0
        for s in subjects:
            full = curriculum_registry.get_subject(s.id)
            if full and full.tags:
                score = sum(1 for tag in full.tags if tag.lower() in topic_lower)
                if score > best_score:
                    best_score, best = score, full
        return best

    def _analyze_with_curriculum(self, subject: object, combined: str) -> TopicAnalysis:
        category = subject.id
        if "-" in category:
            parts = category.split("-", 1)
            if len(parts) > 1:
                category = parts[1]

        tags = [t.lower() for t in subject.tags] if subject.tags else []
        confidence = 0.5
        if tags:
            match_count = sum(1 for tag in tags if tag in combined)
            confidence = min(1.0, 0.5 + (match_count / len(tags)) * 0.5)

        return TopicAnalysis(
            category=category,
            needs_code=getattr(subject, 'supports_code', False),
            needs_diagram=getattr(subject, 'supports_diagram', True),
            needs_formula=getattr(subject, 'supports_formula', False),
            needs_quiz=getattr(subject, 'supports_quiz', True),
            needs_complexity=True,
            needs_visualizer=getattr(subject, 'supports_visualizer', False),
            needs_case_study=True,
            needs_projects=getattr(subject, 'supports_projects', False),
            needs_examples=True,
            needs_interview_questions=getattr(subject, 'supports_interview', True),
            confidence=confidence,
        )

    def _analyze_fallback(self, combined: str) -> TopicAnalysis:
        found = []
        for cat, keywords in FALLBACK_KEYWORDS.items():
            if not keywords:
                continue
            score = sum(1 for kw in keywords if kw in combined)
            if score > 0:
                found.append((cat, score))
        if not found:
            found.append(("general", 1))
        found.sort(key=lambda x: x[1], reverse=True)
        best = found[0][0]
        total = sum(s for _, s in found)
        confidence = min(1.0, found[0][1] / max(1, total))
        return TopicAnalysis(
            category=best,
            needs_code=best in ("programming", "database"),
            needs_diagram=True,
            needs_formula=best == "algorithm",
            needs_quiz=True,
            needs_complexity=best == "algorithm",
            needs_visualizer=best == "algorithm",
            needs_case_study=True,
            needs_projects=best in ("programming", "database"),
            needs_examples=True,
            needs_interview_questions=True,
            confidence=confidence,
        )


topic_analyzer = TopicAnalyzer()
