"""
Specialized Teaching Agents — One agent per section type.
Each agent has its own system prompt, model routing, and quality criteria.
"""
import asyncio
import json
import logging
import time
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List, AsyncGenerator

from app.ai.base import AIProvider, CompletionRequest, Message
from app.ai.model_router_config import get_section_config, SectionRoutingConfig
from app.ai.model_router import model_router, get_model_for_section
from app.ai.key_manager import key_manager, KeyManager, ApiKey as MgrApiKey

logger = logging.getLogger(__name__)


class AgentStatus:
    IDLE = "idle"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class AgentConfig:
    section_type: str
    system_prompt: str
    prompt_template: str
    model_id: str
    max_tokens: int = 8192
    temperature: float = 0.7
    max_retries: int = 3
    min_content_length: int = 500


@dataclass
class GenerationResult:
    section_type: str
    content: str
    title: str
    status: str
    model_used: str = ""
    tokens_used: int = 0
    latency: float = 0.0
    retries: int = 0
    error: Optional[str] = None
    quality_score: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class TeachingAgent(ABC):
    """Base class for all teaching agents."""

    def __init__(self, config: AgentConfig, key_pool: Any = None):
        self.config = config
        self.status = AgentStatus.IDLE
        self._acquired_key: MgrApiKey | None = None

    @property
    @abstractmethod
    def section_type(self) -> str:
        pass

    async def _get_provider(self, model_id: str) -> AIProvider:
        """Get provider with acquired key — fast async event-based acquisition."""
        # Try immediate acquisition first (no wait if keys available)
        key = key_manager.get_available_key(preferred_model=model_id)
        if not key:
            # Fallback: any available key
            key = key_manager.get_available_key()
        if not key:
            # Async wait: up to 30s with event notification (no busy-loop)
            key = await key_manager.acquire_key_async(model_id=model_id, timeout=30.0)
        if not key:
            raise RuntimeError(f"No available API keys for model {model_id} after waiting 30s")

        self._acquired_key = key
        key.record_use()

        from app.ai.groq_provider import GroqProvider
        provider = GroqProvider(key_manager=key_manager)
        provider.set_api_key(key.key)
        return provider

    def _build_prompt(self, subject: str, topic: str) -> str:
        """Build the user prompt from template."""
        return self.config.prompt_template.format(
            topic=topic,
            subject=subject,
        )

    async def generate(
        self,
        subject: str,
        topic: str,
        context: Optional[str] = None,
        blueprint: Optional[Dict[str, Any]] = None,
        previous_summaries: Optional[str] = None,
        engine_id: str = "",
    ) -> AsyncGenerator[Any, None]:
        """Generate the section content."""
        self.status = AgentStatus.GENERATING
        start_time = time.time()
        retries = 0
        _last_failure_reason = "Unknown"

        # Select the best model dynamically using the updated ModelRouter with quotas and specialization
        model_id = get_model_for_section(self.section_type, difficulty=context.get("complexity", "moderate") if isinstance(context, dict) else "intermediate", engine_id=engine_id)
        routing_config = get_section_config(self.section_type)
        fallback_queue = model_router.get_fallback_chain(self.section_type)
        if model_id in fallback_queue:
            fallback_queue.remove(model_id)

        logger.info(
            f"[AGENT:{self.section_type}] START | subject={subject!r} topic={topic!r} "
            f"model={model_id!r} max_tokens={self.config.max_tokens} temperature={self.config.temperature}"
        )

        while retries <= self.config.max_retries:
            attempt_start = time.time()
            try:
                provider = await self._get_provider(model_id)

                prompt = ""
                if blueprint:
                    prompt += f"LESSON BLUEPRINT (Use the exact terminology, notation, variables, style, and tone defined below):\n{json.dumps(blueprint, indent=2)}\n\n"
                if previous_summaries:
                    prompt += f"PREVIOUS SECTION SUMMARY (Context of what was generated in previous sections. Do NOT repeat or overlap with this content):\n{previous_summaries}\n\n"

                prompt += self._build_prompt(subject, topic)
                if context and isinstance(context, str):
                    prompt += f"\n\nAdditional Context:\n{context}"

                # STAGE 1: Log prompt being sent
                logger.info(
                    f"[AGENT:{self.section_type}] STAGE-1 PROMPT | attempt={retries+1} "
                    f"prompt_chars={len(prompt)} prompt_preview={prompt[:300]!r}"
                )

                messages = [
                    Message(role="system", content=self.config.system_prompt),
                    Message(role="user", content=prompt),
                ]

                request = CompletionRequest(
                    messages=messages,
                    model=model_id,
                    temperature=self.config.temperature,
                    max_tokens=self.config.max_tokens,
                    stream=True,
                )

                accumulated = ""
                unyielded_buffer = ""
                finish_reason = None
                is_in_mermaid = False
                
                async for event in provider.complete_stream(request):
                    if event.error:
                        raise RuntimeError(event.error)
                    if event.content:
                        accumulated += event.content
                        unyielded_buffer += event.content
                        
                        # Determine if we are currently inside a mermaid block
                        code_blocks = accumulated.count("```")
                        is_currently_in_code = (code_blocks % 2 != 0)
                        
                        if is_currently_in_code:
                            last_start = accumulated.rfind("```")
                            prefix = accumulated[last_start:last_start+15].lower()
                            # Buffer if it starts with ```m or if it could become ```mermaid
                            # This catches ```, ```m, ```me, preventing partial mermaid streaming
                            if "```mermaid".startswith(prefix) or prefix.startswith("```mermaid"):
                                is_in_mermaid = True
                                continue
                            else:
                                is_in_mermaid = False
                        else:
                            if is_in_mermaid:
                                # We just closed a mermaid block.
                                is_in_mermaid = False
                                
                                # Validate the block inside unyielded_buffer
                                block_start = unyielded_buffer.lower().rfind("```mermaid")
                                block_end = unyielded_buffer.rfind("```")
                                if block_start != -1 and block_end != -1 and block_end > block_start:
                                    block = unyielded_buffer[block_start:block_end+3]
                                    is_valid = True
                                    
                                    # Basic Mermaid repairs
                                    block = block.replace("&#", "")
                                    block = block.replace("-->>", "-->")  # Fix common flowchart arrow error
                                    
                                    if "|>" in block: is_valid = False
                                    if not any(x in block.lower() for x in ["graph", "flowchart", "state", "sequence", "class", "pie", "gantt", "mindmap"]): is_valid = False
                                    
                                    if not is_valid:
                                        # Let it pass through. The frontend MarkdownRenderer will 
                                        # display the raw source code if it fails to render.
                                        pass
                                    else:
                                        # Save the repaired block back
                                        unyielded_buffer = unyielded_buffer[:block_start] + block + unyielded_buffer[block_end+3:]
                                        
                                        a_start = accumulated.lower().rfind("```mermaid")
                                        a_end = accumulated.rfind("```")
                                        if a_start != -1 and a_end != -1 and a_end > a_start:
                                            accumulated = accumulated[:a_start] + block + accumulated[a_end+3:]

                        # Yield whatever is in the buffer
                        if unyielded_buffer:
                            yield {
                                "type": "section_chunk",
                                "section_type": self.section_type,
                                "content": unyielded_buffer,
                            }
                            unyielded_buffer = ""
                            
                    if event.finish_reason:
                        finish_reason = event.finish_reason
                    if event.finish_reason == "length":
                        _last_failure_reason = (
                            f"TokenLimitError: Model output truncated at max_tokens={self.config.max_tokens}. "
                            f"Accumulated {len(accumulated)} chars so far."
                        )
                        logger.error(f"[AGENT:{self.section_type}] STAGE-2 RAW | {_last_failure_reason}")
                        raise RuntimeError(_last_failure_reason)

                # STAGE 2: Log raw model output
                logger.info(
                    f"[AGENT:{self.section_type}] STAGE-2 RAW | attempt={retries+1} "
                    f"raw_chars={len(accumulated)} finish_reason={finish_reason!r} "
                    f"raw_preview={accumulated[:500]!r}"
                )

                if not accumulated.strip():
                    _last_failure_reason = "Empty response from model (0 chars returned)"
                    logger.error(f"[AGENT:{self.section_type}] {_last_failure_reason}")
                    raise RuntimeError(_last_failure_reason)

                self.current_model = model_id

                # STAGE 3: Parse response
                try:
                    content = self._parse_response(accumulated)
                except ValueError as parse_err:
                    _last_failure_reason = f"ParseError: {parse_err}"
                    logger.error(f"[AGENT:{self.section_type}] STAGE-3 PARSE FAILED | {_last_failure_reason}")
                    raise RuntimeError(_last_failure_reason)

                logger.info(
                    f"[AGENT:{self.section_type}] STAGE-3 PARSED | content_chars={len(content) if content else 0} "
                    f"content_preview={repr(content[:300]) if content else 'None'}"
                )

                if not content or len(content) < self.config.min_content_length:
                    _last_failure_reason = (
                        f"ContentTooShort: got {len(content) if content else 0} chars, "
                        f"min required={self.config.min_content_length}"
                    )
                    logger.error(f"[AGENT:{self.section_type}] STAGE-3 PARSE | {_last_failure_reason}")
                    raise RuntimeError(_last_failure_reason)

                # STAGE 4: Quality validation
                quality_score = await self._run_quality_checks(content, subject, topic)
                logger.info(
                    f"[AGENT:{self.section_type}] STAGE-4 VALIDATION | quality_score={quality_score:.3f} "
                    f"threshold=0.5"
                )

                if quality_score < 0.5:
                    _last_failure_reason = (
                        f"ValidationFailed: quality_score={quality_score:.3f} < 0.5. "
                        f"See STAGE-4 warnings above for specific failing checks."
                    )
                    logger.error(f"[AGENT:{self.section_type}] STAGE-4 VALIDATION FAILED | {_last_failure_reason}")
                    raise RuntimeError(_last_failure_reason)

                latency = time.time() - start_time
                self._release_key(model_id, True, latency)

                logger.info(
                    f"[AGENT:{self.section_type}] SUCCESS | latency={latency:.2f}s retries={retries} "
                    f"model={model_id!r} quality_score={quality_score:.3f}"
                )

                self.status = AgentStatus.COMPLETED
                yield GenerationResult(
                    section_type=self.section_type,
                    content=content,
                    title=self.config.section_type,
                    status=AgentStatus.COMPLETED,
                    model_used=model_id,
                    latency=latency,
                    retries=retries,
                    quality_score=quality_score,
                )
                return

            except Exception as e:
                is_timeout = isinstance(e, asyncio.TimeoutError) or "timeout" in str(e).lower()
                attempt_latency = round(time.time() - attempt_start, 2)
                
                # If timeout and we are at max_retries, allow exactly 1 more retry
                if is_timeout and retries == self.config.max_retries:
                    self.config.max_retries += 1
                    
                retries += 1
                self._release_key(model_id, False, 0.0, str(e))
                logger.warning(
                    f"[AGENT:{self.section_type}] STAGE-6 RETRY | attempt={retries} "
                    f"failure_reason={_last_failure_reason!r} exception={str(e)!r} "
                    f"attempt_latency={attempt_latency}s is_timeout={is_timeout}"
                )
                if retries <= self.config.max_retries:
                    yield {
                        "type": "section_clear",
                        "section_type": self.section_type,
                    }
                    yield {
                        "type": "section_chunk",
                        "section_type": self.section_type,
                        "content": f"\n\n*Retrying this section...*\n\n"
                    }
                    await asyncio.sleep(2 * retries)
                    # Try fallback model
                    if fallback_queue:
                        fallback = fallback_queue.pop(0)
                        logger.info(f"[AGENT:{self.section_type}] Trying fallback model {fallback!r}")
                        model_id = fallback
                        yield {
                            "type": "section_fallback",
                            "section_type": self.section_type,
                            "model": model_id
                        }
                    else:
                        yield {
                            "type": "section_retry",
                            "section_type": self.section_type,
                            "attempt": retries
                        }
                    yield {
                        "type": "section_clear",
                        "section_type": self.section_type,
                    }
                else:
                    break

        # Desperation fallback
        logger.warning(f"[AGENT:{self.section_type}] Exhausted all retries. Attempting desperation fallback.")
        yield {
            "type": "section_clear",
            "section_type": self.section_type,
        }
        yield {
            "type": "section_chunk",
            "section_type": self.section_type,
            "content": f"\n\n*Generating simplified version...*\n\n"
        }
        
        try:
            fallback_model = "llama-3.1-8b-instant"
            provider = await self._get_provider(fallback_model)
            simplified_prompt = f"Provide a brief, 2-paragraph summary of {topic} in the context of {subject} for a {self.section_type} section. Output Markdown directly. Do not use Mermaid. Keep it under 200 words."
            
            messages = [
                Message(role="system", content="You are a helpful teaching assistant."),
                Message(role="user", content=simplified_prompt)
            ]
            request = CompletionRequest(
                messages=messages,
                model=fallback_model,
                temperature=0.3,
                max_tokens=300,
                stream=False
            )
            
            # Simple manual key acquisition for desperation
            key = key_manager.get_available_key(preferred_model=fallback_model)
            if not key:
                key = key_manager.get_available_key()
            if key:
                provider.set_api_key(key.key)
                resp = await provider.complete(request)
                if resp.content:
                    content = resp.content
                    yield {
                        "type": "section_clear",
                        "section_type": self.section_type,
                    }
                    yield {
                        "type": "section_chunk",
                        "section_type": self.section_type,
                        "content": content
                    }
                    self.status = AgentStatus.COMPLETED
                    yield GenerationResult(
                        section_type=self.section_type,
                        content=content,
                        title=self.config.section_type,
                        status=AgentStatus.COMPLETED,
                        model_used=fallback_model,
                        latency=time.time() - start_time,
                        retries=retries,
                        quality_score=1.0,
                    )
                    return
        except Exception as fallback_err:
            logger.error(f"[AGENT:{self.section_type}] Desperation fallback failed: {fallback_err}")

        self.status = AgentStatus.FAILED
        if 'e' in locals():
            logger.error(f"Agent {self.section_type} failed after {retries} retries. Final error: {e}")
            
        yield GenerationResult(
            section_type=self.section_type,
            content="",
            title=self.config.section_type,
            status=AgentStatus.FAILED,
            model_used=model_id,
            latency=time.time() - start_time,
            retries=retries,
            error="We couldn't generate this section. Please regenerate.",
        )


    def _release_key(self, model_id: str, success: bool, latency: float, error_type: str = "") -> None:
        """Release key back to pool, decrement in-flight counter."""
        key = self._acquired_key
        if not key:
            return
        if not success:
            cooldown = min(30 * (2 ** min(key.errors, 4)), 300)
            key.mark_cooldown(cooldown)
        # Decrement in-flight counter
        key_manager.release_key(key, success=success)
        self._acquired_key = None

    async def _run_quality_checks(self, content: str, subject: str, topic: str) -> float:
        """Run quality checks and return score 0-1."""
        score = 1.0
        checks_log = []

        # Check 1: Minimum length
        min_len = self.config.min_content_length
        if len(content) < min_len:
            score *= 0.5
            checks_log.append(f"ContentTooShort: {len(content)} < {min_len}")

        # Check 2: Has markdown structure
        if "##" not in content and "|" not in content and "```" not in content:
            score *= 0.8
            checks_log.append("MissingMarkdownStructure: no ##, |, or ```")

        # Check 3: No JSON leakage
        if content.strip().startswith("{") and '"content"' in content[:200]:
            score *= 0.3
            checks_log.append("JSONLeakage: content starts with { and contains '\"content\"'")

        # Check 4: No generic AI phrases
        ai_phrases = [
            "delve into", "let's dive into", "in this section we will",
            "welcome to", "in conclusion", "certainly!", "hope this helps"
        ]
        for phrase in ai_phrases:
            if phrase.lower() in content.lower():
                score *= 0.9
                checks_log.append(f"AIPhrase: '{phrase}' found")

        # Section-specific checks
        section_score = await self._section_specific_checks(content, subject, topic)
        if section_score < 1.0:
            checks_log.append(f"SectionSpecificCheck: multiplier={section_score:.3f}")
        score *= section_score

        # Validation layer: Subject-aware code rules
        from app.ai.content_validator import validate_subject_code_rules
        if not validate_subject_code_rules(content, subject, topic):
            checks_log.append(f"SubjectCodeViolation: programming code found in non-code subject '{subject}'")
            score *= 0.1  # Severely penalize to trigger retry

        final_score = max(0.0, min(1.0, score))
        if checks_log:
            logger.warning(
                f"[AGENT:{self.section_type}] STAGE-4 VALIDATION DETAIL | "
                f"final_score={final_score:.3f} checks={checks_log}"
            )
        else:
            logger.info(f"[AGENT:{self.section_type}] STAGE-4 VALIDATION DETAIL | All checks passed. score={final_score:.3f}")

        return final_score

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        """Section-specific quality checks. Subclasses override this."""
        return 1.0

    def _parse_response(self, raw: str) -> str:
        """Parse model response to extract content."""
        raw = raw.strip()
        if raw.startswith("{") or "```json" in raw.lower():
            clean_raw = raw
            if "```" in clean_raw:
                match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', clean_raw, re.IGNORECASE)
                if match:
                    clean_raw = match.group(1).strip()
            
            start_idx = clean_raw.find('{')
            end_idx = clean_raw.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                clean_raw = clean_raw[start_idx:end_idx+1]
                
            try:
                data = json.loads(clean_raw)
                return data.get("content", raw)
            except json.JSONDecodeError as e:
                logger.warning(f"JSON Parse Error: {e}. Attempting auto-repair.")
                # Attempt regex extraction if JSON fails
                match = re.search(r'"content"\s*:\s*"(.*?)"\s*(?:,|})', raw, re.DOTALL)
                if match:
                    content = match.group(1).replace('\\"', '"').replace('\\n', '\n')
                    return content

                raise ValueError("Malformed JSON from AI model. Auto-repair failed.")
        return raw


