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
                finish_reason = None
                async for event in provider.complete_stream(request):
                    if event.error:
                        raise RuntimeError(event.error)
                    if event.content:
                        accumulated += event.content
                        yield {
                            "type": "section_chunk",
                            "section_type": self.section_type,
                            "content": event.content,
                        }
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
                    f"content_preview={content[:300]!r if content else 'None'}"
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
                else:
                    break

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
    """Generates the 30-section university lecture."""

    @property
    def section_type(self) -> str:
        return "explanation"

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0
        checks_log = []

        # Must have 30 section markers
        section_markers = [
            "BEAUTIFUL TITLE", "INTRODUCTION", "LEARNING OBJECTIVES",
            "WHY THIS TOPIC EXISTS", "INTUITION", "REAL-LIFE ANALOGY",
            "FORMAL DEFINITION", "MENTAL MODEL", "HOW IT WORKS INTERNALLY",
            "VISUAL DIAGRAM", "FLOWCHART", "SYNTAX", "STEP-BY-STEP EXAMPLE",
            "DRY RUN", "MEMORY VISUALIZATION", "EXECUTION TRACE",
            "COMMON VARIATIONS", "ADVANCED CONCEPTS", "BEST PRACTICES",
            "COMMON MISTAKES", "DEBUGGING TIPS", "TIME COMPLEXITY",
            "SPACE COMPLEXITY", "REAL-WORLD APPLICATIONS", "INTERVIEW PERSPECTIVE",
            "EXAM PERSPECTIVE", "SUMMARY", "KEY TAKEAWAYS", "REVISION NOTES", "TRANSITION"
        ]

        found = sum(1 for m in section_markers if m.upper() in content.upper())
        if found < 25:
            score *= 0.6
            checks_log.append(f"MissingSections: {found}/30 found")

        # Subject-aware length requirements
        words = len(content.split())
        min_words = 2000 if "programming" in subject.lower() or "math" in subject.lower() else 1500
        if words < min_words:
            score *= 0.5
            checks_log.append(f"ContentTooShort: {words} words < {min_words} for {subject}")

        # Must have code blocks — only required for programming/CS subjects
        is_no_code_subject = any(s in subject.lower() for s in ["mathematics", "math", "physics", "chemistry"])
        if not is_no_code_subject and "```" not in content:
            score *= 0.5
            checks_log.append(f"MissingCodeBlocks: no ``` in content for subject={subject!r}")

        # Mermaid diagrams are optional for math/physics/chemistry (can use LaTeX instead)
        if not is_no_code_subject and "mermaid" not in content.lower():
            score *= 0.8
            checks_log.append(f"MissingMermaidDiagram for subject={subject!r}")

        # LaTeX is required for math/physics subjects, and recommended for all
        if is_no_code_subject and "$" not in content:
            score *= 0.7
            checks_log.append(f"MissingLaTeXNotation for math/physics subject={subject!r}")

        if checks_log:
            logger.warning(f"[AGENT:explanation] SectionSpecificChecks FAILED: {checks_log}")
        else:
            logger.info(f"[AGENT:explanation] SectionSpecificChecks PASSED: {found}/30 markers, {words} words")

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
