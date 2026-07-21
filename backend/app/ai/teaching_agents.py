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

        # Select the best model dynamically using the updated ModelRouter with quotas and specialization
        model_id = get_model_for_section(self.section_type, difficulty=context.get("complexity", "moderate") if isinstance(context, dict) else "intermediate", engine_id=engine_id)
        routing_config = get_section_config(self.section_type)
        fallback_queue = model_router.get_fallback_chain(self.section_type)
        if model_id in fallback_queue:
            fallback_queue.remove(model_id)

        while retries <= self.config.max_retries:
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

                if not accumulated.strip():
                    raise RuntimeError("Empty response from model")

                # Parse response
                content = self._parse_response(accumulated)
                if not content or len(content) < self.config.min_content_length:
                    raise RuntimeError(f"Content too short ({len(content) if content else 0} chars)")

                # Quality checks
                quality_score = await self._run_quality_checks(content, subject, topic)

                latency = time.time() - start_time
                self._release_key(model_id, True, latency)

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
                retries += 1
                self._release_key(model_id, False, 0.0, str(e))
                logger.warning(f"Agent {self.section_type} attempt {retries} failed: {e}")
                if retries <= self.config.max_retries:
                    yield {
                        "type": "section_clear",
                        "section_type": self.section_type,
                    }
                    await asyncio.sleep(2 * retries)
                    # Try fallback model
                    if fallback_queue:
                        fallback = fallback_queue.pop(0)
                        logger.info(f"Trying fallback model {fallback} for {self.section_type}")
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
        yield GenerationResult(
            section_type=self.section_type,
            content="",
            title=self.config.section_type,
            status=AgentStatus.FAILED,
            model_used=model_id,
            latency=time.time() - start_time,
            retries=retries,
            error=str(e) if 'e' in locals() else "Unknown error",
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

        # Check 1: Minimum length
        min_len = self.config.min_content_length
        if len(content) < min_len:
            score *= 0.5
            logger.warning(f"{self.section_type}: Content too short ({len(content)} < {min_len})")

        # Check 2: Has markdown structure
        if "##" not in content and "|" not in content and "```" not in content:
            score *= 0.8
            logger.warning(f"{self.section_type}: Missing markdown structure")

        # Check 3: No JSON leakage
        if content.strip().startswith("{") and '"content"' in content[:200]:
            score *= 0.3
            logger.warning(f"{self.section_type}: JSON leakage detected")

        # Check 4: No generic AI phrases
        ai_phrases = [
            "delve into", "let's dive into", "in this section we will",
            "welcome to", "in conclusion", "certainly!", "hope this helps"
        ]
        for phrase in ai_phrases:
            if phrase.lower() in content.lower():
                score *= 0.9

        # Section-specific checks
        score *= await self._section_specific_checks(content, subject, topic)

        return max(0.0, min(1.0, score))

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        """Section-specific quality checks. Subclasses override this."""
        return 1.0

    def _parse_response(self, raw: str) -> str:
        """Parse model response to extract content."""
        raw = raw.strip()
        if raw.startswith("{"):
            try:
                data = json.loads(raw)
                return data.get("content", raw)
            except json.JSONDecodeError:
                pass
        return raw


class ExplanationAgent(TeachingAgent):
    """Generates the 30-section university lecture."""

    @property
    def section_type(self) -> str:
        return "explanation"

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Must have all 30 section markers
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
            logger.warning(f"ExplanationAgent: Only {found}/30 sections found")

        # Word count
        words = len(content.split())
        if words < 2500:
            score *= 0.5
            logger.warning(f"ExplanationAgent: Only {words} words (min 2500)")

        # Must have code blocks
        if "```" not in content:
            score *= 0.7

        # Must have mermaid
        if "mermaid" not in content.lower():
            score *= 0.8

        # Must have LaTeX
        if "$" not in content:
            score *= 0.9

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

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Check question counts
        mcq_count = content.count("**Correct Answer:")
        if mcq_count < 20:
            score *= 0.6
            logger.warning(f"QuizAgent: Only {mcq_count} MCQs found")

        short_count = content.lower().count("short answer")
        if short_count < 8:
            score *= 0.7

        long_count = content.lower().count("long answer")
        if long_count < 4:
            score *= 0.7

        # Must have explanations for all
        if "**Why others are wrong:**" not in content and "why others are wrong" not in content.lower():
            score *= 0.7

        # Word count
        if len(content.split()) < 3000:
            score *= 0.6

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

class FormulaExplanationAgent(TeachingAgent):
    @property
    def section_type(self) -> str: return "formulaExplanation"

class DiagramsAgent(TeachingAgent):
    @property
    def section_type(self) -> str: return "diagrams"

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