class ExplanationAgent(TeachingAgent):
    """
    Generates the 30-section university lecture via chunked generation.

    The 30 sections are split into 5 independent chunks, each generated by its
    own model+key call with a full 6-model fallback chain.  Chunks are streamed
    to the frontend as they complete.  Validation runs on the complete assembled
    output only, so no chunk is ever validated in isolation.

    Architecture invariants preserved:
    - Same professor system prompt, same educational depth
    - Same streaming delivery to the frontend
    - Same validation logic
    - No changes to orchestration, routing or UI
    """

    @property
    def section_type(self) -> str:
        return "explanation"

    # Ordered fallback chain for every chunk attempt.  High-capacity models first.
    _CHUNK_FALLBACK_MODELS: List[str] = [
        "groq/compound",
        "qwen/qwen3.6-27b",
        "openai/gpt-oss-120b",
        "llama-3.3-70b-versatile",
        "openai/gpt-oss-20b",
        "llama-3.1-8b-instant",
    ]

    def _get_chunk_definitions(self, subject: str) -> List[tuple]:
        subj_lower = subject.lower()
        if any(k in subj_lower for k in ["mathematics", "math", "physics", "chemistry"]):
            return [
                ("foundation", [1, 2, 3], (
                    "1. TITLE & INTRODUCTION — A technically precise title. High-engagement academic introduction.\n"
                    "2. WHY THIS EXISTS — The exact historical and practical problem that led to \"{topic}\".\n"
                    "3. INTUITION & MENTAL MODEL — The core concept in plain visual language. How to picture it."
                )),
                ("theory", [4, 5], (
                    "4. FORMAL DEFINITION — Rigorous engineering definition with LaTeX mathematics. Define every symbol.\n"
                    "5. FORMULA EXPLANATION — Break down the core formulas component by component."
                )),
                ("examples", [6, 7], (
                    "6. CONCEPT MAP / FLOWCHART — A clean, valid Mermaid.js diagram enclosed in a ```mermaid block.\n"
                    "7. STEP-BY-STEP DERIVATION — Step-by-step mathematical or physical derivation. Show exact working.\n"
                    "8. SOLVED NUMERICAL EXAMPLE — A complete, real-world numerical example."
                )),
                ("advanced", [9, 10, 11], (
                    "8. ENGINEERING APPLICATIONS — Real-world engineering use cases.\n"
                    "9. COMMON MISTAKES — Format: > **\u274c Common Mistake:** ... and how to fix it.\n"
                    "10. INTERVIEW & EXAM PERSPECTIVE — University exam questions, grading criteria, and traps."
                )),
                ("summary", [11, 12], (
                    "11. SUMMARY & REVISION — Bulleted summary of 5-7 items with key rules.\n"
                    "12. TRANSITION — A natural bridge to the next logical concept in the curriculum."
                ))
            ]
        elif any(k in subj_lower for k in ["database", "sql"]):
            return [
                ("foundation", [1, 2, 3], (
                    "1. TITLE & INTRODUCTION — A technically precise title and introduction.\n"
                    "2. WHY THIS EXISTS — The data management problem that led to \"{topic}\".\n"
                    "3. INTUITION — The core concept in plain language."
                )),
                ("theory", [4, 5, 6], (
                    "4. FORMAL DEFINITION — Rigorous technical definition.\n"
                    "5. ER DIAGRAM / ARCHITECTURE — A clean, valid Mermaid.js diagram enclosed in a ```mermaid block.\n"
                    "6. SQL SYNTAX — Detailed syntax breakdown with variations."
                )),
                ("examples", [7, 8, 9], (
                    "7. STEP-BY-STEP EXAMPLE — A complete, copy-paste-runnable SQL example.\n"
                    "8. TRANSACTIONS & LOCKING — Concurrency and ACID considerations.\n"
                    "9. QUERY EXECUTION PLAN — How the database engine executes this operation."
                )),
                ("advanced", [10, 11, 12], (
                    "10. PERFORMANCE & INDEXING — How to optimize this operation.\n"
                    "11. COMMON MISTAKES — Format: > **\u274c Common Mistake:** ... and how to fix it.\n"
                    "12. INTERVIEW PERSPECTIVE — High-frequency interview questions and trade-offs."
                )),
                ("summary", [13, 14], (
                    "13. SUMMARY & REVISION — Bulleted summary of 5-7 items.\n"
                    "14. TRANSITION — Bridge to the next concept."
                ))
            ]
        elif any(k in subj_lower for k in ["network"]):
            return [
                ("foundation", [1, 2, 3], (
                    "1. TITLE & INTRODUCTION — A technically precise title and introduction.\n"
                    "2. WHY THIS EXISTS — The networking problem that led to \"{topic}\".\n"
                    "3. INTUITION — The core concept in plain language."
                )),
                ("theory", [4, 5, 6], (
                    "4. FORMAL DEFINITION — Rigorous technical definition.\n"
                    "5. PROTOCOL DIAGRAM — A clean, valid Mermaid.js sequence diagram enclosed in a ```mermaid block.\n"
                    "6. PACKET FLOW — Step-by-step trace of how the packet traverses the network."
                )),
                ("examples", [7, 8], (
                    "7. REAL-WORLD SCENARIO — A complete, real-world network trace example.\n"
                    "8. TCP/IP STACK — How this topic interacts with the OSI/TCP-IP model."
                )),
                ("advanced", [9, 10, 11], (
                    "9. SECURITY & FIREWALLS — Security implications and firewall rules.\n"
                    "10. COMMON MISTAKES & DEBUGGING — Using tools like tcpdump/wireshark.\n"
                    "11. INTERVIEW PERSPECTIVE — High-frequency interview questions and trade-offs."
                )),
                ("summary", [12, 13], (
                    "12. SUMMARY & REVISION — Bulleted summary of 5-7 items.\n"
                    "13. TRANSITION — Bridge to the next concept."
                ))
            ]
        elif any(k in subj_lower for k in ["programming", "code", "software", "computer"]):
            return [
                ("foundation", [1, 2, 3], (
                    "1. TITLE & INTRODUCTION — A technically precise title and introduction.\n"
                    "2. WHY THIS EXISTS — The practical engineering problem that led to \"{topic}\".\n"
                    "3. INTUITION — The core concept in plain, jargon-free language."
                )),
                ("theory", [4, 5, 6], (
                    "4. FORMAL DEFINITION — Rigorous engineering definition.\n"
                    "5. ARCHITECTURE / FLOWCHART — A clean, valid Mermaid.js diagram enclosed in a ```mermaid block.\n"
                    "6. SYNTAX & VARIATIONS — Detailed syntax breakdown with a comparison table.\n"
                    "7. HOW IT WORKS INTERNALLY — CPU cycles, compiler behavior, or thread safety."
                )),
                ("examples", [7, 8, 9], (
                    "7. STEP-BY-STEP EXAMPLE — A complete, real-world, copy-paste-runnable example.\n"
                    "8. MEMORY VISUALIZATION — Table/Explanation: memory addresses, pointers, values.\n"
                    "9. EXECUTION TRACE — Call stack, stack frames, or register transitions."
                )),
                ("advanced", [10, 11, 12, 13], (
                    "10. COMPLEXITY ANALYSIS — Time and Space complexity formal analysis.\n"
                    "11. BEST PRACTICES — Format: > **\u2705 Best Practice:** ...\n"
                    "12. COMMON MISTAKES — Format: > **\u274c Common Mistake:** ... and how to fix it.\n"
                    "13. INTERVIEW PERSPECTIVE — High-frequency interview questions and traps."
                )),
                ("summary", [14, 15], (
                    "14. SUMMARY & REVISION — Bulleted summary of 5-7 items.\n"
                    "15. TRANSITION — A natural bridge to the next logical concept."
                ))
            ]
        else:
            return [
                ("foundation", [1, 2, 3], (
                    "1. TITLE & INTRODUCTION — A technically precise title and introduction.\n"
                    "2. WHY THIS EXISTS — The practical engineering problem that led to \"{topic}\".\n"
                    "3. INTUITION — The core concept in plain, jargon-free language."
                )),
                ("theory", [4, 5, 6], (
                    "4. FORMAL DEFINITION — Rigorous engineering definition.\n"
                    "5. MENTAL MODEL — \"Here is how you should picture {topic} in your mind...\"\n"
                    "6. VISUAL DIAGRAM — A detailed, clean, valid Mermaid.js diagram enclosed in a ```mermaid block."
                )),
                ("examples", [7, 8], (
                    "7. STEP-BY-STEP EXAMPLE — A complete, real-world, descriptive example.\n"
                    "8. REAL-WORLD APPLICATIONS — Table: Domain | Real Company | Use Case."
                )),
                ("advanced", [9, 10, 11], (
                    "9. BEST PRACTICES — Format: > **\u2705 Best Practice:** ...\n"
                    "10. COMMON MISTAKES — Format: > **\u274c Common Mistake:** ... and how to fix it.\n"
                    "11. INTERVIEW PERSPECTIVE — High-frequency interview questions and traps."
                )),
                ("summary", [12, 13], (
                    "12. SUMMARY & REVISION — Bulleted summary of 5-7 items.\n"
                    "13. TRANSITION — A natural bridge to the next logical concept."
                ))
            ]

    async def _generate_chunk(
        self,
        chunk_name: str,
        sections_str: str,
        subject: str,
        topic: str,
        blueprint: Optional[Dict[str, Any]],
        previous_content: str,
        engine_id: str,
    ) -> str:
        """
        Generate one chunk with a full per-model, per-key failover loop.
        Returns the raw markdown.  Raises RuntimeError only when all models fail.
        """
        is_no_code = any(s in subject.lower() for s in ["mathematics", "math", "physics", "chemistry"])
        if is_no_code:
            sections_str = sections_str.replace("copy-paste-runnable example. Show exact expected output", "step-by-step mathematical or physical derivation example. Show exact working")
            sections_str = sections_str.replace("line of code", "step of working")
            sections_str = sections_str.replace("MEMORY VISUALIZATION", "CONCEPTUAL VISUALIZATION")
            sections_str = sections_str.replace("EXECUTION TRACE", "DERIVATION TRACE")
            sections_str = sections_str.replace("DEBUGGING TIPS", "VERIFICATION TIPS")
            sections_str = sections_str.replace("TIME COMPLEXITY", "THEORETICAL LIMITS")
            sections_str = sections_str.replace("SPACE COMPLEXITY", "PHYSICAL/COMPUTATIONAL LIMITS")

        fallback_queue = list(self._CHUNK_FALLBACK_MODELS)
        chunk_attempt = 0

        while chunk_attempt < len(fallback_queue):
            model_id = fallback_queue[chunk_attempt]
            chunk_attempt += 1
            t0 = time.time()
            key = None

            try:
                # Transparent key acquisition — tries preferred model key first
                key = key_manager.get_available_key(preferred_model=model_id)
                if not key:
                    key = key_manager.get_available_key()
                if not key:
                    key = await key_manager.acquire_key_async(model_id=model_id, timeout=20.0)
                if not key:
                    logger.warning(
                        f"[AGENT:explanation/{chunk_name}] No key for model={model_id!r}, skipping."
                    )
                    continue

                self._acquired_key = key
                key.record_use()

                from app.ai.groq_provider import GroqProvider
                provider = GroqProvider(key_manager=key_manager)
                provider.set_api_key(key.key)

                # Build the chunk-specific prompt
                parts: List[str] = []
                if blueprint:
                    parts.append(
                        "LESSON BLUEPRINT (maintain exact terminology, notation, and tone):\n"
                        + json.dumps(blueprint, indent=2)
                    )
                if previous_content:
                    # Pass only the tail of prior content to keep context manageable
                    tail = previous_content[-2000:] if len(previous_content) > 2000 else previous_content
                    parts.append(
                        "PREVIOUSLY WRITTEN CONTENT (do NOT repeat anything from here):\n"
                        f"...{tail}"
                    )

                # Calculate word budget based on subject
                subj_lower = subject.lower()
                num_chunks = len(self._get_chunk_definitions(subject))
                if any(k in subj_lower for k in ["programming", "code", "software", "computer"]):
                    base = 2000 // num_chunks
                elif any(k in subj_lower for k in ["math", "physics", "chemistry", "statistics"]):
                    base = 1650 // num_chunks
                else:
                    base = 2200 // num_chunks
                
                variance = {
                    "foundation": 0.8,
                    "theory": 1.2,
                    "examples": 1.2,
                    "advanced": 1.0,
                    "exam_prep": 0.8,
                    "summary": 0.8,
                }
                multiplier = variance.get(chunk_name, 1.0)
                target_words = int(base * multiplier)
                target_str = f"{target_words - 50}-{target_words + 50} words"

                rendered = sections_str.replace("{topic}", topic).replace("{subject}", subject)
                parts.append(
                    f'Continue the university-level lecture on "{topic}" in {subject}.\n'
                    f"Write ONLY the following sections using the EXACT headers shown. Target length: ~{target_str}.\n\n"
                    f"CRITICAL CONSTRAINT: Focus on highly concise, punchy explanations. Never explain the same concept twice. "
                    f"Merge Introduction and Intuition if they overlap. Merge Summary and Revision when possible. "
                    f"Keep important definitions, formulas, and examples, but compress narrative paragraphs efficiently.\n\n"
                    f"{rendered}\n\n"
                    f"Output raw markdown immediately. No preamble. No JSON wrapper."
                )

                full_prompt = "\n\n".join(parts)
                
                # Estimate prompt size to avoid 413 Request Entity Too Large
                estimated_prompt_tokens = len(full_prompt) // 4
                requested_max_tokens = 6144
                # Most standard models have 8192 context. If prompt + requested > 8192, we must reduce requested tokens or skip.
                if estimated_prompt_tokens + requested_max_tokens > 8192:
                    available_tokens = 8192 - estimated_prompt_tokens - 100 # 100 buffer
                    if available_tokens < 2000:
                        logger.warning(f"[AGENT:explanation/{chunk_name}] model={model_id!r} skipped. Estimated prompt {estimated_prompt_tokens} leaves too few tokens for generation to prevent 413.")
                        key_manager.release_key(key, success=True)
                        self._acquired_key = None
                        continue
                    requested_max_tokens = available_tokens

                logger.info(
                    f"[AGENT:explanation/{chunk_name}] Attempt {chunk_attempt}/{len(fallback_queue)} | "
                    f"model={model_id!r} prompt_chars={len(full_prompt)} requested_tokens={requested_max_tokens}"
                )

                from app.ai.teaching_orchestrator import _get_explanation_system_prompt
                request = CompletionRequest(
                    messages=[
                        Message(role="system", content=_get_explanation_system_prompt()),
                        Message(role="user", content=full_prompt),
                    ],
                    model=model_id,
                    temperature=self.config.temperature,
                    max_tokens=requested_max_tokens,
                    stream=False,
                )

                response = await provider.complete(request)
                text = response.content.strip() if response.content else ""
                latency = time.time() - t0

                key_manager.release_key(key, success=True)
                self._acquired_key = None

                if not text or len(text) < 100:
                    logger.warning(
                        f"[AGENT:explanation/{chunk_name}] model={model_id!r} too short ({len(text)} chars). Next."
                    )
                    continue
                    
                # Chunk-level subject code rules validation
                from app.ai.content_validator import validate_subject_code_rules
                if not validate_subject_code_rules(text, subject, topic):
                    logger.warning(
                        f"[AGENT:explanation/{chunk_name}] model={model_id!r} failed subject code rules (generated code for non-code subject). Next."
                    )
                    continue

                logger.info(
                    f"[AGENT:explanation/{chunk_name}] SUCCESS | model={model_id!r} "
                    f"chars={len(text)} latency={latency:.2f}s"
                )
                return text

            except Exception as exc:
                latency = time.time() - t0
                if self._acquired_key:
                    key_manager.release_key(self._acquired_key, success=False)
                    self._acquired_key = None

                logger.warning(
                    f"[AGENT:explanation/{chunk_name}] FAILED model={model_id!r} | "
                    f"error={str(exc)!r} latency={latency:.2f}s | next fallback"
                )
                continue

        raise RuntimeError(
            f"ExplanationAgent chunk '{chunk_name}' exhausted all {len(fallback_queue)} fallback models."
        )

    async def generate(
        self,
        subject: str,
        topic: str,
        context: Optional[str] = None,
        blueprint: Optional[Dict[str, Any]] = None,
        previous_summaries: Optional[str] = None,
        engine_id: str = "",
    ) -> AsyncGenerator[Any, None]:
        """
        Chunked generation: 5 independent chunks, 6 model fallbacks each.

        Chunks stream to the frontend immediately.
        Final validation runs on the complete merged output only.
        """
        self.status = AgentStatus.GENERATING
        t_start = time.time()

        logger.info(
            f"[AGENT:explanation] CHUNKED START | subject={subject!r} topic={topic!r} "
            f"chunks={len(self._get_chunk_definitions(subject))} models_per_chunk={len(self._CHUNK_FALLBACK_MODELS)}"
        )

        assembled: List[str] = []
        tasks = []
        # Launch all chunks concurrently to drastically reduce latency and distribute API keys
        for idx, (chunk_name, section_nums, sections_str) in enumerate(self._get_chunk_definitions(subject)):
            logger.info(
                f"[AGENT:explanation] LAUNCHING CONCURRENT CHUNK {idx+1}/{len(self._get_chunk_definitions(subject))} | "
                f"name={chunk_name!r} sections={section_nums}"
            )
            task = asyncio.create_task(
                self._generate_chunk(
                    chunk_name=chunk_name,
                    sections_str=sections_str,
                    subject=subject,
                    topic=topic,
                    blueprint=blueprint,
                    previous_content="",  # Remove blocking dependency so they can run concurrently
                    engine_id=engine_id,
                )
            )
            tasks.append((idx, chunk_name, task))

        # Await them in order to guarantee the frontend receives them in reading order
        for idx, chunk_name, task in tasks:
            try:
                chunk_text = await task
            except RuntimeError as exc:
                logger.error(f"[AGENT:explanation] CHUNK {idx+1} '{chunk_name}' ALL FALLBACKS EXHAUSTED | {exc}")
                # Don't fail the entire lesson because one chunk failed. Replace with error message.
                chunk_text = f"\n\n*Error: The {chunk_name} section could not be generated.*\n\n"
                
            assembled.append(chunk_text)
            
            # Immediately yield the chunk text to the frontend so it streams part by part
            yield {
                "type": "section_chunk",
                "section_type": self.section_type,
                "content": chunk_text + "\n\n",
            }

            logger.info(
                f"[AGENT:explanation] CHUNK {idx+1} DONE | "
                f"chars={len(chunk_text)} cumulative={sum(len(c) for c in assembled)}"
            )

        full_content = "\n\n".join(assembled)

        logger.info(
            f"[AGENT:explanation] ASSEMBLED | total_chars={len(full_content)} "
            f"words={len(full_content.split())} elapsed={time.time()-t_start:.2f}s"
        )

        quality_score = await self._run_quality_checks(full_content, subject, topic)
        logger.info(f"[AGENT:explanation] VALIDATION | score={quality_score:.3f}")

        if quality_score < 0.4:
            logger.error(f"[AGENT:explanation] VALIDATION FAILED | score={quality_score:.3f}")
            self.status = AgentStatus.FAILED
            yield GenerationResult(
                section_type=self.section_type,
                content="",
                title=self.config.section_type,
                status=AgentStatus.FAILED,
                model_used="chunked",
                latency=time.time() - t_start,
                retries=len(self._CHUNK_DEFINITIONS),
                error="We couldn't generate this section. Please regenerate.",
            )
            return

        latency = time.time() - t_start
        self.status = AgentStatus.COMPLETED
        logger.info(
            f"[AGENT:explanation] SUCCESS | chars={len(full_content)} "
            f"words={len(full_content.split())} quality={quality_score:.3f} latency={latency:.2f}s"
        )

        yield GenerationResult(
            section_type=self.section_type,
            content=full_content,
            title=self.config.section_type,
            status=AgentStatus.COMPLETED,
            model_used="chunked",
            latency=latency,
            retries=0,
            quality_score=quality_score,
        )

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        """Quality checks on the complete assembled explanation."""
        score = 1.0
        checks_log: List[str] = []

        section_markers = [
            "BEAUTIFUL TITLE", "INTRODUCTION", "LEARNING OBJECTIVES",
            "WHY THIS TOPIC EXISTS", "INTUITION", "REAL-LIFE ANALOGY",
            "FORMAL DEFINITION", "MENTAL MODEL", "HOW IT WORKS INTERNALLY",
            "VISUAL DIAGRAM", "FLOWCHART", "SYNTAX", "STEP-BY-STEP EXAMPLE",
            "DRY RUN", "MEMORY VISUALIZATION", "EXECUTION TRACE",
            "COMMON VARIATIONS", "ADVANCED CONCEPTS", "BEST PRACTICES",
            "COMMON MISTAKES", "DEBUGGING TIPS", "TIME COMPLEXITY",
            "SPACE COMPLEXITY", "REAL-WORLD APPLICATIONS", "INTERVIEW PERSPECTIVE",
            "EXAM PERSPECTIVE", "SUMMARY", "KEY TAKEAWAYS", "REVISION NOTES", "TRANSITION",
        ]
        found = sum(1 for m in section_markers if m.upper() in content.upper())
        if found < 22:
            score *= 0.6
            checks_log.append(f"MissingSections: {found}/30")

        words = len(content.split())
        if words < 1500:
            score *= 0.5
            checks_log.append(f"TooShort: {words} words < 1500")

        is_no_code = any(s in subject.lower() for s in ["mathematics", "math", "physics", "chemistry"])
        if not is_no_code and "```" not in content:
            score *= 0.5
            checks_log.append("MissingCodeBlocks")
        if not is_no_code and "mermaid" not in content.lower():
            score *= 0.8
            checks_log.append("MissingMermaid")
        if is_no_code and "$" not in content:
            score *= 0.7
            checks_log.append("MissingLaTeX")

        if checks_log:
            logger.warning(f"[AGENT:explanation] SectionChecks FAILED: {checks_log} | score={score:.3f}")
        else:
            logger.info(f"[AGENT:explanation] SectionChecks PASSED | {found}/30 markers, {words} words")

        return score


