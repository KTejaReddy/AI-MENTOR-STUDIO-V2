import asyncio
import logging
import re
import time
from typing import AsyncGenerator, Dict, Any, Optional, List

from app.ai.base import AIProvider, CompletionRequest, Message
from app.ai.key_manager import key_manager
from app.ai.planner_agent import planner_agent
from app.ai.reviewer_agent import reviewer_agent
from app.ai.model_router_config import get_model_for_section

logger = logging.getLogger(__name__)

async def generate_lesson_full(
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
    
    start_time = time.time()
    logger.info(f"Full Lesson Orchestrator starting for {subject} / {topic}")

    # Step 1: Planner Agent decides sections
    plan = planner_agent.plan(subject, topic, difficulty, learning_mode)
    active_sections = [(st, plan.section_titles.get(st, st)) for st in plan.sections]
    
    yield {
        "type": "plan",
        "sections": [st for st, _ in active_sections],
        "section_titles": plan.section_titles,
        "topic_category": plan.topic_category,
        "engine_id": engine_id,
    }

    # Step 2: Generate the entire lesson in one pass
    system_prompt = (
        "You are a world-class university professor. Generate a highly detailed, deeply comprehensive lesson. "
        "You MUST generate the lesson exactly according to the requested section headers. "
        "Use valid Mermaid syntax (```mermaid) for any visual diagrams, charts, or graphs. "
        "Use $ for inline math and $$ for block math. "
        "Do not output markdown code blocks unless it is actual code or mermaid."
    )
    
    section_titles_str = "\n".join([f"## {idx+1}. {title} (Section ID: {st})" for idx, (st, title) in enumerate(active_sections)])
    
    user_prompt = (
        f"Subject: {subject}\n"
        f"Topic: {topic}\n"
        f"Difficulty: {difficulty}\n\n"
        f"Please write the complete lesson. Include exactly these sections with their exact headers:\n"
        f"{section_titles_str}\n\n"
        "Begin the lesson now."
    )
    
    if source_material:
        user_prompt += f"\n\nSource Material Context:\n{source_material}"

    model_id = get_model_for_section("explanation", learning_mode)

    key = await key_manager.acquire_key(model_id)
    if not key:
        yield {
            "type": "error", 
            "content": "No API keys available.",
            "code": "API_KEYS_EXHAUSTED",
            "stage": "provider_init"
        }
        return
        
    provider.set_api_key(key.key)

    request = CompletionRequest(
        messages=[
            Message(role="system", content=system_prompt),
            Message(role="user", content=user_prompt)
        ],
        model=model_id,
        temperature=0.7,
        max_tokens=8192,
        stream=True,
    )

    accumulated_content = {st: "" for st, _ in active_sections}
    # Relaxed header pattern. Matches '## 1. Title (Section ID: st)' OR '## Title'
    header_pattern = re.compile(r"^##\s+(?:\d+\.\s+)?(.*?)(?:\s*\(Section ID:\s*([a-zA-Z0-9]+)\))?$", re.IGNORECASE)

    current_buffer = ""
    active_st = None
    
    # Notify that we are starting the overall generation
    # The frontend expects individual section statuses, so we will mark the first one as generating
    if active_sections:
        active_st = active_sections[0][0]
        yield {
            "type": "section_status",
            "section_type": active_st,
            "status": "generating",
            "title": active_sections[0][1],
            "engine_id": engine_id,
        }

    async def _keep_alive():
        try:
            while True:
                await asyncio.sleep(15)
                yield {"type": "ping", "timestamp": time.time()}
        except asyncio.CancelledError:
            pass

    async def _stream_generator():
        try:
            async for event in provider.complete_stream(request):
                if event.error:
                    logger.error(f"Provider stream error: {event.error}")
                    yield {"_internal_error": True, "code": "STREAM_DISCONNECT", "stage": "llm_streaming", "details": str(event.error)}
                    break
                if event.content:
                    yield event.content
        except Exception as e:
            logger.error(f"Stream exception: {e}")
            yield {"_internal_error": True, "code": "STREAM_EXCEPTION", "stage": "llm_streaming", "details": str(e)}

    keep_alive_task = asyncio.create_task(_keep_alive().__anext__())
    stream_gen = _stream_generator().__aiter__()

    try:
        while True:
            fetch_task = asyncio.create_task(stream_gen.__anext__())
            done, pending = await asyncio.wait(
                [fetch_task, keep_alive_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            if keep_alive_task in done:
                yield keep_alive_task.result()
                keep_alive_task = asyncio.create_task(_keep_alive().__anext__())
                
            if fetch_task in done:
                try:
                    chunk = fetch_task.result()
                    if isinstance(chunk, dict) and chunk.get("_internal_error"):
                        yield {
                            "type": "error",
                            "content": f"Generation interrupted: {chunk.get('details', 'Unknown error')}",
                            "code": chunk.get("code"),
                            "stage": chunk.get("stage")
                        }
                        break
                except StopAsyncIteration:
                    break
                    
                current_buffer += chunk
                
                # Check for line breaks to parse headers
                if "\n" in current_buffer:
                    lines = current_buffer.split("\n")
                    # Keep the last incomplete line in buffer
                    current_buffer = lines.pop()
                    
                    for line in lines:
                        match = header_pattern.match(line.strip())
                        if match:
                            title_group = match.group(1).strip()
                            st_group = match.group(2)
                            
                            # Fallback mapping if Section ID is missing from LLM output
                            new_st = st_group
                            if not new_st:
                                # Fuzzy match title
                                matched = False
                                for pst, ptitle in active_sections:
                                    if ptitle.lower() in title_group.lower():
                                        new_st = pst
                                        matched = True
                                        break
                                if not matched:
                                    # Fallback to current section or next section
                                    new_st = active_st if active_st else active_sections[0][0]
                                    
                            # Close previous section
                            if active_st and new_st != active_st:
                                yield {
                                    "type": "section_done",
                                    "section_type": active_st,
                                    "section_data": {
                                        "type": active_st,
                                        "content": accumulated_content[active_st],
                                    },
                                    "status": "completed",
                                    "engine_id": engine_id,
                                    "elapsed": 0,
                                    "model": model_id,
                                }
                            if new_st != active_st:
                                active_st = new_st
                                yield {
                                    "type": "section_status",
                                    "section_type": active_st,
                                    "status": "generating",
                                    "title": title_group,
                                    "engine_id": engine_id,
                                }
                        else:
                            if active_st:
                                accumulated_content[active_st] += line + "\n"
                                yield {
                                    "type": "section_chunk",
                                    "section_type": active_st,
                                    "content": line + "\n",
                                    "engine_id": engine_id,
                                }
    finally:
        keep_alive_task.cancel()
        key_manager.release_key(key, success=True, latency=time.time()-start_time)

    # Flush remaining buffer
    if active_st and current_buffer:
        accumulated_content[active_st] += current_buffer
        yield {
            "type": "section_chunk",
            "section_type": active_st,
            "content": current_buffer,
            "engine_id": engine_id,
        }
        
    if active_st:
        yield {
            "type": "section_done",
            "section_type": active_st,
            "section_data": {
                "type": active_st,
                "content": accumulated_content[active_st],
            },
            "status": "completed",
            "engine_id": engine_id,
            "elapsed": 0,
            "model": model_id,
        }

    # Step 3: Semantic Reviewer Agent
    logger.info("Running Semantic Reviewer on all generated sections...")
    reviewer_agent.set_provider(provider)
    
    for st, title in active_sections:
        content = accumulated_content[st]
        
        # Graceful reviewer degradation: if anything fails, just keep the section.
        try:
            if not content.strip():
                logger.warning(f"Section {st} is empty, scheduling regeneration")
                async for event in _regenerate_section(provider, subject, topic, difficulty, st, title, engine_id):
                    yield event
                continue
                
            review_result = await reviewer_agent.review_section(st, content, subject, topic, difficulty)
            if not review_result.passed:
                logger.warning(f"Section {st} failed semantic review, regenerating. Issues: {review_result.issues}")
                async for event in _regenerate_section(provider, subject, topic, difficulty, st, title, engine_id, review_result.issues):
                    yield event
        except Exception as e:
            logger.error(f"Semantic reviewer/regen crashed for section {st}: {e}. Degrading gracefully.")
            # Yield section done for original content so frontend doesn't hang
            yield {
                "type": "section_done",
                "section_type": st,
                "section_data": {
                    "type": st,
                    "content": content,
                },
                "status": "completed",
                "engine_id": engine_id,
                "elapsed": 0,
                "model": model_id,
                "quality_score": getattr(review_result, 'score', 1.0) if 'review_result' in locals() else 1.0,
            }

    yield {
        "type": "done",
        "finish_reason": "stop"
    }

async def _regenerate_section(provider, subject, topic, difficulty, st, title, engine_id, issues=None):
    yield {
        "type": "section_retry",
        "section_type": st,
        "engine_id": engine_id
    }
    
    yield {
        "type": "section_status",
        "section_type": st,
        "status": "generating",
        "title": title,
        "engine_id": engine_id,
    }
    
    yield {
        "type": "section_clear",
        "section_type": st,
        "engine_id": engine_id
    }

    prompt = (
        f"You are a university professor. Regenerate the '{title}' section for the topic '{topic}' in '{subject}'.\n"
        "Ensure it is highly detailed, deeply comprehensive, and addresses the following issues:\n"
        f"{chr(10).join(issues) if issues else 'The previous attempt was completely blank.'}\n\n"
        "Use valid Mermaid syntax (```mermaid) for any visual diagrams. Use $ for inline math and $$ for block math.\n"
        "Output ONLY the markdown content for this specific section, without the header."
    )
    
    model_id = get_model_for_section(st, "default")
    key = await key_manager.acquire_key(model_id)
    if not key:
        return
        
    provider.set_api_key(key.key)

    request = CompletionRequest(
        messages=[
            Message(role="user", content=prompt)
        ],
        model=model_id,
        temperature=0.7,
        max_tokens=2048,
        stream=True,
    )
    
    accumulated = ""
    try:
        async for event in provider.complete_stream(request):
            if event.content:
                accumulated += event.content
                yield {
                    "type": "section_chunk",
                    "section_type": st,
                    "content": event.content,
                    "engine_id": engine_id,
                }
    finally:
        key_manager.release_key(key, success=True)
        
    yield {
        "type": "section_done",
        "section_type": st,
        "section_data": {
            "type": st,
            "content": accumulated,
        },
        "status": "completed",
        "engine_id": engine_id,
        "elapsed": 0,
        "model": model_id,
    }
