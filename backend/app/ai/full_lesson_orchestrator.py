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

def validate_quiz(content: str) -> List[str]:
    issues = []
    # Count questions
    q_count = len(re.findall(r"(?i)\*\*Question|Question\s*\d*:", content))
    if q_count != 10:
        issues.append(f"Found {q_count} questions instead of exactly 10.")
    
    # Check for options A, B, C, D
    for opt in ['A', 'B', 'C', 'D']:
        opt_count = len(re.findall(rf"(?i)\bOption\s+{opt}\b|\b{opt}\)", content))
        if opt_count < 10:
            issues.append(f"Missing Option {opt} in some questions (found {opt_count}/10).")
            
    # Check for Correct Answer
    ans_count = len(re.findall(r"(?i)Correct Answer", content))
    if ans_count < 10:
        issues.append(f"Missing 'Correct Answer' in some questions (found {ans_count}/10).")
        
    # Check for Explanation
    exp_count = len(re.findall(r"(?i)Explanation", content))
    if exp_count < 10:
        issues.append(f"Missing 'Explanation' in some questions (found {exp_count}/10).")
        
    return issues


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
    
    if planned_sections:
        active_sections = [(st, plan.section_titles.get(st, st.capitalize())) for st in planned_sections]
    else:
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
        "The complete lesson MUST be approximately 2500-3500 words in total length. "
        "You MUST meet these minimum requirements for sections if they are present:\n"
        "- Overview: ≥ 250 words.\n"
        "- Explanation: ≥ 600 words.\n"
        "- Formulae: Must include step-by-step derivations where appropriate.\n"
        "- Examples: Provide at least three complex, worked-out examples.\n"
        "- Practice Problems: Provide multiple problems with increasing difficulty.\n"
        "- Summary: Provide a substantial, comprehensive summary.\n"
        "Use valid Mermaid syntax (```mermaid) for any visual diagrams, charts, or graphs. "
        "Use $ for inline math and $$ for block math. "
        "Do not output markdown code blocks unless it is actual code or mermaid."
    )
    
    # Build strict quiz formatting rules if 'quiz' is in planned sections
    has_quiz = any(st == "quiz" for st, _ in active_sections)
    quiz_instructions = ""
    if has_quiz:
        quiz_instructions = (
            "\nQUIZ RULES: You must generate EXACTLY 10 university-style Multiple Choice Questions.\n"
            "DO NOT use <think> tags or output any reasoning. Output ONLY the final structured quiz.\n"
            "Format EACH question exactly as follows:\n"
            "Question: [Text]\n"
            "Option A: [Text]\n"
            "Option B: [Text]\n"
            "Option C: [Text]\n"
            "Option D: [Text]\n"
            "Correct Answer: [Option Letter]\n"
            "Explanation: [Detailed explanation]\n"
            "Subject-specific constraint: If programming, include code snippets in the question. "
            "If math, include equations. If electronics, include circuit descriptions.\n"
        )

    # Build Mermaid templates based on subject
    subject_lower = subject.lower()
    mermaid_templates = ""
    if "program" in subject_lower or "comput" in subject_lower:
        mermaid_templates = (
            "\nMERMAID TEMPLATES (Programming): You MUST use these exact structures and only populate placeholders:\n"
            "1. Flowchart: `graph TD; A[\"Start\"] --> B[\"Process\"]; B --> C[\"End\"];`\n"
            "2. Tree: `graph TD; Root[\"Root\"] --> C1[\"Child1\"]; Root --> C2[\"Child2\"];`\n"
            "3. Graph: `graph LR; N1[\"Node1\"] <--> N2[\"Node2\"];`\n"
        )
    elif "math" in subject_lower:
        mermaid_templates = (
            "\nMERMAID TEMPLATES (Mathematics): You MUST use these exact structures and only populate placeholders:\n"
            "1. Process Flow: `graph TD; S1[\"Step1\"] --> S2[\"Step2\"];`\n"
        )
    elif "electronic" in subject_lower or "circuit" in subject_lower:
        mermaid_templates = (
            "\nMERMAID TEMPLATES (Electronics): You MUST use these exact structures and only populate placeholders:\n"
            "1. Logic Gate: `graph LR; A[\"Input\"] --> B((\"AND\")); C[\"Input\"] --> B; B --> D[\"Output\"];`\n"
            "2. Block Diagram: `graph TD; MCU[\"MCU\"] --> S[\"Sensor\"];`\n"
            "3. State Machine: `stateDiagram-v2; [*] --> Idle; Idle --> Active;`\n"
        )
    elif "network" in subject_lower:
        mermaid_templates = (
            "\nMERMAID TEMPLATES (Networking): You MUST use these exact structures and only populate placeholders:\n"
            "1. Topology: `graph LR; R[\"Router\"] --> S[\"Switch\"]; S --> P[\"PC\"];`\n"
            "2. Packet Flow: `sequenceDiagram; Client->>Server: SYN; Server-->>Client: SYN-ACK;`\n"
        )
    else:
        mermaid_templates = "\nMERMAID RULES: Do not use HTML tags in node labels. Always quote node labels containing special characters (e.g. A[\"Label (Info)\"]).\n"
        
    system_prompt += quiz_instructions + mermaid_templates
    
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

    # Let the provider handle key management and failover automatically.
    # We no longer explicitly acquire and lock a single key here.
    
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
    # Relaxed header pattern. Matches any Markdown heading 1-6 levels deep, optionally surrounded by bolding.
    header_pattern = re.compile(r"^\s*(?:\*|_)*#+\s+(?:\*|_)*(.*)$", re.IGNORECASE)

    current_buffer = ""
    active_st = None
    
    async def validate_mermaid(content: str) -> str:
        """Strip hopelessly invalid mermaid diagrams and regenerate them."""
        parts = []
        last_end = 0
        for match in re.finditer(r"```mermaid\s+(.*?)```", content, flags=re.DOTALL):
            parts.append(content[last_end:match.start()])
            block = match.group(1)
            # Basic validation: if there's raw HTML tags in nodes, it's likely invalid.
            if "<" in block and ">" in block:
                logger.warning("Stripped invalid mermaid diagram containing HTML tags. Regenerating...")
                prompt = (
                    "Regenerate ONLY the Mermaid diagram for this context. "
                    "Use valid Mermaid syntax. DO NOT use HTML tags in node labels. Quote special characters.\n"
                    f"Context: {topic}\n"
                    f"Invalid diagram:\n```mermaid\n{block}\n```"
                )
                req = CompletionRequest(
                    messages=[Message(role="user", content=prompt)],
                    model=model_id,
                    temperature=0.4,
                    max_tokens=512,
                )
                try:
                    # Quick synchronous-like request to regenerate diagram
                    # Uses the same key as the stream since we use provider
                    res = await provider.complete(req)
                    new_block = res.choices[0].message.content if res.choices else ""
                    if "```mermaid" not in new_block:
                        new_block = f"```mermaid\n{new_block}\n```"
                    parts.append(new_block)
                except Exception as e:
                    logger.error(f"Failed to regenerate mermaid: {e}")
                    parts.append("\n*Diagram omitted due to invalid syntax*\n")
            else:
                parts.append(match.group(0))
            last_end = match.end()
            
        parts.append(content[last_end:])
        return "".join(parts)
    
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
            in_think = False
            think_buffer = ""
            async for event in provider.complete_stream(request):
                if event.error:
                    logger.error(f"Provider stream error: {event.error}")
                    yield {"_internal_error": True, "code": "STREAM_DISCONNECT", "stage": "llm_streaming", "details": str(event.error)}
                    break
                if event.content:
                    chunk = event.content
                    think_buffer += chunk
                    
                    while think_buffer:
                        if not in_think:
                            start_idx = think_buffer.find("<think>")
                            if start_idx != -1:
                                if start_idx > 0:
                                    yield think_buffer[:start_idx]
                                in_think = True
                                think_buffer = think_buffer[start_idx + 7:]
                            else:
                                # Safe to yield everything except the last 6 chars (in case of partial <think>)
                                if len(think_buffer) < 7:
                                    break
                                yield think_buffer[:-6]
                                think_buffer = think_buffer[-6:]
                                break
                        else:
                            end_idx = think_buffer.find("</think>")
                            if end_idx != -1:
                                in_think = False
                                think_buffer = think_buffer[end_idx + 8:]
                            else:
                                # We are inside <think>, discard everything
                                think_buffer = ""
                                break
            
            # Flush remaining buffer at the end of the stream
            if think_buffer and not in_think:
                # If there's a partial match that never completed, just yield it
                yield think_buffer
        except Exception as e:
            logger.error(f"Stream exception: {e}")
            yield {"_internal_error": True, "code": "STREAM_EXCEPTION", "stage": "llm_streaming", "details": str(e)}

    async def get_next(gen):
        try:
            return await gen.__anext__()
        except StopAsyncIteration:
            return None

    keep_alive_task = asyncio.create_task(get_next(_keep_alive()))
    stream_gen = _stream_generator().__aiter__()
    fetch_task = asyncio.create_task(get_next(stream_gen))
    
    stream_successful = False

    try:
        while True:
            done, pending = await asyncio.wait(
                [fetch_task, keep_alive_task],
                return_when=asyncio.FIRST_COMPLETED
            )
            
            if keep_alive_task in done:
                if keep_alive_task.exception():
                    pass
                else:
                    ping = keep_alive_task.result()
                    if ping:
                        yield ping
                keep_alive_task = asyncio.create_task(get_next(_keep_alive()))

            if fetch_task in done:
                if fetch_task.exception():
                    logger.error(f"Stream fetch exception: {fetch_task.exception()}")
                    yield {"_internal_error": True, "code": "STREAM_EXCEPTION", "stage": "llm_streaming", "details": str(fetch_task.exception())}
                    break
                    
                chunk = fetch_task.result()
                
                # Check if stream finished cleanly
                if chunk is None:
                    stream_successful = True
                    break
                    
                if isinstance(chunk, dict) and chunk.get("_internal_error"):
                    yield {
                        "type": "error",
                        "content": f"Generation interrupted: {chunk.get('details', 'Unknown error')}",
                        "code": chunk.get("code"),
                        "stage": chunk.get("stage")
                    }
                    break
                
                # Process the chunk...
                current_buffer += chunk
                fetch_task = asyncio.create_task(get_next(stream_gen))
                
                # Check for line breaks to parse headers
                if "\n" in current_buffer:
                    lines = current_buffer.split("\n")
                    # Keep the last incomplete line in buffer
                    current_buffer = lines.pop()
                    
                    for line in lines:
                        match = header_pattern.match(line.strip())
                        if match:
                            raw_title = match.group(1).strip("*_: ")
                            st_match = re.search(r"[\(\[\{]?Section ID:\s*([a-zA-Z0-9_]+)[\)\]\}]?", raw_title, re.IGNORECASE)
                            st_group = st_match.group(1) if st_match else None
                            
                            if st_match:
                                title_group = raw_title[:st_match.start()].strip("*_: -.")
                            else:
                                title_group = raw_title.strip("*_: -.")
                                
                            title_group = re.sub(r"^(?:Section\s*\d+|Step\s*\d+|\d+)\s*[:\.\-\)]?\s*", "", title_group, flags=re.IGNORECASE).strip()
                            logger.info(f"[PARSER] Detected Heading: '{line.strip()}' -> title='{title_group}', st='{st_group}'")
                            
                            new_st = st_group
                            
                            if new_st and new_st not in accumulated_content:
                                if new_st.lower() in accumulated_content:
                                    new_st = new_st.lower()
                                else:
                                    new_st = None
                                    
                            if not new_st:
                                matched = False
                                for pst, ptitle in active_sections:
                                    clean_ptitle = re.sub(r"^(?:Section\s*\d+|Step\s*\d+|\d+)\s*[:\.\-\)]?\s*", "", ptitle, flags=re.IGNORECASE).lower().replace(" ", "")
                                    clean_title = title_group.lower().replace(" ", "")
                                    clean_title = re.sub(r"[\[\]\{\}\(\)]", "", clean_title)
                                    if clean_title == clean_ptitle or clean_ptitle in clean_title or clean_title in clean_ptitle:
                                        new_st = pst
                                        matched = True
                                        break
                                if not matched:
                                    new_st = active_st if active_st else active_sections[0][0]
                                    
                            if active_st and new_st != active_st:
                                validated_content = await validate_mermaid(accumulated_content[active_st])
                                accumulated_content[active_st] = validated_content
                                yield {
                                    "type": "section_done",
                                    "section_type": active_st,
                                    "section_data": {
                                        "type": active_st,
                                        "content": validated_content,
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
        fetch_task.cancel()

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
        validated_content = await validate_mermaid(accumulated_content[active_st])
        accumulated_content[active_st] = validated_content
        yield {
            "type": "section_done",
            "section_type": active_st,
            "section_data": {
                "type": active_st,
                "content": validated_content,
            },
            "status": "completed",
            "engine_id": engine_id,
            "elapsed": 0,
            "model": model_id,
        }

    # Step 3: Semantic Review and Regeneration
    # ONLY proceed if the full lesson stream completed successfully.
    if stream_successful:
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
                        if event.get("type") == "section_done":
                            accumulated_content[st] = event["section_data"]["content"]
                    yield {"type": "ping", "timestamp": time.time()}
                    continue
                    
                if st == "quiz":
                    quiz_issues = validate_quiz(content)
                    if quiz_issues:
                        logger.warning(f"QUIZ_VALIDATION_FAIL: {quiz_issues}")
                        async for event in _regenerate_section(provider, subject, topic, difficulty, st, title, engine_id, quiz_issues):
                            yield event
                            if event.get("type") == "section_done":
                                accumulated_content[st] = event["section_data"]["content"]
                        logger.info("QUIZ_REGENERATED")
                    else:
                        logger.info("QUIZ_VALIDATION_PASS")
                    
                    logger.info("QUIZ_SENT_TO_FRONTEND")
                    continue
                
                review_result = await reviewer_agent.review_section(st, content, subject, topic, difficulty)
                yield {"type": "ping", "timestamp": time.time()}
                
                if not review_result.passed:
                    logger.warning(f"Section {st} failed semantic review, regenerating. Issues: {review_result.issues}")
                    async for event in _regenerate_section(provider, subject, topic, difficulty, st, title, engine_id, review_result.issues):
                        yield event
                        if event.get("type") == "section_done":
                            accumulated_content[st] = event["section_data"]["content"]
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

    lesson_data = {
        "metadata": {
            "title": f"{subject} - {topic}",
            "subject": subject,
            "topic": topic,
            "difficulty": difficulty,
            "learning_mode": learning_mode,
            "total_generation_time": round(time.time() - start_time, 2),
        },
        "sections": {
            st: {
                "type": st,
                "title": title,
                "content": accumulated_content.get(st, ""),
            } for st, title in active_sections
        }
    }

    yield {
        "type": "lesson",
        "data": lesson_data,
        "elapsed": round(time.time() - start_time, 2),
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
        "Ensure it is highly detailed, deeply comprehensive, and meets university-level standards for length and depth.\n"
        "Address the following issues strictly:\n"
        f"{chr(10).join(issues) if issues else 'The previous attempt was completely blank.'}\n\n"
        "Use valid Mermaid syntax (```mermaid) for any visual diagrams. Use $ for inline math and $$ for block math.\n"
        "Output ONLY the markdown content for this specific section, without the header."
    )
    
    if st == "quiz":
        prompt += (
            "\nQUIZ RULES: You must generate EXACTLY 10 university-style Multiple Choice Questions.\n"
            "DO NOT use <think> tags or output any reasoning. Output ONLY the final structured quiz.\n"
            "Format EACH question exactly as follows:\n"
            "Question: [Text]\n"
            "Option A: [Text]\n"
            "Option B: [Text]\n"
            "Option C: [Text]\n"
            "Option D: [Text]\n"
            "Correct Answer: [Option Letter]\n"
            "Explanation: [Detailed explanation]\n"
        )
    
    model_id = get_model_for_section(st, "default")
    key = await key_manager.acquire_key_async(model_id)
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
    in_think = False
    think_buffer = ""
    try:
        async for event in provider.complete_stream(request):
            if event.content:
                chunk = event.content
                think_buffer += chunk
                
                while think_buffer:
                    if not in_think:
                        start_idx = think_buffer.find("<think>")
                        if start_idx != -1:
                            if start_idx > 0:
                                accumulated += think_buffer[:start_idx]
                                yield {
                                    "type": "section_chunk",
                                    "section_type": st,
                                    "content": think_buffer[:start_idx],
                                    "engine_id": engine_id,
                                }
                            in_think = True
                            think_buffer = think_buffer[start_idx + 7:]
                        else:
                            if len(think_buffer) < 7:
                                break
                            accumulated += think_buffer[:-6]
                            yield {
                                "type": "section_chunk",
                                "section_type": st,
                                "content": think_buffer[:-6],
                                "engine_id": engine_id,
                            }
                            think_buffer = think_buffer[-6:]
                            break
                    else:
                        end_idx = think_buffer.find("</think>")
                        if end_idx != -1:
                            in_think = False
                            think_buffer = think_buffer[end_idx + 8:]
                        else:
                            think_buffer = ""
                            break
                            
        if think_buffer and not in_think:
            accumulated += think_buffer
            yield {
                "type": "section_chunk",
                "section_type": st,
                "content": think_buffer,
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