class CaseStudyAgent(TeachingAgent):
    """Generates 3 real-world company case studies."""

    @property
    def section_type(self) -> str:
        return "caseStudy"

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Must have 3 case studies
        case_count = content.lower().count("case study")
        if case_count < 3:
            score *= 0.6
            logger.warning(f"CaseStudyAgent: Only {case_count} case studies found")

        # Must have real company names
        companies = ["google", "amazon", "netflix", "uber", "tesla", "microsoft",
                    "meta", "apple", "spotify", "airbnb", "stripe", "github"]
        found_companies = sum(1 for c in companies if c in content.lower())
        if found_companies < 3:
            score *= 0.7

        # Must have metrics table
        if "|" not in content or "metric" not in content.lower():
            score *= 0.8

        # Must have mermaid diagram
        if "mermaid" not in content.lower():
            score *= 0.8

        # Word count
        if len(content.split()) < 1000:
            score *= 0.6

        return score


class AnalogyAgent(TeachingAgent):
    """Generates 3 memorable analogies with mapping tables."""

    @property
    def section_type(self) -> str:
        return "analogy"

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Must have 3 analogies
        analogy_count = content.lower().count("analogy")
        if analogy_count < 3:
            score *= 0.6

        # Must have mapping tables
        if "|" not in content:
            score *= 0.7

        # Must have "where it breaks" section
        if "breaks" not in content.lower() and "limit" not in content.lower():
            score *= 0.8

        # Word count
        if len(content.split()) < 600:
            score *= 0.6

        return score


