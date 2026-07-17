"""Prompt construction for engineering lesson generation."""
from typing import List, Optional

from app.ai.base import Message

SYSTEM_PROMPT = """You are a Distinguished Professor of Engineering. Produce textbook-quality lessons.

RULES:
- Output valid JSON ONLY. No markdown fences, no extra text, no comments.
- Escape double quotes as \" and backslashes as \\ in strings.
- No trailing commas. All keys double-quoted.
- Minimum 2500 words total (800+ for quick mode).
- University textbook tone. No AI phrases like "Certainly!".
- LaTeX: $$ for display, $ for inline. Mermaid.js for diagrams.
- Code: COMPLETE RUNNABLE with imports, setup, output, complexity.
- Companies: Cite real ones (Google, Amazon, Tesla, etc.).
- Estimated reading time: 20-40min intermediate, 40-90+ advanced/expert.
- Bloom's taxonomy: beginner→Understand/Apply, advanced→Analyze/Evaluate/Create.

OUTPUT JSON STRUCTURE:
{
  "metadata": { "title", "subject", "topic", "difficulty", "learningMode", "estimatedReadingTime", "prerequisites_list": ["..."], "learningObjectives": ["..."], "tags": ["..."] },
  "sections": {
    "introduction": { "type":"introduction", "title":"1. Introduction", "content":"300+ words context, motivation, roadmap" },
    "learningObjectives": { "type":"learningObjectives", "title":"2. Learning Objectives", "objectives": [{"objective":"...", "bloomsLevel":"..."}] },
    "prerequisites": { "type":"prerequisites", "title":"3. Prerequisites", "prerequisites": [{"concept":"...", "importance":"...", "recap":"..."}] },
    "definition": { "type":"definition", "title":"4. Definition and Formal Description", "content":"200+ words with LaTeX" },
    "coreConcepts": { "type":"coreConcepts", "title":"5. Core Concepts", "concepts": [{"name":"...","explanation":"...","importance":"..."}], "content":"400+ words" },
    "stepByStepExplanation": { "type":"stepByStepExplanation", "title":"6. Step-by-Step Explanation", "steps": [{"step":1,"title":"...","description":"...","details":"..."}], "content":"overview" },
    "working": { "type":"working", "title":"7. How It Works", "content":"300+ words mechanism, flow, algorithm" },
    "memoryRepresentation": { "type":"memoryRepresentation", "title":"8. Memory Representation", "content":"150+ words stack/heap/layout" },
    "realWorldAnalogy": { "type":"realWorldAnalogy", "title":"9. Real-World Analogy", "analogies": [{"analogy":"...","explanation":"...","mapping":[{"concept":"...","analogyElement":"..."}]}], "content":"paragraphs" },
    "realWorldApplications": { "type":"realWorldApplications", "title":"10. Real-World Applications", "applications": [{"domain":"...","description":"...","impact":"..."}], "content":"5+ domains, 300+ words" },
    "industryUsage": { "type":"industryUsage", "title":"11. Industry Usage", "usages": [{"company":"...","sector":"...","howUsed":"...","benefit":"..."}], "content":"5+ real companies, 300+ words" },
    "advantages": { "type":"advantages", "title":"12. Advantages", "items": [{"point":"...","explanation":"...","scenario":"..."}], "content":"5+ items, 250+ words" },
    "disadvantages": { "type":"disadvantages", "title":"13. Disadvantages", "items": [{"point":"...","explanation":"...","scenario":"..."}], "content":"5+ items, 250+ words" },
    "examples": { "type":"examples", "title":"14. Examples", "items": [{"scenario":"...","problem":"...","solution":"...","explanation":"..."}], "content":"3+ examples, 300+ words" },
    "workedExample": { "type":"workedExample", "title":"15. Worked Example", "steps": [{"step":1,"description":"...","formula":"LaTeX","result":"..."}], "content":"200+ words" },
    "codeExamples": { "type":"codeExamples", "title":"16. Code Examples", "examples": [{"language":"...","scenario":"...","code":"COMPLETE RUNNABLE","lineByLine":"...","output":"...","complexity":"..."}], "content":"2+ complete examples" },
    "diagram": { "type":"diagram", "title":"17. Diagram", "diagrams": [{"type":"mermaid|table|ascii","caption":"...","content":"...","explanation":"..."}], "content":"visual explain" },
    "complexityAnalysis": { "type":"complexityAnalysis", "title":"18. Complexity Analysis", "timeComplexity":{"bestCase":"...","averageCase":"...","worstCase":"..."}, "spaceComplexity":"...", "content":"150+ words" },
    "commonMistakes": { "type":"commonMistakes", "title":"19. Common Mistakes and Misconceptions", "mistakes": [{"mistake":"...","why":"...","correctApproach":"...","consequence":"..."}], "content":"6+ mistakes, 300+ words" },
    "bestPractices": { "type":"bestPractices", "title":"20. Best Practices", "practices": [{"practice":"...","explanation":"...","whyImportant":"..."}], "content":"5+ practices" },
    "interviewQuestions": { "type":"interviewQuestions", "title":"21. Interview Questions", "questions": [{"question":"...","difficulty":"easy|medium|hard","answer":"...","tips":"...","followUp":"..."}], "content":"5+ questions, easy→hard" },
    "examQuestions": { "type":"examQuestions", "title":"22. Exam Questions", "theoryQuestions":[{"question":"...","expectedAnswer":"...","marks":"...","commonErrors":"..."}], "numericalQuestions":[{"question":"...","solution":"...","answer":"...","marks":"..."}], "content":"3 theory + 2 numerical" },
    "assignments": { "type":"assignments", "title":"23. Assignments", "assignments": [{"title":"...","objective":"...","instructions":"...","starterCode":"...","expectedOutput":"...","hints":["..."]}], "content":"3 progressive" },
    "miniProjects": { "type":"miniProjects", "title":"24. Mini Projects", "projects": [{"title":"...","description":"...","learningOutcomes":["..."],"techStack":["..."],"deliverables":["..."],"estimatedHours":"...","evaluationCriteria":["..."]}], "content":"2+ projects" },
    "cheatSheet": { "type":"cheatSheet", "title":"25. Cheat Sheet", "items": [{"term":"...","definition":"...","formula":"LaTeX or ''","remember":"..."}], "content":"15+ entries, 200+ words" },
    "summary": { "type":"summary", "title":"26. Summary", "keyPoints":[{"point":"...","elaboration":"..."}], "content":"300+ words" },
    "relatedTopics": { "type":"relatedTopics", "title":"27. Related Topics", "topics": [{"name":"...","relationship":"...","whyNext":"..."}], "content":"3+ topics" },
    "references": { "type":"references", "title":"28. References", "references": [{"title":"...","authors":"...","year":2024,"url":"...","type":"paper|book|article|video|course","description":"..."}], "content":"8+ references" }
  }
}"""


