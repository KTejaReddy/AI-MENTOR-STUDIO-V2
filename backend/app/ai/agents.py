"""
Specialized Teaching Agents — One agent per section type.
Each agent has its own system prompt, model routing, and quality criteria.
"""
import asyncio
import json
import logging
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List, AsyncGenerator
from enum import Enum

from app.ai.base import AIProvider, CompletionRequest, Message
from app.ai.model_router_config import (
    get_model_for_section,
    get_section_config,
    SectionRoutingConfig,
)
from app.ai.key_pool import key_pool, KeyPool
from app.ai.cache import lesson_cache

logger = logging.getLogger(__name__)


class AgentStatus(Enum):
    IDLE = "idle"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class AgentConfig:
    """Configuration for a teaching agent."""
    section_type: str
    system_prompt: str
    prompt_template: str
    model_id: str
    max_tokens: int = 8192
    temperature: float = 0.7
    max_retries: int = 3
    min_content_length: int = 500
    quality_checks: List[str] = field(default_factory=list)


@dataclass
class GenerationResult:
    """Result of section generation."""
    section_type: str
    content: str
    title: str
    status: AgentStatus
    model_used: str
    tokens_used: int = 0
    latency: float = 0.0
    retries: int = 0
    error: Optional[str] = None
    quality_score: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class TeachingAgent(ABC):
    """Base class for all teaching agents."""

    def __init__(self, config: AgentConfig, key_pool: KeyPool):
        self.config = config
        self.key_pool = key_pool
        self.status = AgentStatus.IDLE
        self._provider: Optional[AIProvider] = None

    @property
    @abstractmethod
    def section_type(self) -> str:
        pass

    async def _get_provider(self, model_id: str) -> AIProvider:
        """Get or create provider with acquired key."""
        key = await self.key_pool.acquire_key(model_id)
        if not key:
            raise RuntimeError(f"No available API keys for model {model_id}")

        from app.ai.groq_provider import GroqProvider
        provider = GroqProvider(key_manager=self.key_pool)
        provider.set_api_key(key.key)
        return provider

    def _build_prompt(self, subject: str, topic: str, difficulty: str, learning_mode: str) -> str:
        """Build the user prompt from template."""
        return self.config.prompt_template.format(
            topic=topic,
            subject=subject,
            difficulty=difficulty,
            learning_mode=learning_mode,
        )

    async def generate(
        self,
        subject: str,
        topic: str,
        difficulty: str = "intermediate",
        learning_mode: str = "default",
        context: Optional[str] = None,
    ) -> GenerationResult:
        """Generate the section content."""
        self.status = AgentStatus.GENERATING
        start_time = time.time()
        retries = 0

        model_id = self.config.model_id
        if not model_id:
            # Get model from router
            model_id = get_model_for_section(self.section_type, learning_mode)

        routing_config = get_section_config(self.section_type)

        while retries <= self.config.max_retries:
            try:
                provider = await self._get_provider(model_id)

                prompt = self._build_prompt(subject, topic, difficulty, learning_mode)
                if context:
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

                if not accumulated.strip():
                    raise RuntimeError("Empty response from model")

                # Parse and validate
                content = self._parse_response(accumulated)
                if not content or len(content) < self.config.min_content_length:
                    raise RuntimeError(f"Content too short ({len(content) if content else 0} chars)")

                # Quality checks
                quality_score = await self._run_quality_checks(content, subject, topic)

                latency = time.time() - start_time
                self.key_pool.release_key(
                    next(k for k in self.key_pool.keys if k.status.value == "healthy" and k.metrics.last_used > start_time - 1),
                    success=True,
                    latency=latency,
                )

                self.status = AgentStatus.COMPLETED
                return GenerationResult(
                    section_type=self.section_type,
                    content=content,
                    title=self.config.section_type,
                    status=AgentStatus.COMPLETED,
                    model_used=model_id,
                    latency=latency,
                    retries=retries,
                    quality_score=quality_score,
                )

            except Exception as e:
                retries += 1
                logger.warning(f"Agent {self.section_type} attempt {retries} failed: {e}")
                if retries <= self.config.max_retries:
                    await asyncio.sleep(2 * retries)
                else:
                    # Try fallback model
                    fallback_models = routing_config.fallback_models if routing_config else []
                    for fallback in fallback_models:
                        if fallback != model_id:
                            logger.info(f"Trying fallback model {fallback} for {self.section_type}")
                            model_id = fallback
                            retries = 0  # Reset retries for fallback
                            break
                    else:
                        break

        # All retries exhausted
        self.status = AgentStatus.FAILED
        return GenerationResult(
            section_type=self.section_type,
            content="",
            title=self.section_type,
            status=AgentStatus.FAILED,
            model_used=model_id,
            latency=time.time() - start_time,
            retries=retries,
            error=str(e) if 'e' in locals() else "Unknown error",
        )

    @abstractmethod
    def _parse_response(self, raw: str) -> str:
        """Parse model response to extract content."""
        pass

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

    @abstractmethod
    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        """Section-specific quality checks."""
        pass