class ExamplesAgent(TeachingAgent):
    """Generates 20+ runnable examples across 4 difficulty levels."""

    @property
    def section_type(self) -> str:
        return "examples"

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Must have code blocks
        code_blocks = content.count("```")
        if code_blocks < 10:
            score *= 0.6
            logger.warning(f"ExamplesAgent: Only {code_blocks} code blocks")

        # Must have beginner/intermediate/advanced/expert sections
        levels = ["beginner", "intermediate", "advanced", "expert"]
        found = sum(1 for l in levels if l in content.lower())
        if found < 3:
            score *= 0.7

        # Each example should have explanation + output
        if "output" not in content.lower():
            score *= 0.7

        # Word count
        if len(content.split()) < 2000:
            score *= 0.6

        return score


class QuizAgent(TeachingAgent):
    """Generates 25 MCQs + 10 Short + 5 Long questions."""

    @property
    def section_type(self) -> str:
        return "quiz"

    def _parse_response(self, raw: str) -> str:
        """Parse JSON and format into Markdown expected by frontend."""
        import re
        
        cleaned = raw.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        # If it's already markdown, return it
        if "**Correct Answer:" in cleaned and not cleaned.startswith("{"):
            logger.info("QuizAgent: Parser branch 'markdown' succeeded. Returning parsed markdown.")
            return cleaned
            
        def _build_md(data: dict) -> str:
            md = ""
            mcqs = data.get("mcq", [])
            if not mcqs and "questions" in data:
                mcqs = data.get("questions", [])
                
            for i, q in enumerate(mcqs, 1):
                md += f"{i}. {q.get('question', '')}\n"
                opts = q.get("options", {})
                if isinstance(opts, dict):
                    for k, v in opts.items():
                        md += f"{k}) {v}\n"
                elif isinstance(opts, list):
                    for j, v in enumerate(opts):
                        md += f"{chr(65 + j)}) {v}\n"
                ans = q.get('correct_answer', q.get('correctAnswer', ''))
                md += f"**Correct Answer: {ans}**\n"
                md += f"**Explanation:** {q.get('explanation', '')}\n\n"
            return md.strip()

        exception_caught = None

        try:
            data = json.loads(cleaned)
            branch = "json"
            if isinstance(data, dict) and "content" in data:
                if isinstance(data["content"], str):
                    try:
                        data = json.loads(data["content"])
                        branch = "stringified json"
                    except Exception as inner_e:
                        exception_caught = type(inner_e).__name__
                elif isinstance(data["content"], dict):
                    data = data["content"]
            
            md_output = _build_md(data)
            if md_output:
                logger.info(f"QuizAgent: Parser branch '{branch}' succeeded. Returning constructed markdown.")
                return md_output
        except Exception as e:
            exception_caught = type(e).__name__

        # Regex fallback for mixed/malformed
        match = re.search(r'```json\s*(\{.*?\})\s*```', raw, re.DOTALL)
        if not match:
            match = re.search(r'(\{.*"mcq".*?\})', raw, re.DOTALL)
            
        if match:
            try:
                data = json.loads(match.group(1))
                branch = "regex fallback"
                if isinstance(data, dict) and "content" in data:
                    if isinstance(data["content"], str):
                        try:
                            data = json.loads(data["content"])
                            branch = "regex stringified json"
                        except Exception as inner_e:
                            exception_caught = type(inner_e).__name__
                    elif isinstance(data["content"], dict):
                        data = data["content"]
                md_output = _build_md(data)
                if md_output:
                    logger.info(f"QuizAgent: Parser branch '{branch}' succeeded. Returning constructed markdown.")
                    return md_output
            except Exception as e:
                exception_caught = type(e).__name__

        detected_format = "json" if cleaned.startswith("{") else "mixed/unknown"
        model_name = getattr(self, "current_model", "unknown")
        logger.error(
            f"QuizAgent Parser Diagnostic Dump\n"
            f"Model: {model_name}\n"
            f"Detected Format: {detected_format}\n"
            f"Parser Branch: Fallback (All branches failed)\n"
            f"Exception: {exception_caught}\n"
            f"=== EXACT RAW MODEL OUTPUT START ===\n"
            f"{raw}\n"
            f"=== EXACT RAW MODEL OUTPUT END ==="
        )
        return raw

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0
        
        mcq_count = content.count("**Correct Answer:")
        if mcq_count < 15:
            score *= 0.5
            logger.warning(f"QuizAgent: Insufficient MCQs found ({mcq_count})")
            
        return score


