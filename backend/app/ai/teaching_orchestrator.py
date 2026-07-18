"""
Teaching Orchestrator — delegates to ParallelOrchestrator for wave-based concurrent generation.
Legacy sequential path preserved as fallback.
"""
import asyncio
import logging
import time
from typing import AsyncGenerator, Dict, Any, Optional, List
from dataclasses import dataclass, field

from app.ai.base import AIProvider
from app.ai.key_manager import key_manager
from app.ai.model_router import model_router
from app.ai.reviewer_agent import reviewer_agent, ReviewResult
from app.ai.planner_agent import planner_agent
from app.ai.teaching_agents import (
    ExplanationAgent,
    CaseStudyAgent,
    AnalogyAgent,
    ExamplesAgent,
    QuizAgent,
    AssignmentAgent,
    ProjectsAgent,
    MistakesAgent,
    InterviewAgent,
    CheatSheetAgent,
    OverviewAgent,
    KeyConceptsAgent,
    ImportantDefinitionsAgent,
    CodeExamplesAgent,
    FormulaExplanationAgent,
    DiagramsAgent,
    RevisionNotesAgent,
    SummaryAgent,
    GenericSectionAgent,
    AgentConfig,
    GenerationResult,
)
from app.ai.cache import lesson_cache

logger = logging.getLogger(__name__)


AGENT_CLASSES = {
    "overview": OverviewAgent,
    "explanation": ExplanationAgent,
    "keyConcepts": KeyConceptsAgent,
    "importantDefinitions": ImportantDefinitionsAgent,
    "analogy": AnalogyAgent,
    "examples": ExamplesAgent,
    "caseStudy": CaseStudyAgent,
    "codeExamples": CodeExamplesAgent,
    "formulaExplanation": FormulaExplanationAgent,
    "diagrams": DiagramsAgent,
    "commonMistakes": MistakesAgent,
    "interviewQuestions": InterviewAgent,
    "quiz": QuizAgent,
    "assignment": AssignmentAgent,
    "miniProject": ProjectsAgent,
    "cheatSheet": CheatSheetAgent,
    "revisionNotes": RevisionNotesAgent,
    "summary": SummaryAgent,
}


@dataclass
class OrchestratorConfig:
    # Sequential — 1 agent at a time to avoid rate limits
    max_concurrent: int = 1
    enable_review: bool = False  # Disabled: adds latency without clear benefit
    max_review_retries: int = 0
    min_quality_score: float = 0.6


