from typing import Dict, Any, List


SECTION_COMPONENT_MAP = {
    # Orchestrator 11 agents (primary)
    "explanation": "ExplanationCard",
    "caseStudy": "CaseStudyCard",
    "analogy": "AnalogyCard",
    "examples": "ExamplesCard",
    "quiz": "QuizCard",
    "assignment": "AssignmentCard",
    "projects": "ProjectsCard",
    "commonMistakes": "MistakesCard",
    "interviewQuestions": "InterviewCard",
    "cheatSheet": "CheatSheetCard",
    # Legacy aliases
    "introduction": "ExplanationCard",
    "definition": "DefinitionCard",
    "coreConcepts": "ConceptCard",
    "working": "WorkingCard",
    "codeExamples": "CodeExamplesCard",
    "advantages": "ComparisonCard",
    "disadvantages": "ComparisonCard",
    "realWorldApplications": "ApplicationsCard",
    "industryUsage": "IndustryCard",
    "summary": "SummaryCard",
    "code": "CodeCard",
    "diagram": "DiagramCard",
    "formula": "FormulaCard",
    "complexity": "ComplexityCard",
    "visualization": "VisualizationCard",
    "mistakes": "MistakesCard",
    "prerequisites": "PrerequisitesCard",
    "proof": "ProofCard",
}

SECTION_ORDER = [
    # Orchestrator 11 agents
    "explanation", "caseStudy", "analogy", "examples",
    "quiz", "assignment", "projects",
    "commonMistakes", "interviewQuestions", "cheatSheet",
    # Legacy section types (low priority)
    "introduction", "definition", "coreConcepts", "working",
    "codeExamples", "advantages", "disadvantages",
    "realWorldApplications", "industryUsage", "summary",
    "prerequisites", "diagram", "formula", "proof", "code",
    "complexity", "visualization",
]


class ContentMapper:
    def map_to_sections(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        sections = data.get("sections", {})
        ordered = []

        for section_type in SECTION_ORDER:
            if section_type in sections:
                section_data = sections[section_type]
                if isinstance(section_data, dict):
                    component = SECTION_COMPONENT_MAP.get(section_type, "UnknownCard")
                    ordered.append({
                        "type": section_type,
                        "component": component,
                        "props": section_data,
                        "title": section_data.get("title", section_type.replace("_", " ").title()),
                    })

        return ordered

    def map_to_sidebar_items(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        sections = data.get("sections", {})
        items = []

        section_icons = {
            "explanation": "BookOpen", "caseStudy": "FileText", "analogy": "Lightbulb",
            "examples": "List", "quiz": "BrainCircuit", "assignment": "ClipboardList",
            "projects": "Puzzle", "commonMistakes": "MessageSquare",
            "interviewQuestions": "HelpCircle", "cheatSheet": "Bookmark",
            "references": "Globe", "code": "Code2", "diagram": "Image",
            "formula": "Sigma", "complexity": "BarChart3", "visualization": "Eye",
            "prerequisites": "ClipboardList", "proof": "CheckSquare",
            "introduction": "BookOpen", "definition": "BookText", "coreConcepts": "Lightbulb",
            "working": "Settings2", "codeExamples": "Code2",
            "advantages": "TrendingUp", "disadvantages": "TrendingDown",
            "realWorldApplications": "Globe", "industryUsage": "Building2",
            "summary": "FileText",
        }

        for section_type in SECTION_ORDER:
            if section_type in sections:
                section_data = sections[section_type]
                items.append({
                    "id": section_type,
                    "title": section_data.get("title", section_type.replace("_", " ").title()),
                    "icon": section_icons.get(section_type, "FileText"),
                })

        return items

    def get_metadata_preview(self, data: Dict[str, Any]) -> Dict[str, Any]:
        metadata = data.get("metadata", {})
        sections = data.get("sections", {})
        return {
            "title": metadata.get("title", "Untitled"),
            "summary": metadata.get("learningObjectives", [""])[0] if metadata.get("learningObjectives") else "",
            "subject": metadata.get("subject", ""),
            "topic": metadata.get("topic", ""),
            "difficulty": metadata.get("difficulty", "intermediate"),
            "estimatedReadingTime": metadata.get("estimatedReadingTime", 15),
            "sectionsCount": len(sections),
            "tags": metadata.get("tags", []),
            "prerequisites": metadata.get("prerequisites", []),
        }


content_mapper = ContentMapper()