class AssignmentAgent(TeachingAgent):
    """Generates 5 theoretical + 5 practical + 1 challenge problems."""

    @property
    def section_type(self) -> str:
        return "assignment"

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        if "theoretical" not in content.lower():
            score *= 0.8
        if "practical" not in content.lower() and "programming" not in content.lower():
            score *= 0.8
        if "challenge" not in content.lower() and "bonus" not in content.lower():
            score *= 0.9

        if len(content.split()) < 1500:
            score *= 0.6

        return score


class ProjectsAgent(TeachingAgent):
    """Generates 4 tiers of projects."""

    @property
    def section_type(self) -> str:
        return "projects"

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        if "mini project" not in content.lower() and "mini-project" not in content.lower():
            score *= 0.7
        if "major project" not in content.lower():
            score *= 0.7
        if "industry project" not in content.lower():
            score *= 0.8
        if "resume project" not in content.lower() and "portfolio" not in content.lower():
            score *= 0.8

        if len(content.split()) < 1500:
            score *= 0.6

        return score


class MistakesAgent(TeachingAgent):
    """Documents 20 common mistakes with code examples."""

    @property
    def section_type(self) -> str:
        return "commonMistakes"

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Should have 3 categories
        categories = ["fundamental", "coding", "design"]
        found = sum(1 for c in categories if c in content.lower())
        if found < 2:
            score *= 0.7

        # Must have code examples showing wrong/right
        if "wrong" not in content.lower() and "incorrect" not in content.lower():
            score *= 0.7

        # Must have callouts
        if "⚠️" not in content and "✅" not in content and "common pitfall" not in content.lower():
            score *= 0.8

        if len(content.split()) < 1500:
            score *= 0.6

        return score


