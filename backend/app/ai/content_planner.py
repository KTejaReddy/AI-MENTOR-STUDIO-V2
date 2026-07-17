from typing import List, Dict
from app.ai.topic_analyzer import TopicAnalysis


ALL_SECTIONS = [
    "explanation", "examples", "code", "complexity", "quiz",
    "interviewQuestions", "mistakes", "projects",
    "cheatSheet", "prerequisites", "applications", "advantages",
    "disadvantages", "summary", "assignments", "comparisons",
    "caseStudy", "analogy", "diagram", "formula", "visualization", "proof",
]

LEARNING_MODE_ADJUSTMENTS = {
    "beginner": {
        "add": ["analogy", "prerequisites", "examples"],
        "remove": ["complexity", "interviewQuestions", "proof", "comparisons"],
        "instruction": "Use simple vocabulary. Define all terminology. Provide real-world analogies.",
    },
    "intermediate": {
        "add": ["code", "complexity", "examples"],
        "remove": [],
        "instruction": "Assume basic knowledge. Focus on implementation and moderate complexity analysis.",
    },
    "advanced": {
        "add": ["complexity", "proof", "interviewQuestions", "mistakes", "comparisons"],
        "remove": ["analogy", "prerequisites"],
        "instruction": "Assume strong fundamentals. Cover edge cases, optimization, and advanced patterns.",
    },
    "expert": {
        "add": ["proof", "comparisons", "internals"],
        "remove": ["analogy", "prerequisites", "cheatSheet"],
        "instruction": "Assume mastery. Cover cutting-edge research, production trade-offs, and system internals.",
    },
    "coding": {
        "add": ["code", "examples", "projects", "assignments"],
        "remove": [],
        "instruction": "Focus on hands-on coding. Provide complete, runnable code examples. Include practical projects.",
    },
    "interview": {
        "add": ["interviewQuestions", "cheatSheet"],
        "remove": ["projects", "proof", "assignments"],
        "instruction": "Focus on interview-relevant aspects. Include commonly asked questions, HR tips, and quick revision.",
    },
    "exam": {
        "add": ["cheatSheet", "quiz", "formula", "summary"],
        "remove": ["projects", "caseStudy", "assignments"],
        "instruction": "Focus on exam-relevant topics. Include frequently asked questions, formula sheets, and quick revision.",
    },
    "research": {
        "add": ["proof", "comparisons"],
        "remove": ["cheatSheet", "projects", "code", "assignments"],
        "instruction": "Focus on research aspects. Include seminal papers, open problems, and advanced theory.",
    },
    "quick_revision": {
        "add": ["cheatSheet", "summary", "formula"],
        "remove": ["projects", "caseStudy", "code", "proof", "assignments", "applications"],
        "instruction": "Keep it extremely concise. Bullet points only. Focus on key formulas, definitions, and quick revision.",
    },
    "default": {
        "add": [],
        "remove": [],
        "instruction": "Provide a balanced and comprehensive lesson covering all aspects.",
    },
    "deep": {
        "add": ["proof", "comparisons", "internals"],
        "remove": [],
        "instruction": "Provide an in-depth exploration with rigorous proofs, comparisons, and extensive internals.",
    },
    "project": {
        "add": ["projects", "assignments", "code", "examples"],
        "remove": [],
        "instruction": "Focus on project-based learning. Include complete project specifications and implementation guidance.",
    },
}


class ContentPlanner:
    def plan(self, analysis: TopicAnalysis, difficulty: str, learning_mode: str) -> List[str]:
        sections = list(ALL_SECTIONS)

        adjustments = LEARNING_MODE_ADJUSTMENTS.get(
            learning_mode,
            LEARNING_MODE_ADJUSTMENTS.get(difficulty, {}),
        )
        if adjustments:
            for section in adjustments.get("remove", []):
                if section in sections:
                    sections.remove(section)
            for section in adjustments.get("add", []):
                if section not in sections:
                    sections.append(section)

        if not analysis.needs_code and "code" in sections:
            sections.remove("code")
        if not analysis.needs_diagram and "diagram" in sections:
            sections.remove("diagram")
        if not analysis.needs_formula and "formula" in sections:
            sections.remove("formula")
        if not analysis.needs_complexity and "complexity" in sections:
            sections.remove("complexity")
        if not analysis.needs_quiz and "quiz" in sections:
            sections.remove("quiz")
        if not analysis.needs_projects and "projects" in sections:
            sections.remove("projects")
        if not analysis.needs_case_study and "caseStudy" in sections:
            sections.remove("caseStudy")
        if not analysis.needs_visualizer and "visualization" in sections:
            sections.remove("visualization")
        if not analysis.needs_interview_questions and "interviewQuestions" in sections:
            sections.remove("interviewQuestions")

        return sections

    def get_mode_instruction(self, learning_mode: str) -> str:
        adj = LEARNING_MODE_ADJUSTMENTS.get(learning_mode, {})
        return adj.get("instruction", "")

    def get_section_descriptions(self, sections: List[str]) -> str:
        descs = {
            "explanation": "explanation: Detailed conceptual explanation with clear definitions",
            "analogy": "analogy: A relatable real-world analogy to build intuition",
            "caseStudy": "caseStudy: A real-world engineering application or industry use case",
            "examples": "examples: Worked examples with step-by-step solutions",
            "code": "code: Code implementation in a relevant programming language",
            "diagram": "diagram: An ASCII or text-based diagram showing structure/flow",
            "formula": "formula: Key mathematical formulas with variable definitions",
            "proof": "proof: Mathematical or logical proof of the core concept",
            "complexity": "complexity: Time and space complexity analysis with Big O notation",
            "visualization": "visualization: Step-by-step visual trace of the algorithm",
            "cheatSheet": "cheatSheet: Quick reference with key points, formulas, and mnemonics",
            "quiz": "quiz: Multiple choice questions (MCQs) with 4 options each, correct answer index, and explanation",
            "interviewQuestions": "interviewQuestions: Common interview questions with expected answers and difficulty level",
            "projects": "projects: Practical project ideas with descriptions and required skills",
            "mistakes": "mistakes: Common mistakes and misconceptions with corrections",
            "prerequisites": "prerequisites: Required background knowledge before studying this topic",
            "references": "references: Academic papers, textbooks, and online resources",
            "applications": "applications: Real-world applications and use cases of the concept",
            "advantages": "advantages: Key advantages and benefits of the approach",
            "disadvantages": "disadvantages: Limitations and drawbacks to consider",
            "summary": "summary: Concise summary of key takeaways from the lesson",
            "assignments": "assignments: Practice problems and exercises to reinforce learning",
            "comparisons": "comparisons: Comparative analysis with alternative approaches or technologies",
        }
        return "\n".join(f"  - {descs.get(s, s)}" for s in sections)


content_planner = ContentPlanner()
