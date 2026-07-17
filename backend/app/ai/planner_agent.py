"""
Planner Agent — Decides generation order and section configuration
based on topic complexity, learning mode, and difficulty.

The planner runs FIRST before any section agent, analyzes the topic,
and returns a structured plan that the orchestrator follows.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

from app.ai.topic_analyzer import topic_analyzer

logger = logging.getLogger(__name__)


# Canonical ordered list of all supported sections
ALL_SECTIONS = [
    "overview",
    "explanation",
    "keyConcepts",
    "importantDefinitions",
    "analogy",
    "examples",
    "caseStudy",
    "codeExamples",
    "formulaExplanation",
    "diagrams",
    "commonMistakes",
    "interviewQuestions",
    "quiz",
    "assignment",
    "miniProject",
    "cheatSheet",
    "revisionNotes",
    "summary",
]

SECTION_TITLES = {
    "overview": "1. Overview",
    "explanation": "2. Detailed Explanation",
    "keyConcepts": "3. Key Concepts",
    "importantDefinitions": "4. Important Definitions",
    "analogy": "5. Real-world Analogy",
    "examples": "6. Worked Examples",
    "caseStudy": "7. Case Study",
    "codeExamples": "8. Code Examples",
    "formulaExplanation": "9. Formula Explanation",
    "diagrams": "10. Diagrams",
    "commonMistakes": "11. Common Mistakes",
    "interviewQuestions": "12. Interview Questions",
    "quiz": "13. Quiz",
    "assignment": "14. Assignment",
    "miniProject": "15. Mini Project",
    "cheatSheet": "16. Cheat Sheet",
    "revisionNotes": "17. Revision Notes",
    "summary": "18. Summary",
}


@dataclass
class LessonPlan:
    """Result of the Planner Agent."""
    sections: List[str]          # Ordered list of section types to generate
    section_titles: Dict[str, str]  # section_type -> display title
    topic_category: str
    complexity: str              # "simple", "moderate", "complex"
    learning_note: str           # Instruction note for all agents
    metadata: Dict[str, Any] = field(default_factory=dict)


class PlannerAgent:
    """
    Analyzes the topic and produces a generation plan.

    Rules:
    - 'explanation' is ALWAYS first and always included
    - Mode-specific sections are boosted to front
    - Irrelevant sections are removed (e.g. 'quiz' for quick_revision)
    - Order is preserved from ALL_SECTIONS canonical order
    """

    # Sections always included regardless of mode
    ALWAYS_INCLUDE = {"explanation"}

    # Mode-specific section adjustments
    MODE_CONFIG: Dict[str, Dict] = {
        "beginner": {
            "include": {"explanation", "analogy", "examples", "commonMistakes", "cheatSheet"},
            "exclude": {"interviewQuestions", "assignment"},
            "note": "Use simple language. Avoid jargon. Define every term. Prioritize intuition over formalism.",
        },
        "intermediate": {
            "include": None,  # All sections
            "exclude": set(),
            "note": "Assume basic familiarity. Balance theory and practice. Include working code.",
        },
        "advanced": {
            "include": None,  # All sections
            "exclude": {"analogy"},
            "note": "Assume strong fundamentals. Cover edge cases, optimization, and system-level thinking.",
        },
        "expert": {
            "include": {"explanation", "examples", "caseStudy", "interviewQuestions", "cheatSheet"},
            "exclude": {"analogy", "quiz", "assignment"},
            "note": "Assume mastery. Focus on production trade-offs, research insights, and internals.",
        },
        "interview": {
            "include": {"explanation", "interviewQuestions", "commonMistakes", "cheatSheet", "examples"},
            "exclude": {"assignment", "projects"},
            "note": "Frame everything through interview lens. Prioritize patterns, trade-offs, and quick recall.",
        },
        "exam": {
            "include": {"explanation", "quiz", "cheatSheet", "commonMistakes", "examples"},
            "exclude": {"projects", "caseStudy"},
            "note": "Focus on exam-testable content. Formulas, definitions, and structured MCQs.",
        },
        "quick_revision": {
            "include": {"explanation", "cheatSheet", "commonMistakes"},
            "exclude": {"projects", "caseStudy", "assignment", "quiz"},
            "note": "Ultra-concise. Bullet points only. Key facts, formulas, and memory hooks.",
        },
        "coding": {
            "include": {"explanation", "examples", "miniProject", "assignment", "commonMistakes", "cheatSheet"},
            "exclude": set(),
            "note": "Focus on runnable code. Every section should include complete implementations.",
        },
        "deep": {
            "include": None,  # All sections
            "exclude": set(),
            "note": "Maximum depth. Prove everything. Include internals, proofs, and research context.",
        },
        "default": {
            "include": None,  # All sections
            "exclude": set(),
            "note": "Comprehensive, balanced lesson covering all major aspects of the topic.",
        },
    }

    def plan(
        self,
        subject: str,
        topic: str,
        difficulty: str = "intermediate",
        learning_mode: str = "default",
    ) -> LessonPlan:
        """
        Produce a LessonPlan for the given topic, difficulty, and mode.
        """
        # Run topic analysis
        try:
            analysis = topic_analyzer.analyze(subject, topic)
            topic_category = analysis.category
            complexity = self._infer_complexity(analysis)
        except Exception as e:
            logger.warning("Topic analysis failed, using defaults: %s", e)
            topic_category = "general"
            complexity = "moderate"

        # Get mode config — fall back to default
        mode_cfg = self.MODE_CONFIG.get(learning_mode, self.MODE_CONFIG["default"])

        # Start from all sections in canonical order
        sections = list(ALL_SECTIONS)

        # Mode-specific section filtering disabled to ensure all 10 sections are always planned

        # Topic-specific pruning disabled to ensure all 10 sections are always planned

        # Guarantee explanation is always first
        if "explanation" not in sections:
            sections.insert(0, "explanation")
        elif sections[0] != "explanation":
            sections.remove("explanation")
            sections.insert(0, "explanation")

        # Build title map only for planned sections
        section_titles = {s: SECTION_TITLES[s] for s in sections if s in SECTION_TITLES}

        note = mode_cfg.get("note", "")
        if difficulty == "beginner":
            note += " Use very accessible language and real-world examples."
        elif difficulty == "advanced":
            note += " Include nuanced trade-offs and advanced optimizations."

        logger.info(
            "PlannerAgent: %s/%s [%s/%s] → %d sections: %s",
            subject, topic, difficulty, learning_mode,
            len(sections), sections
        )

        return LessonPlan(
            sections=sections,
            section_titles=section_titles,
            topic_category=topic_category,
            complexity=complexity,
            learning_note=note,
            metadata={
                "subject": subject,
                "topic": topic,
                "difficulty": difficulty,
                "learning_mode": learning_mode,
                "topic_category": topic_category,
            },
        )

    def _infer_complexity(self, analysis: Any) -> str:
        """Map topic analysis confidence to complexity label."""
        confidence = getattr(analysis, "confidence", 0.5)
        if confidence >= 0.8:
            return "complex"
        elif confidence >= 0.5:
            return "moderate"
        return "simple"


# Global singleton
planner_agent = PlannerAgent()
