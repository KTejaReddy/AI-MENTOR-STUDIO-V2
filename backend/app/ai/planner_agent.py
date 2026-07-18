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
        ("formulae", "3. Important Formulae"),
        ("theorems", "4. Theorems & Proofs"),
        ("examples", "5. Solved Problems"),
        ("practiceProblems", "6. Practice Problems"),
        ("graphs", "7. Graphs"),
        ("quiz", "8. Quiz"),
        ("summary", "9. Summary")
    ],
    "electronics": [
        ("overview", "1. Overview"),
        ("explanation", "2. Core Principles"),
        ("circuitDiagrams", "3. Circuit Diagrams"),
        ("truthTables", "4. Truth Tables & Logic"),
        ("timingDiagrams", "5. Timing Diagrams"),
        ("applications", "6. Real-World Applications"),
        ("examples", "7. Examples"),
        ("quiz", "8. Quiz"),
        ("summary", "9. Summary")
    ],
    "electrical": [
        ("overview", "1. Overview"),
        ("explanation", "2. Core Principles"),
        ("circuitDiagrams", "3. Circuit Diagrams"),
        ("applications", "4. Real-World Applications"),
        ("examples", "5. Examples"),
        ("quiz", "6. Quiz"),
        ("summary", "7. Summary")
    ],
    "mechanical": [
        ("overview", "1. Overview"),
        ("explanation", "2. Core Concepts"),
        ("diagrams", "3. Mechanical Diagrams"),
        ("formulae", "4. Key Formulae"),
        ("applications", "5. Applications"),
        ("examples", "6. Solved Problems"),
        ("quiz", "7. Quiz"),
        ("summary", "8. Summary")
    ],
    "civil": [
        ("overview", "1. Overview"),
        ("explanation", "2. Core Concepts"),
        ("diagrams", "3. Structural Diagrams"),
        ("formulae", "4. Key Formulae"),
        ("applications", "5. Applications"),
        ("examples", "6. Solved Problems"),
        ("quiz", "7. Quiz"),
        ("summary", "8. Summary")
    ],
    "physics": [
        ("overview", "1. Overview"),
        ("explanation", "2. Core Concepts"),
        ("lawsAndTheorems", "3. Laws & Theorems"),
        ("formulae", "4. Important Formulae"),
        ("diagrams", "5. Diagrams & Visuals"),
        ("examples", "6. Solved Numerical Problems"),
        ("quiz", "7. Quiz"),
        ("summary", "8. Summary")
    ],
    "chemistry": [
        ("overview", "1. Overview"),
        ("explanation", "2. Theory & Concepts"),
        ("chemicalEquations", "3. Chemical Equations"),
        ("molecularStructures", "4. Molecular Structures"),
        ("reactions", "5. Reactions & Mechanisms"),
        ("applications", "6. Applications"),
        ("quiz", "7. Quiz"),
        ("summary", "8. Summary")
    ],
    "biology": [
        ("overview", "1. Overview"),
        ("explanation", "2. Core Concepts"),
        ("diagrams", "3. Biological Diagrams"),
        ("processes", "4. Mechanisms & Processes"),
        ("applications", "5. Real-World Applications"),
        ("quiz", "6. Quiz"),
        ("summary", "7. Summary")
    ],
    "english": [
        ("overview", "1. Overview"),
        ("explanation", "2. Core Concepts"),
        ("grammar", "3. Grammar"),
        ("examples", "4. Writing Examples"),
        ("communicationSkills", "5. Communication Skills"),
        ("commonMistakes", "6. Common Mistakes"),
        ("quiz", "7. Quiz"),
        ("summary", "8. Summary")
    ],
    "communication": [
        ("overview", "1. Overview"),
        ("explanation", "2. Core Concepts"),
        ("grammar", "3. Grammar"),
        ("examples", "4. Writing Examples"),
        ("communicationSkills", "5. Communication Skills"),
        ("commonMistakes", "6. Common Mistakes"),
        ("quiz", "7. Quiz"),
        ("summary", "8. Summary")
    ],
    "management": [
        ("overview", "1. Overview"),
        ("explanation", "2. Core Concepts"),
        ("caseStudy", "3. Case Studies"),
        ("frameworks", "4. Frameworks & Models"),
        ("applications", "5. Practical Applications"),
        ("quiz", "6. Quiz"),
        ("summary", "7. Summary")
    ],
    "general": [
        ("overview", "1. Overview"),
        ("explanation", "2. Detailed Explanation"),
        ("keyConcepts", "3. Key Concepts"),
        ("examples", "4. Examples & Case Studies"),
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

    Rules:
    - 'explanation' is ALWAYS first and always included
    - Mode-specific sections are boosted to front
    - Irrelevant sections are removed (e.g. 'quiz' for quick_revision)
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

        # Get dynamic template based on topic category
        category_lower = topic_category.lower()
        template_key = "general"
        for key in SUBJECT_TEMPLATES.keys():
            if key in category_lower:
                template_key = key
                break
        
        template = SUBJECT_TEMPLATES[template_key]
        sections = [sec[0] for sec in template]
        section_titles = {sec[0]: sec[1] for sec in template}

        # Guarantee explanation is always first
        if "explanation" not in sections:
            sections.insert(0, "explanation")
            section_titles["explanation"] = "Explanation"
        elif sections[0] != "explanation" and sections[0] != "overview":
            sections.remove("explanation")
            sections.insert(0, "explanation")

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