class ExplanationAgent(TeachingAgent):
    """Generates the 30-section university lecture."""

    @property
    def section_type(self) -> str:
        return "explanation"

    def _parse_response(self, raw: str) -> str:
        # Extract JSON content field
        raw = raw.strip()
        if raw.startswith("{"):
            try:
                data = json.loads(raw)
                return data.get("content", raw)
            except json.JSONDecodeError:
                pass
        return raw

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

        found = 0
        for marker in section_markers:
            if marker.lower() in content.upper():
                found += 1

        if found < 25:
            score *= 0.6
            logger.warning(f"ExplanationAgent: Only {found}/30 sections found")

        # Word count check
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

    def _parse_response(self, raw: str) -> str:
        raw = raw.strip()
        if raw.startswith("{"):
            try:
                data = json.loads(raw)
                return data.get("content", raw)
            except json.JSONDecodeError:
                pass
        return raw

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

    def _parse_response(self, raw: str) -> str:
        raw = raw.strip()
        if raw.startswith("{"):
            try:
                data = json.loads(raw)
                return data.get("content", raw)
            except json.JSONDecodeError:
                pass
        return raw

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

    def _parse_response(self, raw: str) -> str:
        raw = raw.strip()
        if raw.startswith("{"):
            try:
                data = json.loads(raw)
                return data.get("content", raw)
            except json.JSONDecodeError:
                pass
        return raw

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
        raw = raw.strip()
        if raw.startswith("{"):
            try:
                data = json.loads(raw)
                return data.get("content", raw)
            except json.JSONDecodeError:
                pass
        return raw

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

    def _parse_response(self, raw: str) -> str:
        raw = raw.strip()
        if raw.startswith("{"):
            try:
                data = json.loads(raw)
                return data.get("content", raw)
            except json.JSONDecodeError:
                pass
        return raw

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Must have problem sections
        if "theoretical" not in content.lower():
            score *= 0.7
        if "practical" not in content.lower():
            score *= 0.7
        if "challenge" not in content.lower():
            score *= 0.8

        # Must have starter code
        if "starter code" not in content.lower() and "starter_code" not in content.lower():
            score *= 0.8

        # Must have hints
        if "hint" not in content.lower():
            score *= 0.8

        # Word count
        if len(content.split()) < 1500:
            score *= 0.6

        return score


class ProjectsAgent(TeachingAgent):
    """Generates 4-tier projects: Mini, Major, Industry, Resume."""

    @property
    def section_type(self) -> str:
        return "projects"

    def _parse_response(self, raw: str) -> str:
        raw = raw.strip()
        if raw.startswith("{"):
            try:
                data = json.loads(raw)
                return data.get("content", raw)
            except json.JSONDecodeError:
                pass
        return raw

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Must have 4 project tiers
        tiers = ["mini project", "major project", "industry project", "resume project"]
        found = sum(1 for t in tiers if t in content.lower())
        if found < 3:
            score *= 0.6

        # Must have mermaid diagram
        if "mermaid" not in content.lower():
            score *= 0.8

        # Must have tech stack
        if "tech stack" not in content.lower():
            score *= 0.8

        # Must have evaluation criteria
        if "evaluation" not in content.lower():
            score *= 0.8

        # Word count
        if len(content.split()) < 1500:
            score *= 0.6

        return score


