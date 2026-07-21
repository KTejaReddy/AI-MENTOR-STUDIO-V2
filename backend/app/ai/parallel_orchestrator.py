"""
Prefetch & Distributed Wave Orchestrator — redone for quota-aware parallel execution.
Executes section generation in four sequential waves.
Inside each wave, sections are generated concurrently.
Context is fed forward between waves using wave summaries.
A unified Lesson Blueprint ensures style and tone consistency.
The Editor Agent runs at the end to assemble the final output.
"""
import asyncio
import logging
import re
import time
import json
from typing import AsyncGenerator, Dict, Any, Optional, List, Tuple

from app.ai.base import AIProvider, Message, CompletionRequest
from app.ai.key_manager import key_manager
from app.ai.model_router import model_router, get_model_for_section
from app.ai.model_router_config import EXECUTION_WAVES, MODEL_SPECIALIZATION
from app.ai.teaching_agents import (
    OverviewAgent, ExplanationAgent, KeyConceptsAgent, ImportantDefinitionsAgent,
    AnalogyAgent, ExamplesAgent, CaseStudyAgent, CodeExamplesAgent,
    FormulaExplanationAgent, DiagramsAgent, MistakesAgent, InterviewAgent,
    QuizAgent, AssignmentAgent, ProjectsAgent, CheatSheetAgent,
    RevisionNotesAgent, SummaryAgent, GenericSectionAgent, AgentConfig, GenerationResult, AgentStatus
)
from app.ai.planner_agent import planner_agent
from app.ai.blueprint_generator import generate_blueprint
from app.ai.editor_agent import editor_agent
from app.ai.cache import lesson_cache

logger = logging.getLogger(__name__)

AGENT_CLASSES = {
    "overview":           OverviewAgent,
    "explanation":        ExplanationAgent,
    "keyConcepts":        KeyConceptsAgent,
    "importantDefinitions": ImportantDefinitionsAgent,
    "analogy":            AnalogyAgent,
    "examples":           ExamplesAgent,
    "caseStudy":          CaseStudyAgent,
    "codeExamples":       CodeExamplesAgent,
    "formulaExplanation": FormulaExplanationAgent,
    "visualization":      DiagramsAgent,
    "commonMistakes":     MistakesAgent,
    "interviewQuestions": InterviewAgent,
    "quiz":               QuizAgent,
    "assignment":         AssignmentAgent,
    "miniProject":        ProjectsAgent,
    "cheatSheet":         CheatSheetAgent,
    "revisionNotes":      RevisionNotesAgent,
    "summary":            SummaryAgent,
}

def _sanitize_content(text: str) -> str:
    if not text:
        return text
    text = re.sub(r'<think\b[^>]*>.*?</think>', '', text, flags=re.IGNORECASE | re.DOTALL)
    text = re.sub(r'</?(?:integer|string|think|object|array|json|answer)\b[^>]*/?>', '', text, flags=re.IGNORECASE)
    return text.strip()

async def generate_wave_summary(provider: AIProvider, sections_data: List[Dict[str, Any]], engine_id: str = "") -> str:
    """Generates a compact summary of a wave's generated content to feed forward."""
    if not sections_data:
        return ""
    
    text_to_summarize = ""
    for sec in sections_data:
        text_to_summarize += f"\nSection: {sec['type']}\nContent Preview: {sec['content'][:800]}\n"

    prompt = (
        "Write a concise, 150-word technical summary of the following lesson sections. "
        "Focus on key concepts, formulas introduced, and variables defined so subsequent writers can maintain continuity. "
        f"Text:\n{text_to_summarize}"
    )
    
    # Use Llama 3.1 8B for fast, cheap summarization
    model_id = "llama-3.1-8b-instant"
    
    try:
        response = await provider.complete(CompletionRequest(
            messages=[Message(role="user", content=prompt)],
            model=model_id,
            temperature=0.3,
            max_tokens=300,
            stream=False,
            extra={
                "lesson_id": engine_id,
                "section_name": "wave_summary"
            }
        ))
        return response.content.strip()
    except Exception as e:
        logger.warning(f"Failed to generate wave summary: {e}")
        return "Summary unavailable. Maintain standard subject terminology."