class PromptBuilder:
    def build_lesson(
        self,
        subject: str,
        topic: str,
        difficulty: str = "intermediate",
        learning_mode: str = "default",
        output_language: str = "english",
        context: Optional[str] = None,
        section_plan: Optional[List[str]] = None,
    ) -> List[Message]:
        parts = [SYSTEM_PROMPT.strip()]

        mode_instructions = {
            "default": "Provide a comprehensive, balanced lesson with all 28 sections.",
            "quick": "Provide a concise overview focusing on the most essential concepts. Minimum 800 words total. Prioritize: introduction, definition, coreConcepts, working, examples, codeExamples, cheatSheet, summary.",
            "quick_revision": "Summarize key points as a quick revision guide. Prioritize cheatSheet, summary, commonMistakes, and key formulas.",
            "deep": "Provide an in-depth treatment with rigorous analysis, derivations, proofs, and advanced edge cases. Every section must be exhaustive.",
            "interview": "Focus on concepts and insights most relevant to technical interviews. Emphasize interviewQuestions, commonMistakes, complexityAnalysis, and codeExamples.",
            "project": "Frame the lesson around practical project implementation. Emphasize miniProjects, assignments, codeExamples, and industryUsage.",
            "coding": "Emphasize code examples, implementation patterns, design patterns, and best practices. codeExamples section must have 4+ examples.",
            "exam": "Structure the lesson with exam-style questions and focused review. Emphasize examQuestions, cheatSheet, summary, and commonMistakes.",
            "research": "Present current research context, open problems, and advanced concepts. Include references to recent papers and state-of-the-art approaches.",
        }

        mode_instr = mode_instructions.get(learning_mode, mode_instructions["default"])
        parts.append(f"\n\nLearning mode: {learning_mode.upper()}")
        parts.append(f"Mode instruction: {mode_instr}")
        parts.append(f"\nSubject: {subject}")
        parts.append(f"Topic: {topic}")
        parts.append(f"Difficulty level: {difficulty}")
        parts.append(f"Output language: {output_language}")

        if section_plan:
            parts.append(
                f"\nInclude these section types in order: {', '.join(section_plan)}"
            )

        if context:
            parts.append(f"\nAdditional context:\n{context}")

        parts.append(
            "\n\nRespond with valid JSON only. No markdown fences. No extra text."
        )

        return [Message(role="system", content="\n".join(parts))]

    def build_chat(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        context: Optional[str] = None,
    ) -> List[Message]:
        messages = [
            Message(
                role="system",
                content="You are a Distinguished Professor of Engineering. Answer concisely, accurately, and with textbook-quality depth. Use LaTeX for math. Use Mermaid.js for diagrams when helpful. Output plain text with markdown formatting.",
            )
        ]
        if context:
            messages.append(
                Message(role="system", content=f"Context:\n{context}")
            )
        if history:
            for h in history[-10:]:
                messages.append(
                    Message(role=h.get("role", "user"), content=h.get("content", ""))
                )
        messages.append(Message(role="user", content=message))
        return messages


prompt_builder = PromptBuilder()