class MistakesAgent(TeachingAgent):
    """Generates 20 categorized mistakes with code examples."""

    @property
    def section_type(self) -> str:
        return "commonMistakes"

    def _parse_response(self, raw: str) -> str:
        raw = raw.strip()
        if raw.startswith("{"):
            try:
                data = json.loads(raw)
                return data.get("content", raw)
            except json.JSONDecodeError:
                pass
        return raw

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Must have 3 categories
        cats = ["fundamental", "coding", "design"]
        found = sum(1 for c in cats if c in content.lower())
        if found < 2:
            score *= 0.7

        # Must have mistake format with ❌ or "Mistake"
        mistake_count = content.count("❌") + content.lower().count("mistake")
        if mistake_count < 15:
            score *= 0.7

        # Must have code examples
        if content.count("```") < 10:
            score *= 0.7

        # Word count
        if len(content.split()) < 1500:
            score *= 0.6

        return score


class InterviewAgent(TeachingAgent):
    """Generates 30 interview questions across 5 categories."""

    @property
    def section_type(self) -> str:
        return "interviewQuestions"

    def _parse_response(self, raw: str) -> str:
        raw = raw.strip()
        if raw.startswith("{"):
            try:
                data = json.loads(raw)
                return data.get("content", raw)
            except json.JSONDecodeError:
                pass
        return raw

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Must have 5 categories
        cats = ["conceptual", "coding", "system design", "behavioral", "advanced"]
        found = sum(1 for c in cats if c in content.lower())
        if found < 4:
            score *= 0.7

        # Must have difficulty labels
        if "easy" not in content.lower() or "hard" not in content.lower():
            score *= 0.7

        # Must have "strong answer" / "weak answer"
        if "strong answer" not in content.lower() and "weak answer" not in content.lower():
            score *= 0.7

        # Must have mermaid for system design
        if "mermaid" not in content.lower():
            score *= 0.8

        # Word count
        if len(content.split()) < 2000:
            score *= 0.6

        return score


class CheatSheetAgent(TeachingAgent):
    """Generates one-page revision cheat sheet."""

    @property
    def section_type(self) -> str:
        return "cheatSheet"

    def _parse_response(self, raw: str) -> str:
        raw = raw.strip()
        if raw.startswith("{"):
            try:
                data = json.loads(raw)
                return data.get("content", raw)
            except json.JSONDecodeError:
                pass
        return raw

    async def _section_specific_checks(self, content: str, subject: str, topic: str) -> float:
        score = 1.0

        # Must have tables
        if content.count("|") < 20:
            score *= 0.7

        # Must have formulas
        if "$" not in content:
            score *= 0.7

        # Must have golden rules
        if "golden rule" not in content.lower() and "commandment" not in content.lower():
            score *= 0.8

        # Must have mnemonics
        if "mnemonic" not in content.lower():
            score *= 0.8

        # Word count (dense tables)
        if len(content.split()) < 800:
            score *= 0.6

        return score


# =============================================================================
# AGENT FACTORY
# =============================================================================