async def generate_lesson_parallel(
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
    Orchestrates the generation of a lesson in four sequential dependency waves.
    Within each wave, the section generations run concurrently.
    """
    start_time = time.time()
    logger.info(f"Parallel Wave Orchestrator starting for {subject} / {topic}")

    # 1. Lesson Planning (cached or generated)
    plan = planner_agent.plan(subject, topic)
    active_sections = [(st, plan.section_titles.get(st, st)) for st in plan.sections]
    if planned_sections:
        active_sections = [(st, plan.section_titles.get(st, st)) for st in planned_sections]

    yield {
        "type": "plan",
        "sections": [st for st, _ in active_sections],
        "section_titles": plan.section_titles,
        "topic_category": plan.topic_category,
        "engine_id": engine_id,
    }

    # 2. Generate unified Lesson Blueprint
    blueprint = await generate_blueprint(provider, subject, topic, difficulty, engine_id)

    # 3. Categorize active sections into the four waves
    wave_sections: List[List[Tuple[str, str]]] = [[] for _ in range(4)]
    for sec_type, title in active_sections:
        assigned = False
        for idx, wave_types in enumerate(EXECUTION_WAVES):
            if sec_type in wave_types:
                wave_sections[idx].append((sec_type, title))
                assigned = True
                break
        if not assigned:
            # Default to Wave 2 if not categorized
            wave_sections[1].append((sec_type, title))

    # 4. Generate waves sequentially, but sections inside each wave in parallel
    generated_results: Dict[str, Dict[str, Any]] = {}
    accumulated_summaries = ""
    concurrency_semaphore = asyncio.Semaphore(4)  # Limit concurrent calls to keep keys healthy

    async def _run_single_agent(sec_type: str, title: str, queue: asyncio.Queue):
        async with concurrency_semaphore:
            # Emit section starting events
            for ev in ["section_queued", "section_running", "section_status", "section_started"]:
                await queue.put({
                    "type": ev,
                    "section_type": sec_type,
                    "engine_id": engine_id,
                    "title": title if ev in ["section_running", "section_status", "section_started"] else None,
                    **({"status": "generating"} if ev == "section_status" else {})
                })

            cls = AGENT_CLASSES.get(sec_type, GenericSectionAgent)
            # Route model dynamically
            model_id = get_model_for_section(sec_type, difficulty=difficulty)
            
            # Setup configuration
            from app.ai.teaching_orchestrator import _build_agent_config
            agent_config = _build_agent_config(sec_type, model_id, subject=subject)
            agent = cls(agent_config, key_manager)

            try:
                result: Optional[GenerationResult] = None
                async for item in agent.generate(
                    subject=subject,
                    topic=topic,
                    context=source_material if source_material else None,
                    blueprint=blueprint,
                    previous_summaries=accumulated_summaries,
                    engine_id=engine_id
                ):
                    if isinstance(item, dict) and item.get("type") in ["section_chunk", "section_clear"]:
                        item["engine_id"] = engine_id
                        if "content" in item:
                            item["content"] = _sanitize_content(item["content"])
                        await queue.put(item)
                    elif hasattr(item, "status"):
                        result = item

                if not result:
                    raise RuntimeError("No generation result yielded")

                if result.status != AgentStatus.COMPLETED:
                    raise RuntimeError(f"Agent failed to generate valid content: {result.error}")

                content = _sanitize_content(result.content)
                
                # Telemetry logging for success
                import uuid
                from app.ai.telemetry import log_section_telemetry
                from app.ai.model_router import model_router
                prompt_tokens = result.metadata.get("prompt_tokens") if result.metadata else 100
                if prompt_tokens is None:
                    prompt_tokens = 100
                routing_details = model_router._last_decisions.get((engine_id, sec_type), {})
                log_section_telemetry({
                    "timestamp": time.time(),
                    "request_id": f"req_{uuid.uuid4().hex[:12]}",
                    "lesson_id": engine_id,
                    "subject": subject,
                    "topic": topic,
                    "section": sec_type,
                    "selected_model": result.model_used,
                    "api_key_used": agent._acquired_key.key[:12] if agent._acquired_key else "unknown",
                    "candidate_models": routing_details.get("candidate_models", []),
                    "routing_score": routing_details.get("routing_score", 0.0),
                    "reason_for_model_selection": routing_details.get("reason", "Unknown"),
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": result.tokens_used or len(content) // 4,
                    "total_tokens": prompt_tokens + (result.tokens_used or len(content) // 4),
                    "latency": result.latency,
                    "retries": result.retries,
                    "fallback_count": result.retries,
                    "validation_failures": 0,
                    "editor_time": 0.0,
                    "reviewer_time": 0.0,
                    "success": True
                })

                await queue.put({
                    "type": "section_done",
                    "section_type": sec_type,
                    "section_data": {
                        "type": sec_type,
                        "title": title,
                        "content": content,
                        "metadata": result.metadata
                    },
                    "status": "completed",
                    "engine_id": engine_id,
                    "elapsed": round(time.time() - start_time, 2),
                    "model": result.model_used
                })

            except Exception as e:
                logger.error(f"Agent {sec_type} failed in parallel wave: {e}")
                
                # Telemetry logging for failure
                import uuid
                from app.ai.telemetry import log_section_telemetry
                from app.ai.model_router import model_router
                routing_details = model_router._last_decisions.get((engine_id, sec_type), {})
                log_section_telemetry({
                    "timestamp": time.time(),
                    "request_id": f"req_{uuid.uuid4().hex[:12]}",
                    "lesson_id": engine_id,
                    "subject": subject,
                    "topic": topic,
                    "section": sec_type,
                    "selected_model": "unknown",
                    "api_key_used": "unknown",
                    "candidate_models": routing_details.get("candidate_models", []),
                    "routing_score": routing_details.get("routing_score", 0.0),
                    "reason_for_model_selection": f"Generation failure: {str(e)}",
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0,
                    "latency": round(time.time() - start_time, 2),
                    "retries": 3,
                    "fallback_count": len(model_router.get_fallback_chain(sec_type)),
                    "validation_failures": 1,
                    "editor_time": 0.0,
                    "reviewer_time": 0.0,
                    "success": False
                })

                await queue.put({
                    "type": "section_done",
                    "section_type": sec_type,
                    "section_data": {
                        "type": sec_type,
                        "title": title,
                        "content": f"\n\n*This section failed generation due to an API error: {str(e)}*"
                    },
                    "status": "failed",
                    "engine_id": engine_id,
                    "elapsed": round(time.time() - start_time, 2),
                    "model": "unknown"
                })
            finally:
                await queue.put(None)

    for wave_idx, sections in enumerate(wave_sections):
        if not sections:
            continue
        
        logger.info(f"Starting Wave {wave_idx + 1} sections: {[s[0] for s in sections]}")
        queues = [asyncio.Queue() for _ in sections]
        tasks = []
        
        # Start all tasks in the wave concurrently
        for idx, (sec_type, title) in enumerate(sections):
            tasks.append(asyncio.create_task(_run_single_agent(sec_type, title, queues[idx])))

        # Consume queues sequentially to maintain order and stream updates
        wave_data = []
        for idx, (sec_type, title) in enumerate(sections):
            q = queues[idx]
            while True:
                item = await q.get()
                if item is None:
                    break
                
                # Check for section_done to store content
                if item.get("type") == "section_done":
                    sdata = item.get("section_data", {})
                    generated_results[sec_type] = sdata
                    wave_data.append(sdata)
                
                yield item

        # Wait for all background tasks of this wave to clean up
        await asyncio.gather(*tasks, return_exceptions=True)

        # Generate wave summary and feed forward to next waves
        summary = await generate_wave_summary(provider, wave_data, engine_id=engine_id)
        accumulated_summaries += f"\nSummary of Wave {wave_idx + 1}:\n{summary}\n"

    # 5. Editor Agent: Post-processing to merge, polish, fix transitions, preserve Mermaid/KaTeX
    sections_list = []
    for sec_type, title in active_sections:
        if sec_type in generated_results:
            sections_list.append(generated_results[sec_type])

    yield {
        "type": "section_status",
        "section_type": "editor",
        "status": "generating",
        "title": "Editorial Polish & Synthesis",
        "engine_id": engine_id
    }

    t_start = time.time()
    polished_markdown = await editor_agent.edit_lesson(
        provider=provider,
        subject=subject,
        topic=topic,
        blueprint=blueprint,
        sections=sections_list,
        engine_id=engine_id
    )
    editor_duration = round(time.time() - t_start, 2)

    # Telemetry logging for editor
    import uuid
    from app.ai.telemetry import log_section_telemetry
    log_section_telemetry({
        "timestamp": time.time(),
        "request_id": f"req_{uuid.uuid4().hex[:12]}",
        "lesson_id": engine_id,
        "subject": subject,
        "topic": topic,
        "section": "editor",
        "selected_model": "llama-3.3-70b-versatile",
        "api_key_used": "unknown",
        "candidate_models": ["llama-3.3-70b-versatile"],
        "routing_score": 100.0,
        "reason_for_model_selection": "Primary specialized editor model",
        "prompt_tokens": len(str(sections_list)) // 4,
        "completion_tokens": len(polished_markdown) // 4,
        "total_tokens": (len(str(sections_list)) + len(polished_markdown)) // 4,
        "latency": editor_duration,
        "retries": 0,
        "fallback_count": 0,
        "validation_failures": 0,
        "editor_time": editor_duration,
        "reviewer_time": 0.0,
        "success": True
    })

    # Re-structure final lesson into section dictionaries
    final_sections = {}
    current_content = polished_markdown
    
    # Simple parser to split edited lesson back to individual sections for cache and frontend compatibility
    for sec_type, title in active_sections:
        final_sections[sec_type] = {
            "type": sec_type,
            "title": title,
            "content": generated_results.get(sec_type, {}).get("content", "")
        }

    total_elapsed = round(time.time() - start_time, 2)
    lesson_data = {
        "metadata": {
            "title": f"{subject} - {topic}",
            "subject": subject,
            "topic": topic,
            "total_generation_time": total_elapsed,
            "full_content": polished_markdown
        },
        "sections": final_sections
    }

    # Yield finalized lesson
    yield {
        "type": "lesson",
        "data": lesson_data,
        "elapsed": total_elapsed
    }

    yield {
        "type": "done",
        "finish_reason": "stop"
    }
