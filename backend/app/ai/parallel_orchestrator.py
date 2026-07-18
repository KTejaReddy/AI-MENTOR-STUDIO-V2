"""
Prefetch Orchestrator — 2-ahead parallel section generation with continuous streaming.

Execution model:
  Section N generates and streams tokens immediately.
  Section N+1 starts generating in the background while section N streams.
  When section N finishes, section N+1's content is already partially (or fully) generated.
  Section N+2 starts when section N+1 begins yielding (i.e., 2 ahead max).
  This creates zero-gap transitions between sections, with continuous token output.
"""
import asyncio
import logging
import re
import time
from typing import AsyncGenerator, Dict, Any, Optional, List

from app.ai.base import AIProvider
from app.ai.key_manager import key_manager
from app.ai.model_router import model_router
from app.ai.model_router_config import SECTION_ROUTING
from app.ai.teaching_agents import (
    ExplanationAgent, CaseStudyAgent, AnalogyAgent, ExamplesAgent,
    QuizAgent, AssignmentAgent, ProjectsAgent, MistakesAgent,
    InterviewAgent, CheatSheetAgent, OverviewAgent, KeyConceptsAgent,
    ImportantDefinitionsAgent, CodeExamplesAgent, FormulaExplanationAgent,
    DiagramsAgent, MiniProjectAgent, RevisionNotesAgent, SummaryAgent,
    GenericSectionAgent, AgentConfig, GenerationResult,
)
from app.ai.planner_agent import planner_agent
from app.ai.cache import lesson_cache
from app.ai.teaching_orchestrator import _build_agent_config

logger = logging.getLogger(__name__)

_planner_cache: Dict[str, Any] = {}
_PLANNER_CACHE_TTL = 300


def _get_plan(subject: str, topic: str, difficulty: str, learning_mode: str) -> Any:
    import time as _time
    key = f"{subject}|{topic}|{difficulty}|{learning_mode}"
    entry = _planner_cache.get(key)
    if entry:
        cached_time, plan = entry
        if _time.time() - cached_time < _PLANNER_CACHE_TTL:
            return plan
    plan = planner_agent.plan(subject, topic, difficulty, learning_mode)
    _planner_cache[key] = (_time.time(), plan)
    if len(_planner_cache) > 200:
        oldest = min(_planner_cache.items(), key=lambda x: x[1][0])
        del _planner_cache[oldest[0]]
    return plan


_XML_TAGS_PATTERN = re.compile(
    r'</?(?:integer|string|think|object|array|json|answer)\b[^>]*/?>',
    re.IGNORECASE,
)
_THINK_BLOCK_PATTERN = re.compile(
    r'<think\b[^>]*>.*?</think>',
    re.IGNORECASE | re.DOTALL,
)