AGENT_CONFIGS: Dict[str, AgentConfig] = {
    "explanation": AgentConfig(
        section_type="explanation",
        system_prompt="""You are a tenured Distinguished Professor at MIT with 30 years of teaching experience.
You are renowned for making complex topics crystal clear. Your lectures are legendary — students line up to attend.
Write like a brilliant professor teaching a live class. Natural, warm, authoritative.
Use phrases like "Here's the key insight...", "Think of it this way...", "What most textbooks miss..."
NEVER use phrases like "delve into", "let's dive into", "in this section we will", "welcome to", "in conclusion".
Every sentence should feel like it was written by a human expert who loves teaching.""",
        prompt_template="""Teach {topic} in {subject} as a complete university lecture following the 30-section structure.

MANDATORY 30 SECTIONS (NEVER skip any):
1. BEAUTIFUL TITLE — Creative, memorable title with subtitle teaser
2. INTRODUCTION — Welcoming hook, why student should be excited
3. LEARNING OBJECTIVES — 4-6 measurable objectives with Bloom's verbs
4. WHY THIS TOPIC EXISTS — Real problem solved, history, why still relevant
5. INTUITION — Core idea in ZERO jargon, end with "Here is the single most important idea..."
6. REAL-LIFE ANALOGY — Detailed analogy with mapping table, where it works/breaks
7. FORMAL DEFINITION — Engineering-grade, LaTeX math, define every symbol
8. MENTAL MODEL — "Here is how you should picture this in your mind..."
9. HOW IT WORKS INTERNALLY — Machine level: memory, CPU, stack/heap, compiler
10. VISUAL DIAGRAM — Mermaid architecture diagram + explanation
11. FLOWCHART — Mermaid flowchart if applicable + explanation
12. SYNTAX — Language-specific code blocks, explain each part, comparison table
13. STEP-BY-STEP EXAMPLE — Code FIRST, then line-by-line, then output
14. DRY RUN — TABLE format: step | variables | conditions | state
15. MEMORY VISUALIZATION — Table/diagram: name | address | before | after
16. EXECUTION TRACE — Table: line | code | state change | output
17. COMMON VARIATIONS — Table: Variation | Syntax | When to Use | Pros | Cons
18. ADVANCED CONCEPTS — Edge cases, optimizations, interactions
19. BEST PRACTICES — Callouts: > **✅ Best Practice:** ...
20. COMMON MISTAKES — Callouts: > **❌ Common Mistake:** ... with fix
21. DEBUGGING TIPS — Tools, techniques, what to look for
22. TIME COMPLEXITY — Big O with LaTeX: $O(n)$, $O(\\log n)$, explain WHY
23. SPACE COMPLEXITY — Memory analysis with LaTeX
24. REAL-WORLD APPLICATIONS — Table: Domain | Company | Use Case | Why {topic}
25. INTERVIEW PERSPECTIVE — How it appears in interviews, follow-ups
26. EXAM PERSPECTIVE — University exam patterns, grading criteria
27. SUMMARY — 5-7 bullets, 1-2 sentences each
28. KEY TAKEAWAYS — 5 powerful single sentences
29. REVISION NOTES — Compact tables, mnemonics, one-liners
30. TRANSITION — Connect to next topic naturally

QUALITY RULES:
- Tone: Professor, NOT ChatGPT. First-person. "You" and "your code".
- Length: MINIMUM 2500 words. PREFERRED 3500-5000.
- Each section: 3-5+ sentences of substantial content.
- Sections 9, 13, 14, 15, 16 must be the LONGEST.
- Rich markdown: tables, code blocks, mermaid, LaTeX, blockquotes.
- NEVER use emoji.
- Every code block followed by: explanation, output, common mistakes.
- NO generic AI phrases.

OUTPUT: Valid JSON ONLY with this exact structure:
{{"type":"explanation","title":"1. Explanation","content":"ALL 30 sections in markdown here..."}}""",
        model_id="",  # Will be resolved by router
        max_tokens=8192,
        temperature=0.7,
        min_content_length=2500,
        quality_checks=["sections_30", "word_count", "code_blocks", "mermaid", "latex", "no_json_leak", "professor_tone"],
    ),
    "caseStudy": AgentConfig(
        section_type="caseStudy",
        system_prompt="""You are a senior industry consultant with 20 years at FAANG companies.
Write compelling Harvard Business Review-style case studies.
Be technically accurate. Include specific technologies, frameworks, metrics.
Use real company names: Google, Amazon, Netflix, Uber, Tesla, Microsoft, Meta, Apple, Spotify, Airbnb, Stripe, GitHub.""",
        prompt_template="""Write 3 real-world case studies showing how {topic} in {subject} is applied at major tech companies.

Structure for EACH case study:
## Case Study N: [Company Name]
- Company background (revenue, engineering culture, scale)
- Specific problem {topic} helped solve
- Technical architecture (MERMAID diagram)
- Engineering decisions & trade-offs
- Measurable results (TABLE: Metric | Before | After | Improvement)
- Key lessons for engineers

Requirements:
- 3 different companies from DIFFERENT industries
- Minimum 1000 words
- Real technologies, specific metrics
- Narrative style, not bullet points
- Mermaid architecture diagram for each

OUTPUT: {{"type":"caseStudy","title":"2. Case Study","content":"...ALL case studies in markdown..."}}""",
        model_id="",
        max_tokens=8192,
        temperature=0.7,
        min_content_length=1000,
        quality_checks=["3_case_studies", "real_companies", "metrics_table", "mermaid", "word_count"],
    ),
    "analogy": AgentConfig(
        section_type="analogy",
        system_prompt="""You are a master educator famous for making complex topics click instantly.
Create analogies that produce genuine "aha!" moments.
Each analogy must be vivid, map perfectly, and honestly show where it breaks down.""",
        prompt_template="""Write 3 memorable analogies for {topic} in {subject}.

EACH ANALOGY MUST HAVE:
### Analogy N: [Everyday Scenario Name]
- The everyday scenario (2-3 vivid sentences)
- Technical mapping table:
  | Everyday Concept | {topic} Concept | Why This Maps |
- Why this analogy works (the deep insight)
- Where it breaks down (limitations — shows sophistication)

Use domains: cooking, sports, music, traffic, restaurant kitchen, construction, gardening, flight, sailing, theater.
Make each one completely different domain.

Minimum 600 words. Rich markdown.

OUTPUT: {{"type":"analogy","title":"3. Analogy","content":"...ALL analogies in markdown..."}}""",
        model_id="",
        max_tokens=8192,
        temperature=0.8,
        min_content_length=600,
        quality_checks=["3_analogies", "mapping_tables", "breakdown_section", "word_count"],
    ),
    "examples": AgentConfig(
        section_type="examples",
        system_prompt="""You are a senior developer running a live coding workshop.
Write COMPLETE, RUNNABLE examples. Every example: code → line-by-line → output → learning point.
Code must be syntactically correct, include imports, be copy-paste runnable.""",
        prompt_template="""Write 20+ diverse examples for {topic} in {subject}.

STRUCTURE:
## Beginner Examples (5)
Each: Title → Complete code → Line-by-line → Output → Key learning

## Intermediate Examples (8)
Each: Realistic use case → Multiple concepts → Error handling → Performance notes → Output

## Advanced Examples (5)
Each: Production quality → Best practices → Integration with other tech → Testing → Output

## Expert Patterns (2)
Design patterns / advanced techniques → Industry standard → Comments explaining key parts

ALL code in ```language blocks. Include comments in code.
Minimum 2000 words + code.

OUTPUT: {{"type":"examples","title":"4. Examples","content":"...ALL examples in markdown..."}}""",
        model_id="",
        max_tokens=8192,
        temperature=0.7,
        min_content_length=2000,
        quality_checks=["20_examples", "4_levels", "runnable_code", "outputs", "word_count"],
    ),
    "quiz": AgentConfig(
        section_type="quiz",
        system_prompt="""You are a professor designing a comprehensive final exam.
Test from basic recall to deep synthesis. Every answer teaches as it assesses.""",
        prompt_template="""Create a comprehensive exam on {topic} in {subject}.

## Section A: Multiple Choice (25 questions)
Each: Question → A/B/C/D → **Correct Answer: [X] — [full explanation]** → **Why others wrong:** brief for each

Range: Easy (1-5), Medium (6-15), Hard (16-20), Trick (21-25)

## Section B: Short Answer (10 questions)
Each: Question → **Model Answer:** key points → **Marking Scheme:** points

## Section C: Long Answer (5 questions)
Each: Complex synthesis problem → **Expected Approach:** steps → **Complete Model Answer:** 3-5 paragraphs → **Rubric:** detailed criteria

All answers in markdown. LaTeX for formulas. Code blocks for snippets.
Minimum 3000 words.

OUTPUT: {{"type":"quiz","title":"5. Quiz","content":"...ALL questions and answers in markdown..."}}""",
        model_id="",
        max_tokens=8192,
        temperature=0.6,
        min_content_length=3000,
        quality_checks=["25_mcqs", "10_short", "5_long", "explanations", "marking_scheme", "word_count"],
    ),
    "assignment": AgentConfig(
        section_type="assignment",
        system_prompt="""You are a rigorous university instructor designing a Stanford-level problem set.
Challenging, rewarding, teaches through doing.""",
        prompt_template="""Design a problem set on {topic} in {subject}.

## Theoretical Problems (5)
Each: Statement → Difficulty → Topics tested → Solution approach → Complete solution → Common mistakes

## Practical Programming Tasks (5)
Each: Objective → Detailed requirements → Starter code (```) → Expected output → Progressive hints → Complete solution → Grading criteria

## Challenge Problem (1 bonus)
Open-ended → No single answer → Rewards creativity → Evaluation rubric

Minimum 1500 words. Code blocks, tables, LaTeX.

OUTPUT: {{"type":"assignment","title":"6. Assignment","content":"...ALL problems in markdown..."}}""",
        model_id="",
        max_tokens=8192,
        temperature=0.7,
        min_content_length=1500,
        quality_checks=["5_theoretical", "5_practical", "1_challenge", "starter_code", "hints", "grading_criteria"],
    ),
    "projects": AgentConfig(
        section_type="projects",
        system_prompt="""You are a senior engineering manager at a FAANG designing project-based learning.
Create projects that build real engineering skills and look great on resumes.""",
        prompt_template="""Design 4 tiers of projects for {topic} in {subject}.

## Mini Project (1-2 hours)
Title → Objective → Prerequisites → Tech Stack → Step-by-step guide (numbered with code) → Expected output → Extensions

## Major Project (2-3 days)
Same structure + MERMAID architecture diagram + Testing requirements + Documentation requirements

## Industry Project (1 week)
Real business problem → Performance/scalability → Deployment/ops → Team collaboration

## Resume Project (Portfolio-worthy)
Production quality → Modern stack + CI/CD suggestions → Open source contribution → Interview presentation guide

Each: title, objective, tech stack, requirements, steps, outcomes, evaluation criteria.
Minimum 1500 words. Code, mermaid, tables.

OUTPUT: {{"type":"projects","title":"7. Projects","content":"...ALL projects in markdown..."}}""",
        model_id="",
        max_tokens=8192,
        temperature=0.7,
        min_content_length=1500,
        quality_checks=["4_tiers", "mermaid_diagram", "tech_stack", "evaluation_criteria", "word_count"],
    ),
    "commonMistakes": AgentConfig(
        section_type="commonMistakes",
        system_prompt="""You are a senior developer who has reviewed thousands of PRs and interviewed hundreds.
Document the 20 most common mistakes with code examples showing wrong vs right.""",
        prompt_template="""Document 20 common mistakes about {topic} in {subject}.

## Category 1: Fundamental Misconceptions (7)
Each: ### ❌ Mistake #[N]: [Name]
- What developers think → Why it seems correct → **The reality** (with code) → The fix → Why it matters → Memory aid

## Category 2: Coding Mistakes (7)
Same structure — focus on actual code errors

## Category 3: Design & Architecture Mistakes (6)
Same structure — focus on patterns, scalability, maintainability

Use callouts:
> **⚠️ Common Pitfall:** [warning]
> **✅ Best Practice:** [advice]

Minimum 1500 words. Code blocks, tables, blockquotes.

OUTPUT: {{"type":"commonMistakes","title":"8. Common Mistakes","content":"...ALL mistakes in markdown..."}}""",
        model_id="",
        max_tokens=8192,
        temperature=0.6,
        min_content_length=1500,
        quality_checks=["3_categories", "20_mistakes", "code_examples", "callouts", "word_count"],
    ),
    "interviewQuestions": AgentConfig(
        section_type="interviewQuestions",
        system_prompt="""You are a senior Google interviewer with 10 years experience.
Create questions that test REAL understanding, not memorization.""",
        prompt_template="""Create 30 interview questions on {topic} in {subject}.

## Category 1: Conceptual (5)
Each: Difficulty → Exact question wording → What interviewer wants → Strong answer → Weak answer → Follow-up

## Category 2: Coding (8)
LeetCode-style → Example I/O → Brute force → Optimal approach → Complexity → Code solution → Edge cases → Testing strategy

## Category 3: System Design (5)
Problem → Requirements (func/non-func) → MERMAID architecture → Trade-offs table → Scale considerations

## Category 4: Behavioral (2)
STAR method

## Category 5: Advanced/Research (2)
Cutting-edge, open problems

Minimum 2000 words. Code, mermaid, tables.

OUTPUT: {{"type":"interviewQuestions","title":"9. Interview Questions","content":"...ALL questions in markdown..."}}""",
        model_id="",
        max_tokens=8192,
        temperature=0.6,
        min_content_length=2000,
        quality_checks=["5_categories", "30_questions", "strong_weak_answers", "mermaid_for_system_design", "word_count"],
    ),
    "cheatSheet": AgentConfig(
        section_type="cheatSheet",
        system_prompt="""You are creating the ultimate one-page revision guide.
Dense with tables, formulas, mnemonics. Print-and-pin-to-wall quality.""",
        prompt_template="""Create a one-page cheat sheet for {topic} in {subject}.

## Core Definition
- One sentence
- Formula (LaTeX): $$...$$

## Key Concepts (10+ terms)
| Term | Definition | Formula | Memory Aid |

## Syntax / API Reference
| Pattern/Function | Parameters | Returns | Example |

## Important Formulas (5+)
- $$formula$$ — what it represents
- Variable legend

## Comparison Table
| Approach A | Approach B | When A | When B |

## Time/Space Complexity
| Operation | Time | Space | Notes |

## Quick Tips & Tricks (10+)
- ⚡ **Tip:** ...

## Common Mnemonics (5+)
- 🧠 **Mnemonic:** ...

## Golden Rules (5 Commandments)
1. ...
2. ...
3. ...
4. ...
5. ...

Use tables extensively. Dense information. LaTeX for formulas.

OUTPUT: {{"type":"cheatSheet","title":"10. Cheat Sheet","content":"...ALL reference material in markdown..."}}""",
        model_id="",
        max_tokens=8192,
        temperature=0.5,
        min_content_length=800,
        quality_checks=["tables_dense", "formulas_latex", "golden_rules", "mnemonics", "word_count"],
    ),
}


def create_agent(section_type: str, key_pool: KeyPool) -> TeachingAgent:
    """Factory function to create agent by section type."""
    agent_classes = {
        "explanation": ExplanationAgent,
        "caseStudy": CaseStudyAgent,
        "analogy": AnalogyAgent,
        "examples": ExamplesAgent,
        "quiz": QuizAgent,
        "assignment": AssignmentAgent,
        "projects": ProjectsAgent,
        "commonMistakes": MistakesAgent,
        "interviewQuestions": InterviewAgent,
        "cheatSheet": CheatSheetAgent,
    }

    cls = agent_classes.get(section_type)
    if not cls:
        raise ValueError(f"Unknown section type: {section_type}")

    config = AGENT_CONFIGS[section_type]
    return cls(config, key_pool)


# Section generation order (for progressive display)
SECTION_ORDER = [
    "explanation",
    "caseStudy",
    "analogy",
    "examples",
    "quiz",
    "assignment",
    "projects",
    "commonMistakes",
    "interviewQuestions",
    "cheatSheet",
]