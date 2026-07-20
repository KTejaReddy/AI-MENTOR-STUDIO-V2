"""
Planner Agent — Decides generation order and section configuration based on topic.
The planner runs FIRST before any section agent, analyzes the topic,
and returns a structured plan that the orchestrator follows.
"""
import logging
from dataclasses import dataclass, field
from typing import List, Dict, Any

from app.ai.topic_analyzer import topic_analyzer

logger = logging.getLogger(__name__)


# Dynamic templates mapping subject categories to section structures
SUBJECT_TEMPLATES = {
    "programming": [
        ("overview", "1. Overview"),
        ("explanation", "2. Detailed Explanation"),
        ("algorithm", "3. Algorithm"),
        ("codeExamples", "4. Code Examples"),
        ("complexity", "5. Time & Space Complexity"),
        ("visualization", "6. Visualization"),
        ("interviewQuestions", "7. Interview Questions"),
        ("quiz", "8. Quiz"),
        ("summary", "9. Summary")
    ],
    "mathematics": [
        ("overview", "1. Overview"),
        ("explanation", "2. Theory & Concepts"),
        ("formulaExplanation", "3. Important Formulae"),
        ("mathematicalDerivation", "4. Theorems & Proofs"),
        ("codeExamples", "5. Solved Problems"),
        ("assignment", "6. Practice Problems"),
        ("visualization", "7. Graphs"),
        ("quiz", "8. Quiz"),
        ("summary", "9. Summary")
    ],
    "electronics": [
        ("overview", "1. Overview"),
        ("explanation", "2. Core Principles"),
        ("diagramDescription", "3. Circuit Diagrams"),
        ("applications", "4. Real-World Applications"),
        ("quiz", "5. Quiz"),
        ("summary", "6. Summary")
    ],
    "general": [
        ("overview", "1. Overview"),
        ("explanation", "2. Detailed Explanation"),
        ("keyConcepts", "3. Key Concepts"),
        ("caseStudy", "4. Examples & Case Studies"),
        ("applications", "5. Applications"),
        ("quiz", "6. Quiz"),
        ("summary", "7. Summary")
    ]
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
    """

    def plan(
        self,
        subject: str,
        topic: str,
    ) -> LessonPlan:
        """
        Produce a LessonPlan for the given topic.
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

        # Get dynamic template based on topic category
        category_lower = topic_category.lower()
        template_key = "general"
        for key in SUBJECT_TEMPLATES.keys():
            if key in category_lower:
                template_key = key
                break
        
        template = SUBJECT_TEMPLATES.get(template_key, SUBJECT_TEMPLATES["general"])
        sections = [sec[0] for sec in template]
        section_titles = {sec[0]: sec[1] for sec in template}

        # Guarantee explanation is always first or second
        if "explanation" not in sections:
            sections.insert(0, "explanation")
            section_titles["explanation"] = "Explanation"
        elif sections[0] != "explanation" and sections[0] != "overview":
            sections.remove("explanation")
            sections.insert(0, "explanation")

        note = "Comprehensive, balanced lesson covering all major aspects of the topic."

        logger.info(
            "PlannerAgent: %s/%s → %d sections: %s",
            subject, topic, len(sections), sections
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