def _sanitize_content(text: str) -> str:
    if not text:
        return text
    text = _THINK_BLOCK_PATTERN.sub('', text)
    text = _XML_TAGS_PATTERN.sub('', text)
    return text



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
    "diagrams":           DiagramsAgent,
    "commonMistakes":     MistakesAgent,
    "interviewQuestions": InterviewAgent,
    "quiz":               QuizAgent,
    "assignment":         AssignmentAgent,
    "miniProject":        ProjectsAgent,
    "cheatSheet":         CheatSheetAgent,
    "revisionNotes":      RevisionNotesAgent,
    "summary":            SummaryAgent,
}

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
    Generate a full lesson with 2-ahead prefetch parallelism.

    Section N streams tokens while section N+1 generates in the background.
    Section N+2 starts when N+1 begins yielding. Max 2 sections ahead.
    Transitions between sections are instant — no waiting.
    """
    start_time = time.time()
    section_times: List[float] = []
    first_section_time: Optional[float] = None

    logger.info(
        "PrefetchOrchestrator: START %s / %s [%s/%s]",
        subject, topic, difficulty, learning_mode
    )

    # ── Step 1: Plan (cached) ─────────────────────────────────────────────────
    plan = _get_plan(subject, topic, difficulty, learning_mode)
    active_sections = [(st, plan.section_titles.get(st, st)) for st in plan.sections]
    learning_note = plan.learning_note

    logger.info(
        "PlannerAgent: %d sections → %s",
        len(active_sections),
        [st for st, _ in active_sections],
    )

    planned_set = {st for st, _ in active_sections}
    results: Dict[str, Dict[str, Any]] = {}
    section_status: Dict[str, str] = {st: "waiting" for st, _ in active_sections}

    qa_report_data: Dict[str, Any] = {
        "metadata": {
            "subject": subject,
            "topic": topic,
            "difficulty": difficulty,
            "learning_mode": learning_mode,
            "start_time": start_time,
            "generation_mode": "prefetch",
        },
        "sections": {st: {"status": "planned"} for st, _ in active_sections},
        "frontend_events": [],
    }

    # Emit plan immediately
    yield {
        "type": "plan",
        "sections": [st for st, _ in active_sections],
        "section_titles": plan.section_titles,
        "topic_category": plan.topic_category,
        "engine_id": engine_id,
    }

    # ── Step 2: Build configs for every planned section ───────────────────────
    _section_order = active_sections
    if not _section_order:
        yield {"type": "done", "finish_reason": "no_sections", "elapsed": 0}
        return

    section_configs: List[tuple] = []
    for sec_type, stitle in _section_order:
        cls = AGENT_CLASSES.get(sec_type, GenericSectionAgent)
        model_id = model_router.route(
            sec_type, learning_mode=learning_mode,
            difficulty=difficulty, subject=subject, topic=topic,
        )
        cfg = _build_agent_config(sec_type, model_id, learning_mode)
        section_configs.append((sec_type, stitle, cls, model_id, cfg))

    n = len(section_configs)

    # ── Step 3: Per-section async queues + background tasks ───────────────────
    queues: List[asyncio.Queue] = [asyncio.Queue() for _ in range(n)]
    tasks: List[Optional[asyncio.Task]] = [None] * n

    async def _run_section(idx: int) -> None:
        """Background worker task: generate section idx and stream events."""
        sec_type, stitle, agent_class, model_id, agent_config = section_configs[idx]
        queue = queues[idx]

        # Build combined context once
        combined_context = ""
        if learning_note:
            combined_context += f"Learning Note / Approach:\n{learning_note}\n\n"
        if source_material:
            if is_document:
                combined_context += f"DOCUMENT REFERENCE MATERIAL:\n{source_material}\n\n"
                combined_context += (
                    "IMPORTANT DOCUMENT TEACHING RULES:\n"
                    "- The provided document is STRICTLY for reference material.\n"
                    "- Teach the subject like a university professor.\n"
                    "- Expand beyond the document where useful.\n"
                )
            else:
                combined_context += f"Source Material to Reference:\n{source_material}\n"
        final_context = combined_context if combined_context else None

        # Emit start events (batched)
        for ev_type in ("section_queued", "section_running", "section_status", "section_started"):
            await queue.put({
                "type": ev_type,
                "section_type": sec_type,
                "engine_id": engine_id,
                "title": stitle if ev_type in ("section_running", "section_status", "section_started") else None,
                **({"status": "generating"} if ev_type == "section_status" else {}),
            })

        try:
            agent = agent_class(agent_config, key_manager)
            result: Optional[GenerationResult] = None

            async for item in agent.generate(
                subject=subject, topic=topic,
                difficulty=difficulty, learning_mode=learning_mode,
                context=final_context,
            ):
                if isinstance(item, dict) and item.get("type") in ("section_chunk", "section_clear"):
                    item["engine_id"] = engine_id
                    if "content" in item:
                        item["content"] = _sanitize_content(item["content"])
                    await queue.put(item)
                elif hasattr(item, "status"):
                    result = item

            if result is None:
                raise RuntimeError(f"Agent {sec_type} did not yield a result")

            section_elapsed = round(time.time() - start_time, 2)
            await queue.put({
                "type": "section_done",
                "section_type": sec_type,
                "section_data": {
                    "type": sec_type,
                    "title": stitle,
                    "content": _sanitize_content(result.content),
                    "metadata": result.metadata,
                },
                "status": result.status,
                "engine_id": engine_id,
                "elapsed": section_elapsed,
                "model": result.model_used,
                "quality_score": result.quality_score,
                "retries": result.retries,
            })

        except Exception as e:
            logger.error("Prefetch agent %s failed: %s", sec_type, e, exc_info=True)
            section_elapsed = round(time.time() - start_time, 2)
            await queue.put({
                "type": "section_done",
                "section_type": sec_type,
                "section_data": {
                    "type": sec_type,
                    "title": stitle,
                    "content": f"*Could not generate this section: {str(e)[:120]}*",
                },
                "status": "failed",
                "engine_id": engine_id,
                "elapsed": section_elapsed,
                "model": "unknown",
            })
        finally:
            await queue.put(None)  # sentinel — no more items

    # ── Step 4: Start sections using Worker Pool ───────────────
    CONCURRENCY_LIMIT = 4
    worker_semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

    async def _worker_run(idx: int):
        async with worker_semaphore:
            await _run_section(idx)

    for idx in range(n):
        tasks[idx] = asyncio.create_task(_worker_run(idx))

    # ── Step 5: Process sections sequentially via Ordered Release Buffer ──────
    timeout_seconds = 120.0

    for idx in range(n):
        sec_type, stitle, *_ = section_configs[idx]

        # Read from current section's queue until sentinel
        # Since all tasks run in parallel, future queues act as our in-memory buffer.
        queue = queues[idx]

        total_wait_time = 0.0
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=15.0)
            except asyncio.TimeoutError:
                total_wait_time += 15.0
                if total_wait_time >= timeout_seconds:
                    if tasks[idx] and not tasks[idx].done():
                        tasks[idx].cancel()
                    yield {
                        "type": "section_done",
                        "section_type": sec_type,
                        "section_data": {
                            "type": sec_type, "title": stitle,
                            "content": "*Section generation timed out*",
                        },
                        "status": "failed",
                        "engine_id": engine_id,
                        "elapsed": round(time.time() - start_time, 2),
                        "model": "unknown",
                    }
                    section_status[sec_type] = "failed"
                    break
                else:
                    yield {"type": "ping", "timestamp": time.time()}
                    continue

            if item is None:
                break  # sentinel — section complete

            # Track results when section finishes
            if isinstance(item, dict) and item.get("type") == "section_done":
                st = item.get("section_type", sec_type)
                section_status[st] = item.get("status", "completed")
                sdata = item.get("section_data", {})
                if sdata:
                    results[st] = {
                        "content": sdata.get("content", ""),
                        "metadata": sdata.get("metadata", {}),
                    }
                if first_section_time is None:
                    first_section_time = item.get("elapsed", 0)
                section_times.append(item.get("elapsed", 0))

                qa_report_data["sections"][st].update({
                    "status": item.get("status", "completed"),
                    "model": item.get("model", "unknown"),
                    "elapsed": item.get("elapsed", 0),
                })
                qa_report_data["frontend_events"].append({
                    "type": "section_done",
                    "section_type": st,
                    "status": item.get("status", "completed"),
                })

            yield item

        # Clean up current task
        if tasks[idx] and not tasks[idx].done():
            tasks[idx].cancel()
            try:
                await tasks[idx]
            except Exception:
                pass

    # ── Step 6: Assemble final lesson ─────────────────────────────────────────
    total_elapsed = round(time.time() - start_time, 2)

    avg_time_per_section = 0.0
    if section_times:
        avg_time_per_section = sum(section_times) / len(section_times)

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
            "generation_mode": "prefetch",
            "time_to_first_section": first_section_time,
            "avg_time_per_section": round(avg_time_per_section, 2),
        },
        "sections": {},
        "resources": {"keyTerms": [], "furtherReading": []},
    }

    for st, stitle in active_sections:
        if st in results:
            section_data = results[st]
            lesson["sections"][st] = {
                "type": st,
                "title": stitle,
                "content": section_data.get("content", "*Section not generated*"),
                "metadata": section_data.get("metadata", {}),
            }
        else:
            lesson["sections"][st] = {
                "type": st,
                "title": stitle,
                "content": "*Section not generated*",
            }

    lesson_cache.set(subject, topic, difficulty, learning_mode, lesson)

    completed_count = sum(1 for st in section_status.values() if st == "completed")
    
    from app.ai.health_cache import health_cache
    skips = health_cache.get_skips()
    
    logger.info(
        "PrefetchOrchestrator: DONE %s / %s in %.1fs (%d/%d sections completed, first: %.1fs, avg: %.1fs, cache skips: %d)",
        subject, topic, total_elapsed, completed_count, len(active_sections),
        first_section_time or 0, avg_time_per_section, skips
    )

    yield {
        "type": "done",
        "finish_reason": "stop",
        "elapsed": total_elapsed,
    }

    qa_report_data["metadata"]["total_elapsed"] = total_elapsed
    qa_report_data["metadata"]["completed_count"] = completed_count
    qa_report_data["metadata"]["expected_count"] = len(active_sections)
    qa_report_data["metadata"]["time_to_first_section"] = first_section_time
    qa_report_data["metadata"]["avg_time_per_section"] = round(avg_time_per_section, 2)
    qa_report_data["metadata"]["cooldown_skips"] = skips

    try:
        import json
        import os
        qa_file = os.path.join(os.getcwd(), "qa_report.json")
        with open(qa_file, "w") as f:
            json.dump(qa_report_data, f, indent=2)
        logger.info("QA report written to %s", qa_file)
    except Exception as e:
        logger.error("Failed to write QA report: %s", e)

    yield {
        "type": "lesson",
        "data": lesson,
        "repaired": False,
        "cached": False,
        "model": "prefetch-multi-agent",
        "elapsed": total_elapsed,
    }