async def generate_lesson(
    provider: AIProvider,
    subject: str,
    topic: str,
    difficulty: str = "intermediate",
    learning_mode: str = "default",
    engine_id: str = "",
    planned_sections: Optional[List[str]] = None,
    source_material: str = "",
    is_document: bool = False,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Entry point for lesson generation — routes to parallel wave-based orchestrator.
    All 10 API keys consumed concurrently across parallel section agents.
    """
    from app.ai.parallel_orchestrator import generate_lesson_parallel
    async for event in generate_lesson_parallel(
        provider=provider,
        subject=subject,
        topic=topic,
        difficulty=difficulty,
        learning_mode=learning_mode,
        engine_id=engine_id,
        planned_sections=planned_sections,
        source_material=source_material,
        is_document=is_document,
    ):
        yield event


async def generate_lesson_sequential(
    provider: AIProvider,
    subject: str,
    topic: str,
    difficulty: str = "intermediate",
    learning_mode: str = "default",
    engine_id: str = "",
    planned_sections: Optional[List[str]] = None,  # kept for gateway compat
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Legacy sequential generation — kept as fallback.
    Flow:
      1. PlannerAgent.plan() → decides sections, order, and learning notes
      2. Each section agent runs sequentially
      3. Every chunk is yielded immediately → live streaming to frontend
    """
    start_time = time.time()
    logger.info("Teaching Orchestrator: Starting for %s / %s [%s/%s]", subject, topic, difficulty, learning_mode)

    config = OrchestratorConfig()

    # ── Step 1: Planner Agent decides what to generate ─────────────────────
    plan = planner_agent.plan(subject, topic, difficulty, learning_mode)
    active_sections = [(st, plan.section_titles.get(st, st)) for st in plan.sections]
    learning_note = plan.learning_note

    logger.info(
        "PlannerAgent plan: %d sections → %s",
        len(active_sections),
        [st for st, _ in active_sections],
    )

    # ── Emit planning result so frontend can show section list immediately ──
    yield {
        "type": "plan",
        "sections": [st for st, _ in active_sections],
        "section_titles": plan.section_titles,
        "topic_category": plan.topic_category,
        "engine_id": engine_id,
    }

    # ── Step 2: Track state ─────────────────────────────────────────────────
    section_status = {st: "waiting" for st, _ in active_sections}
    results: Dict[str, GenerationResult] = {}

    async def run_agent(section_type: str, title: str, index: int):
        """Run a single teaching agent (called sequentially by the outer loop)."""
        agent_class = AGENT_CLASSES.get(section_type, GenericSectionAgent)

        # Get model for this section via intelligent router
        model_id = model_router.route(section_type, learning_mode=learning_mode, difficulty=difficulty, subject=subject, topic=topic)

        # Build agent config with correct token limits from router config
        agent_config = _build_agent_config(section_type, model_id, learning_mode)

        # Create and run agent
        agent = agent_class(agent_config, key_pool)

        # Emit status: generating
        section_status[section_type] = "generating"
        yield {
            "type": "section_status",
            "section_type": section_type,
            "status": "generating",
            "title": title,
            "engine_id": engine_id,
        }

        try:
            result = None
            # Pass planner learning note as context to improve output quality
            context = learning_note if learning_note else None
            async for item in agent.generate(
                subject=subject,
                topic=topic,
                difficulty=difficulty,
                learning_mode=learning_mode,
                context=context,
            ):
                if isinstance(item, dict) and item.get("type") in ("section_chunk", "section_clear"):
                    item["engine_id"] = engine_id
                    yield item
                elif hasattr(item, "status"):  # GenerationResult
                    result = item

            if result is None:
                raise RuntimeError(f"Agent {section_type} did not return a result")

            section_status[section_type] = "completed" if result.status == "completed" else "failed"
            results[section_type] = result

            elapsed = round(time.time() - start_time, 2)
            yield {
                "type": "section_done",
                "section_type": section_type,
                "section_data": {
                    "type": section_type,
                    "title": title,
                    "content": result.content,
                    "metadata": result.metadata,
                },
                "status": result.status,
                "engine_id": engine_id,
                "elapsed": elapsed,
                "model": result.model_used,
                "quality_score": result.quality_score,
            }

        except Exception as e:
            logger.error("Agent %s failed: %s", section_type, e, exc_info=True)
            section_status[section_type] = "failed"
            results[section_type] = GenerationResult(
                section_type=section_type,
                content="",
                title=title,
                status="failed",
                error=str(e),
            )
            yield {
                "type": "section_done",
                "section_type": section_type,
                "section_data": {
                    "type": section_type,
                    "title": title,
                    "content": f"*Could not generate this section: {str(e)[:120]}*",
                },
                "status": "failed",
                "engine_id": engine_id,
                "elapsed": round(time.time() - start_time, 2),
                "model": "unknown",
            }


    # ── Step 3: Run agents ONE BY ONE — sequential streaming ──────────────
    for i, (section_type, title) in enumerate(active_sections):
        async for event in run_agent(section_type, title, i):
            yield event
        # Small gap between sections to respect rate limits
        if i < len(active_sections) - 1:
            await asyncio.sleep(0.5)

    # Build final lesson
    total_elapsed = round(time.time() - start_time, 2)

    lesson = {
        "metadata": {
            "title": f"{subject}: {topic}",
            "subject": subject,
            "topic": topic,
            "difficulty": difficulty,
            "learningMode": learning_mode,
            "estimatedReadingTime": max(20, len(results) * 10),
            "prerequisites_list": [],
            "learningObjectives": [],
            "tags": [subject.lower().replace(" ", "-")],
            "engine_id": engine_id,
            "total_generation_time": total_elapsed,
        },
        "sections": {},
        "resources": {"keyTerms": [], "furtherReading": []},
    }

    for section_type, title in active_sections:
        if section_type in results:
            result = results[section_type]
            lesson["sections"][section_type] = {
                "type": section_type,
                "title": title,
                "content": result.content,
                "metadata": result.metadata,
            }
        else:
            lesson["sections"][section_type] = {
                "type": section_type,
                "title": title,
                "content": "*Section not generated*",
            }

    # Cache the lesson
    lesson_cache.set(subject, topic, difficulty, learning_mode, lesson)

    # Final yield
    yield {
        "type": "done",
        "finish_reason": "stop",
        "elapsed": total_elapsed,
    }
    yield {
        "type": "lesson",
        "data": lesson,
        "repaired": False,
        "cached": False,
        "model": "multi-agent",
        "elapsed": total_elapsed,
    }

    logger.info(
        "Teaching Orchestrator: Completed %s / %s in %.1fs (%d/10 sections)",
        subject, topic, total_elapsed, sum(1 for r in results.values() if r.status == "completed")
    )


def _build_agent_config(section_type: str, model_id: str, learning_mode: str) -> AgentConfig:
    """Build configuration for a specific agent."""
    from app.ai.model_router_config import get_section_config

    routing = get_section_config(section_type)

    # Base configurations per section type
    configs = {
        "overview": AgentConfig(
            section_type="overview",
            system_prompt=_get_overview_system_prompt(),
            prompt_template=_get_overview_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.7,
            min_content_length=100,
        ),
        "explanation": AgentConfig(
            section_type="explanation",
            system_prompt=_get_explanation_system_prompt(),
            prompt_template=_get_explanation_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.7,
            min_content_length=500,
        ),
        "keyConcepts": AgentConfig(
            section_type="keyConcepts",
            system_prompt=_get_key_concepts_system_prompt(),
            prompt_template=_get_key_concepts_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.6,
            min_content_length=200,
        ),
        "importantDefinitions": AgentConfig(
            section_type="importantDefinitions",
            system_prompt=_get_definitions_system_prompt(),
            prompt_template=_get_definitions_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.6,
            min_content_length=200,
        ),
        "analogy": AgentConfig(
            section_type="analogy",
            system_prompt=_get_analogy_system_prompt(),
            prompt_template=_get_analogy_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.8,
            min_content_length=300,
        ),
        "examples": AgentConfig(
            section_type="examples",
            system_prompt=_get_examples_system_prompt(),
            prompt_template=_get_examples_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.7,
            min_content_length=500,
        ),
        "caseStudy": AgentConfig(
            section_type="caseStudy",
            system_prompt=_get_case_study_system_prompt(),
            prompt_template=_get_case_study_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.7,
            min_content_length=500,
        ),
        "codeExamples": AgentConfig(
            section_type="codeExamples",
            system_prompt=_get_code_examples_system_prompt(),
            prompt_template=_get_code_examples_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.65,
            min_content_length=200,
        ),
        "formulaExplanation": AgentConfig(
            section_type="formulaExplanation",
            system_prompt=_get_formula_system_prompt(),
            prompt_template=_get_formula_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.6,
            min_content_length=200,
        ),
        "diagrams": AgentConfig(
            section_type="diagrams",
            system_prompt=_get_diagrams_system_prompt(),
            prompt_template=_get_diagrams_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.7,
            min_content_length=200,
        ),
        "quiz": AgentConfig(
            section_type="quiz",
            system_prompt=_get_quiz_system_prompt(),
            prompt_template=_get_quiz_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.6,
            min_content_length=500,
        ),
        "assignment": AgentConfig(
            section_type="assignment",
            system_prompt=_get_assignment_system_prompt(),
            prompt_template=_get_assignment_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.7,
            min_content_length=500,
        ),
        "miniProject": AgentConfig(
            section_type="miniProject",
            system_prompt=_get_projects_system_prompt(),
            prompt_template=_get_projects_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.7,
            min_content_length=500,
        ),
        "commonMistakes": AgentConfig(
            section_type="commonMistakes",
            system_prompt=_get_mistakes_system_prompt(),
            prompt_template=_get_mistakes_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.6,
            min_content_length=500,
        ),
        "interviewQuestions": AgentConfig(
            section_type="interviewQuestions",
            system_prompt=_get_interview_system_prompt(),
            prompt_template=_get_interview_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.6,
            min_content_length=500,
        ),
        "cheatSheet": AgentConfig(
            section_type="cheatSheet",
            system_prompt=_get_cheat_sheet_system_prompt(),
            prompt_template=_get_cheat_sheet_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.5,
            min_content_length=200,
        ),
        "revisionNotes": AgentConfig(
            section_type="revisionNotes",
            system_prompt=_get_revision_notes_system_prompt(),
            prompt_template=_get_revision_notes_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.5,
            min_content_length=100,
        ),
        "summary": AgentConfig(
            section_type="summary",
            system_prompt=_get_summary_system_prompt(),
            prompt_template=_get_summary_prompt_template(),
            model_id=model_id,
            max_tokens=routing.max_tokens if routing else 8192,
            temperature=routing.temperature if routing else 0.6,
            min_content_length=100,
        ),
    }

    generic_config = AgentConfig(
        section_type=section_type,
        system_prompt="You are an expert academic tutor. Provide clear, comprehensive, and accurate educational content.",
        prompt_template=f"Write a comprehensive and highly detailed section titled '{section_type}' for the topic {{topic}} in {{subject}}.",
        model_id=model_id,
        max_tokens=8192,
        temperature=0.7,
        min_content_length=200,
    )
    agent_config = configs.get(section_type, generic_config)

    # Enforce strict document teaching constraints across all agents
    agent_config.system_prompt += """
IMPORTANT CONSTRAINTS:
Do NOT summarize or copy the uploaded document text.
Treat the uploaded document as reference material ONLY.
Teach the concepts as if you are an MIT or Stanford professor delivering a lecture.
Expand the information significantly beyond the source document.
If the document only briefly mentions a concept, provide the complete explanation.
Never quote large sections of the uploaded document.
Explain concepts, expand ideas, add missing context, use analogies, use examples.
Explain WHY, HOW, WHEN, applications, limitations, interview relevance, exam relevance, and industry usage.
"""
    return agent_config


# =============================================================================
# SYSTEM PROMPTS & TEMPLATES
# =============================================================================

def _get_overview_system_prompt() -> str:
    return """You are a distinguished professor writing the opening section of a textbook chapter.
Your overview must be engaging, precise, and give students a clear mental map of what they will learn.
Write in an authoritative yet accessible academic style. No emojis."""


def _get_overview_prompt_template() -> str:
    return """Write a comprehensive overview of the topic "{topic}" in {subject}.

Structure:
## Introduction
- What is {topic}? A clear, engaging one-paragraph definition.
- Why does it matter in modern {subject}?
- What problem does it solve?

## Prerequisites
- What prior knowledge the reader needs
- Listed as bullet points with brief explanations

## What You Will Learn
- 5-7 learning objectives as bullet points
- Each objective should be concrete and measurable

## Roadmap
- Brief description of how the rest of the lesson is structured
- What each major section covers

Requirements:
- Minimum 300 words
- Write in third-person academic style
- No code, no deep technical details — this is a roadmap
- Use markdown headings, bold for key terms

OUTPUT: Pure Markdown. Start immediately."""


def _get_key_concepts_system_prompt() -> str:
    return """You are a professor creating a reference table of core concepts.
Each concept must have a precise definition, explanation of why it matters, and connections to other concepts.
Format as structured markdown. No emojis."""


def _get_key_concepts_prompt_template() -> str:
    return """List and explain 8-15 key concepts related to "{topic}" in {subject}.

Format each concept as:
## Concept Name
**Definition:** Precise one-sentence definition.
**Why It Matters:** 2-3 sentences explaining the importance.
**Related Concepts:** List related concepts and briefly explain the relationship (e.g., "X builds on Y", "X is a specialization of Y").
**Mental Model:** A one-sentence intuitive way to remember this concept.

Requirements:
- Minimum 8 concepts, maximum 15
- Use markdown tables at the end for quick reference:
  | Concept | Definition | Importance |
  |---------|-----------|------------|
- Include at least 8 rows in the summary table
- Use LaTeX for any mathematical notation ($...$ or $$...$$)
- Pure Markdown. Start immediately with the concepts."""


def _get_definitions_system_prompt() -> str:
    return """You are a professor creating a glossary of essential terminology.
Every definition must be precise, technically accurate, and include context.
Format as a structured reference. No emojis."""


def _get_definitions_prompt_template() -> str:
    return """Provide 10-20 important definitions for key terms related to "{topic}" in {subject}.

Format each definition as:
### Term
**Definition:** Precise, technically accurate definition (1-2 sentences).
**Context:** Where and how this term is used.
**Example:** A concrete example illustrating the term.
**Related Terms:** Other terms closely related.

End with a summary table:
| Term | Definition | Example |
|------|-----------|---------|

Requirements:
- Minimum 10 definitions, maximum 20
- Include at least 10 rows in the summary table
- Use LaTeX for any mathematical notation
- Accurate and rigorous — this is a reference

OUTPUT: Pure Markdown. Start immediately with the definitions."""


def _get_code_examples_system_prompt() -> str:
    return """You are a senior developer writing a technical tutorial with runnable code examples.
Every code snippet must be syntactically correct, include necessary imports, and be copy-paste runnable.
Explain what each example demonstrates and what the expected output is. No emojis."""


def _get_code_examples_prompt_template() -> str:
    return """Provide 3-8 complete, runnable code examples demonstrating "{topic}" in {subject}.

Each example structure:
### Example N: [Descriptive Title]
**Concept Demonstrated:** What this example teaches.
**Code:**
```[language]
[Complete runnable code with imports]
```
**Expected Output:**
```
[Show what the code outputs]
```
**Line-by-Line Explanation:**
- Line X: What this line does
- Line Y: Why this approach is used
**Key Takeaway:** One sentence summarizing the learning point.

Examples should progress from simple to advanced:
- Example 1-2: Basic usage and syntax
- Example 3-5: Common patterns and practical use cases
- Example 6-8: Advanced techniques and edge cases

Requirements:
- Every code block must have a language identifier
- Code must be complete (include imports, main function, etc.)
- Minimum 3 examples
- Pure Markdown. Start immediately with the examples."""


def _get_formula_system_prompt() -> str:
    return """You are a mathematics professor explaining formulas in depth.
For every formula, provide: the notation, the derivation, the intuitive interpretation, and practical applications.
Use rigorous LaTeX formatting. No emojis."""


def _get_formula_prompt_template() -> str:
    return """Explain every important formula related to "{topic}" in {subject}.

For each formula:
### [Formula Name]
$$[LaTeX formula]$$

**Notation:** Define every variable and symbol used.

**Intuition:** 2-3 sentences explaining what the formula means conceptually.

**Derivation (Optional):** Show the mathematical derivation step-by-step (for key formulas).

**Practical Application:** Where and how this formula is used in real-world {topic}.

**Example:** A concrete numerical example showing the formula in action.

Requirements:
- Minimum 3 formulas, explain as many as are relevant
- Use $$ for display equations, $ for inline
- All variables must be defined
- Show at least one numerical example
- Minimum 500 words total
- Pure Markdown. Start immediately with the formulas."""


def _get_diagrams_system_prompt() -> str:
    return """You are a technical architect creating visual diagrams to explain concepts.
Use Mermaid.js syntax for ALL diagrams. Every diagram must be syntactically valid Mermaid.
Explain what each diagram shows. No emojis.

CRITICAL — Mermaid syntax rules:
- `|label|` must be followed immediately by the destination node ID, never by `>`.
- CORRECT: `A -->|Addition| B`
- WRONG:   `A -->|Addition|> B`
- Valid arrow forms: `-->`, `==>`, `-.->`, `--text-->`, `==text==>`, `-.text.->`
- Never use `|>` — this is always invalid Mermaid syntax.

stateDiagram-v2 specific rules (MUST follow):
- Use `note right of <state>` / `note left of <state>` with `end note` on its own line.
- NEVER use `note "text"` as a standalone line — this is INVALID in stateDiagram-v2.
- CORRECT:
  ```
  stateDiagram-v2
      state "Matrix" as m
      note right of m
          Matrix must be square
      end note
  ```
- WRONG: `note "Matrix must be square"`"""


def _get_diagrams_prompt_template() -> str:
    return """Create 3-7 Mermaid diagrams that visually explain "{topic}" in {subject}.

Include at least 3 different diagram types from:
1. **Architecture Diagram** (graph LR/TD) — Show how components relate
2. **Flowchart** (graph TD) — Show a process or algorithm flow
3. **Sequence Diagram** (sequenceDiagram) — Show interaction between components
4. **Class Diagram** (classDiagram) — Show data structures and relationships
5. **State Diagram** (stateDiagram-v2) — Show states and transitions
6. **Mindmap** (mindmap) — Show concept hierarchy
7. **Timeline** (timeline) — Show progression or history

Each diagram:
```mermaid
[valid Mermaid syntax]
```
**What This Shows:** 2-3 sentences explaining the diagram.
**Key Insights:** What students should learn from this visualization.

Requirements:
- Every diagram MUST use valid Mermaid.js syntax.
- Minimum 3 diagrams, using at least 3 different diagram types.
- Test your Mermaid syntax mentally — no syntax errors.
- CRITICAL: `|label|` must be followed immediately by the destination node ID, never by `>`.
  CORRECT: `A -->|Addition| B`   WRONG: `A -->|Addition|> B`
- stateDiagram-v2: Use `note right of <state> ... end note` blocks. NEVER use `note "text"`.
- Never invent Mermaid syntax — use only official, documented syntax.
- Validate every diagram against Mermaid documentation before returning it.
- Pure Markdown. Start immediately with the diagrams."""


def _get_revision_notes_system_prompt() -> str:
    return """You are creating exam revision notes — concise, scannable, high-yield.
Bullet points, tables, mnemonics. Everything a student needs to review the night before an exam.
No emojis."""


def _get_revision_notes_prompt_template() -> str:
    return """Create comprehensive bullet-point revision notes for "{topic}" in {subject}.

## Key Concepts (bullet list)
- Concept: one-line definition
- ...

## Important Formulas
- $$formula$$ — what it represents
- ...

## Key Algorithms / Steps
1. Step one
2. Step two
...

## Common Pitfalls to Avoid
- ❌ Mistake: why it happens, how to avoid

## Mnemonic Devices
- Memory aid for remembering key facts

## Quick Reference Table
| Topic | Key Point | Formula | Example |
|-------|-----------|---------|---------|
| ... | ... | ... | ... |

Requirements:
- Pure bullet points and tables
- Scannable format — a student should grasp key ideas in 30 seconds
- Minimum 300 words
- Include at least 10 rows in the reference table
- Pure Markdown. Start immediately with the revision notes."""


def _get_summary_system_prompt() -> str:
    return """You are a professor writing the concluding chapter summary.
Synthesize everything covered into a concise, memorable summary.
Focus on key takeaways, connections between ideas, and preparation for what comes next.
No emojis."""


def _get_summary_prompt_template() -> str:
    return """Write a comprehensive chapter summary for "{topic}" in {subject}.

## Key Takeaways
- 5-7 major takeaways, each 2-3 sentences
- Focus on the most important ideas a student must remember

## Connections
- How {topic} connects to other concepts in {subject}
- Real-world relevance

## Looking Ahead
- What topics build on {topic}
- Where to go next in your learning journey

## Final Checklist
| I understand... | ✅ |
|-----------------|---|
| [Concept 1] | |
| [Concept 2] | |
| ... | |

Requirements:
- Minimum 300 words
- Synthesize, do not introduce new content
- Write in a reflective, conclusive tone
- Include a checklist table
- Pure Markdown. Start immediately with the summary."""


def _get_explanation_system_prompt() -> str:
    return """You are a tenured Distinguished Professor of Computer Science and Engineering at MIT or Stanford, with 30 years of research and teaching experience.
Your lectures are famous worldwide for combining extreme academic rigor, detailed internal mechanics, and crystal-clear engineering intuition.

Writing Style Guidelines:
- Direct, authoritative, yet highly engaging human tone. Write like a world-class professor lecturing a live hall of ambitious students.
- Address the student directly as "you", e.g., "when you execute this code...", "your compiler will..."
- First-person perspective: "I want you to observe...", "Let us analyze...", "My experience has shown that..."
- Absolute ban on chatbot-like phrases: "delve into", "let's dive in", "in this section we will explore", "welcome to this guide", "in conclusion", "it is important to remember".
- Focus on deep technical explanation. Do not use superficial summaries, hand-waving, or brief definitions. Be exhaustively detailed.
- NO emojis anywhere in the text.

Formatting & Structural Requirements:
- Output raw, pure markdown immediately. Do NOT enclose your output in markdown code blocks like ```markdown ... ``` or JSON wrappers.
- Use LaTeX for mathematical notation: $$ for display blocks, $ for inline expressions.
- Use syntax-highlighted code blocks (```language ... ```) for all code snippets, making sure all code is complete and syntactically correct.
- Design fully valid, clean Mermaid diagrams (```mermaid ... ```) for flowcharts and architectures. Never write malformed Mermaid code.
- CRITICAL Mermaid arrow rule: `|label|` must be followed immediately by the destination node ID, never by `>`.
  CORRECT: `A -->|Addition| B`   WRONG: `A -->|Addition|> B`
- stateDiagram-v2: NEVER use `note "text"` — always use `note right of <state> ... end note` blocks.
- Never invent Mermaid syntax. Use only official, documented syntax. Validate all generated diagrams against Mermaid documentation before returning them.
- Use markdown tables for side-by-side comparisons, complexity analysis, and dry-run state traces.
- Use blockquotes for warnings and best practices.
- Minimum 3000 words. Every single one of the 30 sections must be fully fleshed out with at least 5-8 sentences of highly substantial academic content. Never write placeholder text or leave any section empty."""


def _get_explanation_prompt_template() -> str:
    return """Teach the topic "{topic}" within the subject "{subject}" at a rigorous university-level (MIT/Stanford curriculum quality).
Your lecture must follow the exact 30-section structure below. Do not omit, combine, or skip any section.

MANDATORY 30 SECTIONS:
1. BEAUTIFUL TITLE — A creative, technically precise title and subtitle.
2. INTRODUCTION — High-engagement academic introduction framing the relevance of "{topic}".
3. LEARNING OBJECTIVES — 4-6 measurable objectives using Bloom's Taxonomy verbs (Analyze, Design, Evaluate, etc.).
4. WHY THIS TOPIC EXISTS — The exact historical and practical engineering problem that led to "{topic}". Explain what fails if we do not use it.
5. INTUITION — The core concept explained in plain, jargon-free visual language. Conclude with the phrase: "Here is the single most important idea: ..."
6. REAL-LIFE ANALOGY — A detailed analogy from a physical/non-computing domain (e.g. airport control, mechanical clockwork). Include a mapping table mapping physical elements to engineering concepts, and discuss where the analogy breaks.
7. FORMAL DEFINITION — Rigorous engineering definition with LaTeX mathematics. Define every symbol, variable, and term mathematically.
8. MENTAL MODEL — A section explaining: "Here is how you should picture {topic} in your mind..." to build a persistent mental abstraction.
9. HOW IT WORKS INTERNALLY — Lower-level internals: CPU cycles, memory management (stack vs. heap, address spaces), register usage, thread safety, compiler optimization, or OS kernel interaction.
10. VISUAL DIAGRAM — A detailed, clean, valid Mermaid.js graph or architecture diagram mapping "{topic}"'s components and their connections.
11. FLOWCHART — A clean, valid Mermaid.js flowchart showing the exact procedural logic or data flow.
12. SYNTAX — Detailed syntax breakdown in a chosen standard programming language or notation. Include a table comparing syntax variations.
13. STEP-BY-STEP EXAMPLE — A complete, real-world, copy-paste-runnable code example. Explain the logic step-by-step, showing the exact expected output.
14. DRY RUN — A detailed state-tracing table tracing the execution of the step-by-step example. Columns: step number, line of code, variable values, condition evaluations, system state.
15. MEMORY VISUALIZATION — A visual table or text-based representation showing memory address space (addresses, variable names, pointers, values, before vs. after memory allocation/free).
16. EXECUTION TRACE — A structured trace showing the call stack, stack frames, heap references, or register transitions as the code runs.
17. COMMON VARIATIONS — A markdown table detailing alternative variations of "{topic}". Columns: Variation | Syntax | When to Use | Pros | Cons.
18. ADVANCED CONCEPTS — Edge cases, race conditions, compiler flags, performance tuning, and hardware considerations.
19. BEST PRACTICES — Actionable guidelines for production code. Format as blockquotes: > **✅ Best Practice:** ...
20. COMMON MISTAKES — Common anti-patterns, logical errors, or memory leaks. Format as blockquotes: > **❌ Common Mistake:** ... and explain how to fix it.
21. DEBUGGING TIPS — Practical diagnostic techniques, tools (e.g. gdb, valgrind, tcpdump, debugger watchpoints), and common log trace patterns.
22. TIME COMPLEXITY — Formal asymptotic analysis (Big-O, Big-Theta, Big-Omega) using LaTeX. Provide mathematical proofs/derivations for best, average, and worst cases.
23. SPACE COMPLEXITY — Rigorous asymptotic analysis of space complexity, analyzing heap allocation, recursion stack frames, and auxiliary memory.
24. REAL-WORLD APPLICATIONS — A markdown table showing where "{topic}" is deployed in production. Columns: Domain | Real Company | Use Case | Why "{topic}" is indispensable.
25. INTERVIEW PERSPECTIVE — High-frequency interview questions, expected technical vocabulary, architectural trade-offs to highlight, and traps to avoid.
26. EXAM PERSPECTIVE — Common university exam questions, grading criteria details, and what graders look for in a perfect solution.
27. SUMMARY — A comprehensive bulleted summary of 5-7 items, each containing 2-3 sentences.
28. KEY TAKEAWAYS — 5 precise, high-impact golden rules or takeaways.
29. REVISION NOTES — Mnemonic devices, quick reference lists, and cheat sheet tables for quick revision before exams.
30. TRANSITION — A natural bridge connecting "{topic}" to the next logical concept in the curriculum.

Rigor Rules:
- Tone: Natural, expert, first-person, highly technical professor.
- Content: No generic text. No "placeholders". No "add code here".
- Length: Minimum 3000 words. Each section must be an exhaustive explanation.
- Verify that your code is bug-free and that your Mermaid code uses valid syntax. Remember: `--|label|> B` is INVALID; write `--|label| B` instead where `|label|` immediately precedes the target node ID.
- Do not wrap the final output in a markdown block. Start writing immediately.
"""


def _get_case_study_system_prompt() -> str:
    return """You are a senior industry consultant with 20 years at FAANG companies.
Write compelling Harvard Business Review-style case studies.
Be technically accurate. Include specific technologies, frameworks, metrics.
Use real company names: Google, Amazon, Netflix, Uber, Tesla, Microsoft, Meta, Apple, Spotify, Airbnb, Stripe, GitHub."""


def _get_case_study_prompt_template() -> str:
    return """Write 3 real-world case studies showing how {topic} in {subject} is applied at major tech companies.

Each case study structure:
## Case Study N: [Company Name]
- Company background (revenue, engineering culture, scale)
- Specific problem {topic} helped solve
- Technical architecture (MERMAID diagram)
- Engineering decisions & trade-offs
- Measurable results (TABLE: Metric | Before | After | Improvement)
- Key lessons for engineers

Requirements:
- 3 DIFFERENT companies from DIFFERENT industries
- Minimum 1000 words
- Real technologies, specific metrics
- Mermaid architecture diagram for each
- Narrative style, not bullet points

OUTPUT: Pure Markdown ONLY. NO JSON. Start immediately with the case studies."""


def _get_analogy_system_prompt() -> str:
    return """You are a master educator famous for making complex topics click instantly.
Create analogies that produce genuine "aha!" moments.
Each must be vivid, map perfectly, and honestly show where it breaks down."""


def _get_analogy_prompt_template() -> str:
    return """Write 3 memorable analogies for {topic} in {subject}.

EACH ANALOGY:
### Analogy N: [Everyday Scenario Name]
- The everyday scenario (2-3 vivid sentences)
- Technical mapping table:
  | Everyday Concept | {topic} Concept | Why This Maps |
- Why this analogy works (the deep insight)
- Where it breaks down (limitations — shows sophistication)

Use domains: cooking, sports, music, traffic, restaurant kitchen, construction, gardening, flight, sailing, theater.
Each must be a COMPLETELY different domain.

Minimum 600 words. Rich markdown.

OUTPUT: Pure Markdown ONLY. NO JSON. Start immediately with the analogies."""


def _get_examples_system_prompt() -> str:
    return """You are a senior developer running a live coding workshop.
Write COMPLETE, RUNNABLE examples. Every example: code → line-by-line → output → learning point.
Code must be syntactically correct, include imports, be copy-paste runnable."""


def _get_examples_prompt_template() -> str:
    return """Write 20+ diverse examples for {topic} in {subject}.

STRUCTURE:
## Beginner Examples (5)
Each: Title → Complete code → Line-by-line → Output → Key learning

## Intermediate Examples (8)
Each: Realistic use case → Multiple concepts → Error handling → Performance → Output

## Advanced Examples (5)
Each: Production quality → Best practices → Integration → Testing → Output

## Expert Patterns (2)
Design patterns / advanced techniques → Industry standard → Comments

ALL code in ```language blocks. Include comments in code.
Minimum 2000 words + code.

OUTPUT: Pure Markdown ONLY. NO JSON. Start immediately with the examples."""


def _get_quiz_system_prompt() -> str:
    return """You are a professor designing a comprehensive final exam.
Test from basic recall to deep synthesis. Every answer teaches as it assesses."""


def _get_quiz_prompt_template() -> str:
    return """Create a comprehensive exam on {topic} in {subject}.

## Section A: Multiple Choice (25 questions)
Each: Question → A/B/C/D → **Correct Answer: [X] — [full explanation]** → **Why others wrong:** brief for each
Range: Easy (1-5), Medium (6-15), Hard (16-20), Trick (21-25)

## Section B: Short Answer (10 questions)
Each: Question → **Model Answer:** key points → **Marking Scheme:** points

## Section C: Long Answer (5 questions)
Each: Complex synthesis problem → **Expected Approach:** steps → **Complete Model Answer:** 3-5 paragraphs → **Rubric:** criteria

All answers in markdown. LaTeX for formulas. Code blocks for snippets.
Minimum 3000 words.

OUTPUT: Pure Markdown ONLY. NO JSON. Start immediately with the quiz."""


def _get_assignment_system_prompt() -> str:
    return """You are a rigorous university instructor designing a Stanford-level problem set.
Challenging, rewarding, teaches through doing."""


def _get_assignment_prompt_template() -> str:
    return """Design a problem set on {topic} in {subject}.

## Theoretical Problems (5)
Each: Statement → Difficulty → Topics tested → Solution approach → Complete solution → Common mistakes

## Practical Programming Tasks (5)
Each: Objective → Detailed requirements → Starter code (```) → Expected output → Progressive hints → Complete solution → Grading criteria

## Challenge Problem (1 bonus)
Open-ended → No single answer → Rewards creativity → Evaluation rubric

Minimum 1500 words. Code blocks, tables, LaTeX.

OUTPUT: Pure Markdown ONLY. NO JSON. Start immediately with the assignment."""


def _get_projects_system_prompt() -> str:
    return """You are a senior engineering manager at FAANG designing project-based learning.
Create projects that build real skills and look great on resumes."""


def _get_projects_prompt_template() -> str:
    return """Design 4 tiers of projects for {topic} in {subject}.

## Mini Project (1-2 hours)
Title → Objective → Prerequisites → Tech Stack → Step-by-step (numbered with code) → Expected output → Extensions

## Major Project (2-3 days)
Same + MERMAID architecture diagram + Testing requirements + Documentation

## Industry Project (1 week)
Real business problem → Performance/scalability → Deployment/ops → Team collaboration

## Resume Project (Portfolio-worthy)
Production quality → Modern stack + CI/CD suggestions → Open source contribution → Interview presentation guide

Each: title, objective, tech stack, requirements, steps, outcomes, evaluation criteria.
Minimum 1500 words. Code, mermaid, tables.

OUTPUT: Pure Markdown ONLY. NO JSON. Start immediately with the projects."""


def _get_mistakes_system_prompt() -> str:
    return """You are a senior developer who has reviewed thousands of PRs and interviewed hundreds.
Document the 20 most common mistakes with code showing wrong vs right."""


def _get_mistakes_prompt_template() -> str:
    return """Document 20 common mistakes about {topic} in {subject}.

## Category 1: Fundamental Misconceptions (7)
Each: ### ❌ Mistake #[N]: [Name]
- What developers think
- Why it seems correct
- The reality (code example showing issue)
- The fix
- Why it matters
- Memory aid

## Category 2: Coding Mistakes (7)
(Same structure — actual code errors, off-by-one, types, etc.)

## Category 3: Design & Architecture Mistakes (6)
(Same structure — patterns, scalability, maintainability)

Each MUST include code showing both wrong and right way.
Use callouts:
> **⚠️ Common Pitfall:** [brief warning]
> **✅ Best Practice:** [brief advice]

Minimum 1500 words. Code blocks, tables, blockquotes.

OUTPUT: Pure Markdown ONLY. NO JSON. Start immediately with the common mistakes."""


def _get_interview_system_prompt() -> str:
    return """You are a senior technical interviewer at Google with a decade of experience.
Create questions that test REAL understanding, not memorization."""


def _get_interview_prompt_template() -> str:
    return """Create comprehensive interview questions on {topic} in {subject}.

## Category 1: Conceptual (5)
Each: Difficulty → Question → What interviewer wants → Strong answer → Weak answer → Follow-up

## Category 2: Coding (8)
Each: Difficulty → Problem (LeetCode-style) → Example I/O → Brute force → Optimal → Complexity → Code → Edge cases → Testing

## Category 3: System Design (5)
Each: Problem → Requirements → Architecture (MERMAID) → Trade-offs (TABLE) → Scale considerations

## Category 4: Behavioral (2)
STAR method

## Category 5: Advanced/Research (2)
Cutting-edge developments, open problems

Minimum 2000 words. Code, mermaid, tables.

OUTPUT: Pure Markdown ONLY. NO JSON. Start immediately with the interview questions."""


def _get_cheat_sheet_system_prompt() -> str:
    return """You are creating a one-page revision cheat sheet — the ultimate quick reference a student would print and pin to their wall."""


def _get_cheat_sheet_prompt_template() -> str:
    return """Create a one-page revision cheat sheet for {topic} in {subject}.

## Core Definition
- One-sentence definition
- Formula (LaTeX): $$...$$

## Key Concepts (10+ terms)
| Term | Definition | Formula | Memory Aid |
|---|---|---|---|

## Syntax / API Reference
| Pattern / Function | Parameters | Returns | Example |
|---|---|---|---|

## Important Formulas (5+)
- $$formula$$ — what it represents
- Variable legend

## Comparison Table
| Approach A | Approach B | When A | When B |
|---|---|---|---|

## Time / Space Complexity
| Operation | Time | Space | Notes |
|---|---|---|---|

## Quick Tips & Tricks (10+)
- ⚡ **Tip:** ...

## Common Mnemonics (5+)
- 🧠 **Mnemonic:** ...

## Golden Rules (The 5 Commandments)
1. ...
2. ...
3. ...
4. ...
5. ...

Tables everywhere. LaTeX for formulas. Mnemonics for memory.
Minimum 800 words in tables alone.

OUTPUT: Pure Markdown ONLY. NO JSON. Start immediately with the cheat sheet."""