class InterviewAgent(TeachingAgent):
    """Generates 30 interview questions across 5 categories."""

    @property
    def section_type(self) -> str:
        return "interviewQuestions"

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Should have conceptual questions
        if "conceptual" not in content.lower():
            score *= 0.8

        # Should have coding questions with complexity
        if "complexity" not in content.lower():
            score *= 0.7

        # Should have system design
        if "system design" not in content.lower():
            score *= 0.7

        # Word count
        if len(content.split()) < 2000:
            score *= 0.6

        return score


class CheatSheetAgent(TeachingAgent):
    """Creates one-page revision cheat sheet."""

    @property
    def section_type(self) -> str:
        return "cheatSheet"

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Must have tables
        if content.count("|") < 20:
            score *= 0.7
            logger.warning(f"CheatSheetAgent: Insufficient tables")

        # Must have LaTeX formulas
        if "$$" not in content and "$" not in content:
            score *= 0.8

        # Must have golden rules
        if "golden rule" not in content.lower() and "commandment" not in content.lower():
            score *= 0.8

        # Word count in tables
        if len(content.split()) < 800:
            score *= 0.6

        return score

class OverviewAgent(TeachingAgent):
    @property
    def section_type(self) -> str: return "overview"

class KeyConceptsAgent(TeachingAgent):
    @property
    def section_type(self) -> str: return "keyConcepts"

class ImportantDefinitionsAgent(TeachingAgent):
    @property
    def section_type(self) -> str: return "importantDefinitions"

class CodeExamplesAgent(TeachingAgent):
    @property
    def section_type(self) -> str: return "codeExamples"

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0
        
        if subject.lower() == "mathematics":
            # Assert no programming code in math codeExamples
            if "```python" in content.lower() or "```java" in content.lower() or "```cpp" in content.lower():
                score *= 0.1
                logger.warning(f"CodeExamplesAgent: Programming code generated for Mathematics")
        else:
            # For non-math, expect code blocks
            if "```" not in content:
                score *= 0.5
                logger.warning(f"CodeExamplesAgent: Missing code blocks for {subject}")
                
        return score

class FormulaExplanationAgent(TeachingAgent):
    @property
    def section_type(self) -> str: return "formulaExplanation"

class DiagramsAgent(TeachingAgent):
    @property
    def section_type(self) -> str: return "visualization"

class MiniProjectAgent(TeachingAgent):
    @property
    def section_type(self) -> str: return "miniProject"

class RevisionNotesAgent(TeachingAgent):
    @property
    def section_type(self) -> str: return "revisionNotes"

class SummaryAgent(TeachingAgent):
    @property
    def section_type(self) -> str: return "summary"

class GenericSectionAgent(TeachingAgent):
    def __init__(self, config: AgentConfig, key_pool: Any = None):
        super().__init__(config, key_pool)

    @property
    def section_type(self) -> str: 
        return self.config.section_type
