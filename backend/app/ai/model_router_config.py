"""
Model Router Configuration — All 13 available Groq models, intelligently routed.
Updated for maximum performance: parallel wave execution with full model utilization.
"""
from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ModelConfig(BaseModel):
    """Configuration for a single model."""
    id: str
    provider: str = "groq"
    category: str  # "reasoning", "general", "fast", "coding", "safety"
    max_tokens: int = 8192
    temperature: float = 0.7
    cost_tier: str = "standard"  # "low", "standard", "high"
    description: str = ""
    context_window: int = 8192


class SectionRoutingConfig(BaseModel):
    """Routing configuration for a specific lesson section."""
    section_type: str
    preferred_models: List[str] = Field(default_factory=list)
    fallback_models: List[str] = Field(default_factory=list)
    max_tokens: int = 4096
    temperature: float = 0.7
    requires_reasoning: bool = False
    description: str = ""


# =============================================================================
# MODEL REGISTRY — All 13 confirmed Groq API models
# =============================================================================
MODEL_REGISTRY: Dict[str, ModelConfig] = {

    # ── Llama 3.3 70B — Best for deep explanations, complex reasoning ──
    "llama-3.3-70b-versatile": ModelConfig(
        id="llama-3.3-70b-versatile",
        category="reasoning",
        max_tokens=32768,
        context_window=128000,
        temperature=0.7,
        cost_tier="standard",
        description="Meta Llama 3.3 70B — Best for complex explanations and multi-step reasoning",
    ),

    # ── Llama 3.1 8B — Ultra-fast for summaries, cheat sheets ──
    "llama-3.1-8b-instant": ModelConfig(
        id="llama-3.1-8b-instant",
        category="fast",
        max_tokens=8192,
        context_window=128000,
        temperature=0.7,
        cost_tier="low",
        description="Meta Llama 3.1 8B — Ultra-fast for structured outputs and summaries",
    ),

    # ── Llama 4 Scout 17B — Strong balanced model ──
    "meta-llama/llama-4-scout-17b-16e-instruct": ModelConfig(
        id="meta-llama/llama-4-scout-17b-16e-instruct",
        category="general",
        max_tokens=8192,
        context_window=131072,
        temperature=0.7,
        cost_tier="standard",
        description="Meta Llama 4 Scout — Efficient MoE model with strong instruction following",
    ),

    # ── Qwen 3 32B — Creative, analogies, code examples ──
    "qwen/qwen3-32b": ModelConfig(
        id="qwen/qwen3-32b",
        category="reasoning",
        max_tokens=32768,
        context_window=131072,
        temperature=0.7,
        cost_tier="standard",
        description="Qwen 3 32B — Creative reasoning, analogies, code generation",
    ),

    # ── Qwen 3.6 27B — Structured MCQ, quiz, mistakes ──
    "qwen/qwen3.6-27b": ModelConfig(
        id="qwen/qwen3.6-27b",
        category="general",
        max_tokens=16384,
        context_window=131072,
        temperature=0.6,
        cost_tier="standard",
        description="Qwen 3.6 27B — Structured output, quiz, analytical sections",
    ),

    # ── OpenAI GPT-OSS 120B — Largest model, case studies, interview ──
    "openai/gpt-oss-120b": ModelConfig(
        id="openai/gpt-oss-120b",
        category="reasoning",
        max_tokens=16384,
        context_window=128000,
        temperature=0.7,
        cost_tier="high",
        description="OpenAI GPT-OSS 120B — Largest available, best for complex case studies",
    ),

    # ── OpenAI GPT-OSS 20B — Fast mid-tier for assignments ──
    "openai/gpt-oss-20b": ModelConfig(
        id="openai/gpt-oss-20b",
        category="general",
        max_tokens=8192,
        context_window=128000,
        temperature=0.7,
        cost_tier="standard",
        description="OpenAI GPT-OSS 20B — Fast mid-tier for structured assignments",
    ),

    # ── Groq Compound — Best for topic analysis and planning ──
    "groq/compound": ModelConfig(
        id="groq/compound",
        category="reasoning",
        max_tokens=8192,
        context_window=128000,
        temperature=0.3,
        cost_tier="standard",
        description="Groq Compound — Multi-model compound for analysis and planning",
    ),

    # ── Groq Compound Mini — Fast planner ──
    "groq/compound-mini": ModelConfig(
        id="groq/compound-mini",
        category="fast",
        max_tokens=4096,
        context_window=128000,
        temperature=0.3,
        cost_tier="low",
        description="Groq Compound Mini — Ultra-fast planning and validation",
    ),

    # ── Allam 2 7B — Fast Arabic/multilingual fallback ──
    "allam-2-7b": ModelConfig(
        id="allam-2-7b",
        category="fast",
        max_tokens=4096,
        context_window=4096,
        temperature=0.7,
        cost_tier="low",
        description="Allam 2 7B — Fast general purpose fallback",
    ),

    # ── Safety models ──
    "openai/gpt-oss-safeguard-20b": ModelConfig(
        id="openai/gpt-oss-safeguard-20b",
        category="safety",
        max_tokens=4096,
        context_window=128000,
        temperature=0.1,
        cost_tier="standard",
        description="OpenAI GPT-OSS Safeguard — Content safety and moderation",
    ),
    "meta-llama/llama-prompt-guard-2-86m": ModelConfig(
        id="meta-llama/llama-prompt-guard-2-86m",
        category="safety",
        max_tokens=512,
        context_window=512,
        temperature=0.1,
        cost_tier="low",
        description="Llama Prompt Guard 2 86M — Prompt injection detection",
    ),
    "meta-llama/llama-prompt-guard-2-22m": ModelConfig(
        id="meta-llama/llama-prompt-guard-2-22m",
        category="safety",
        max_tokens=512,
        context_window=512,
        temperature=0.1,
        cost_tier="low",
        description="Llama Prompt Guard 2 22M — Ultra-fast prompt injection detection",
    ),
}

# =============================================================================
# NAMED ALIASES — used in routing table below for readability
# =============================================================================
_LLAMA70B   = "llama-3.3-70b-versatile"
_LLAMA8B    = "llama-3.1-8b-instant"
_LLAMA4S    = "meta-llama/llama-4-scout-17b-16e-instruct"
_QWEN32B    = "qwen/qwen3-32b"
_QWEN27B    = "qwen/qwen3.6-27b"
_GPT120B    = "openai/gpt-oss-120b"
_GPT20B     = "openai/gpt-oss-20b"
_COMPOUND   = "groq/compound"
_COMPOUND_M = "groq/compound-mini"
_ALLAM      = "allam-2-7b"


# =============================================================================
# SECTION ROUTING TABLE — Maximum intelligence per section
# =============================================================================
SECTION_ROUTING: Dict[str, SectionRoutingConfig] = {

    # Explanation — needs the very best reasoning model
    "explanation": SectionRoutingConfig(
        section_type="explanation",
        preferred_models=[_LLAMA70B, _GPT120B],
        fallback_models=[_QWEN32B, _LLAMA4S],
        max_tokens=6144,
        temperature=0.7,
        requires_reasoning=True,
        description="Full university lecture — rich, deep, textbook-quality with diagrams",
    ),

    # Case Study — largest model, real-world reasoning depth
    "caseStudy": SectionRoutingConfig(
        section_type="caseStudy",
        preferred_models=[_GPT120B, _LLAMA70B],
        fallback_models=[_QWEN32B, _LLAMA4S],
        max_tokens=5120,
        temperature=0.7,
        requires_reasoning=True,
        description="Industry case studies with architecture and decision analysis",
    ),

    # Analogy — creative, vivid, fast
    "analogy": SectionRoutingConfig(
        section_type="analogy",
        preferred_models=[_QWEN32B, _LLAMA70B],
        fallback_models=[_LLAMA8B, _LLAMA4S],
        max_tokens=3072,
        temperature=0.85,
        requires_reasoning=False,
        description="Memorable real-world analogies for intuition building",
    ),

    # Examples — code quality + correctness
    "examples": SectionRoutingConfig(
        section_type="examples",
        preferred_models=[_QWEN27B, _LLAMA70B],
        fallback_models=[_QWEN32B, _LLAMA4S],
        max_tokens=5120,
        temperature=0.65,
        requires_reasoning=True,
        description="Complete runnable code examples with step-by-step explanations",
    ),

    # Quiz — structured MCQ with precise correct answers
    "quiz": SectionRoutingConfig(
        section_type="quiz",
        preferred_models=[_LLAMA8B, _LLAMA70B],
        fallback_models=[_LLAMA4S, _GPT20B],
        max_tokens=5000,
        temperature=0.3,
        requires_reasoning=False,
        description="10 MCQs + short answer + long answer with detailed explanations",
    ),

    # Assignment — graded problems with hints
    "assignment": SectionRoutingConfig(
        section_type="assignment",
        preferred_models=[_GPT20B, _LLAMA70B],
        fallback_models=[_LLAMA4S, _QWEN27B],
        max_tokens=4096,
        temperature=0.7,
        requires_reasoning=True,
        description="Graded assignments with problems, hints and expected solutions",
    ),

    # Projects — creative planning + specifications
    "miniProject": SectionRoutingConfig(
        section_type="miniProject",
        preferred_models=[_LLAMA70B, _GPT20B],
        fallback_models=[_QWEN32B, _LLAMA4S],
        max_tokens=4096,
        temperature=0.75,
        requires_reasoning=True,
        description="Mini/Major/Industry projects with full specs and roadmap",
    ),

    # Common Mistakes — analytical but lighter weight
    "commonMistakes": SectionRoutingConfig(
        section_type="commonMistakes",
        preferred_models=[_QWEN27B, _LLAMA4S],
        fallback_models=[_LLAMA8B, _QWEN32B],
        max_tokens=3072,
        temperature=0.6,
        requires_reasoning=False,
        description="Categorized anti-patterns, common errors and corrections",
    ),

    # Interview Questions — deep knowledge + structured responses
    "interviewQuestions": SectionRoutingConfig(
        section_type="interviewQuestions",
        preferred_models=[_LLAMA70B, _GPT120B],
        fallback_models=[_GPT120B, _QWEN32B, _LLAMA4S],
        max_tokens=5120,
        temperature=0.6,
        requires_reasoning=True,
        description="Conceptual, coding, system design and behavioral interview Q&A",
    ),

    # Cheat Sheet — fast summary, ultra-concise
    "cheatSheet": SectionRoutingConfig(
        section_type="cheatSheet",
        preferred_models=[_LLAMA8B, _LLAMA4S],
        fallback_models=[_ALLAM, _QWEN27B],
        max_tokens=2048,
        temperature=0.5,
        requires_reasoning=False,
        description="One-page quick reference: tables, formulas, golden rules",
    ),

    # ── New sections ──────────────────────────────────────────────────────

    "overview": SectionRoutingConfig(
        section_type="overview",
        preferred_models=[_LLAMA8B, _LLAMA70B],
        fallback_models=[_LLAMA4S, _QWEN27B],
        max_tokens=1024,
        temperature=0.7,
        requires_reasoning=False,
        description="High-level topic overview with learning roadmap",
    ),
    "keyConcepts": SectionRoutingConfig(
        section_type="keyConcepts",
        preferred_models=[_LLAMA70B, _QWEN27B],
        fallback_models=[_LLAMA4S, _LLAMA8B],
        max_tokens=3072,
        temperature=0.6,
        requires_reasoning=False,
        description="8-15 key concepts with definitions and relationships",
    ),
    "importantDefinitions": SectionRoutingConfig(
        section_type="importantDefinitions",
        preferred_models=[_QWEN27B, _LLAMA70B],
        fallback_models=[_LLAMA4S, _LLAMA8B],
        max_tokens=3072,
        temperature=0.6,
        requires_reasoning=False,
        description="10-20 precise definitions with context and examples",
    ),
    "codeExamples": SectionRoutingConfig(
        section_type="codeExamples",
        preferred_models=[_LLAMA70B, _LLAMA4S],
        fallback_models=[_LLAMA8B, _LLAMA70B],
        max_tokens=4096,
        temperature=0.65,
        requires_reasoning=True,
        description="3-8 complete runnable code examples with explanations",
    ),
    "formulaExplanation": SectionRoutingConfig(
        section_type="formulaExplanation",
        preferred_models=[_LLAMA70B, _QWEN32B],
        fallback_models=[_LLAMA4S, _QWEN27B],
        max_tokens=3072,
        temperature=0.6,
        requires_reasoning=True,
        description="Detailed explanation of every formula with derivations",
    ),
    "diagrams": SectionRoutingConfig(
        section_type="diagrams",
        preferred_models=[_LLAMA70B, _QWEN32B],
        fallback_models=[_LLAMA4S, _LLAMA8B],
        max_tokens=3072,
        temperature=0.7,
        requires_reasoning=False,
        description="Mermaid architecture, flowchart, sequence, and class diagrams",
    ),
    "revisionNotes": SectionRoutingConfig(
        section_type="revisionNotes",
        preferred_models=[_LLAMA8B, _QWEN27B],
        fallback_models=[_LLAMA4S, _ALLAM],
        max_tokens=2048,
        temperature=0.5,
        requires_reasoning=False,
        description="Bullet revision sheet covering all key concepts for exam prep",
    ),
    "summary": SectionRoutingConfig(
        section_type="summary",
        preferred_models=[_LLAMA70B, _LLAMA8B],
        fallback_models=[_LLAMA4S, _QWEN27B],
        max_tokens=2048,
        temperature=0.6,
        requires_reasoning=False,
        description="Complete chapter summary with key takeaways",
    ),
}


# =============================================================================
# LEARNING MODE OVERRIDES — boost quality for demanding modes
# =============================================================================
LEARNING_MODE_OVERRIDES: Dict[str, Dict[str, str]] = {
    "interview": {
        "interviewQuestions": _LLAMA70B,
        "commonMistakes": _LLAMA70B,
        "cheatSheet": _QWEN27B,
    },
    "deep": {
        "explanation": _GPT120B,
        "caseStudy": _GPT120B,
        "examples": _LLAMA70B,
        "quiz": _QWEN32B,
    },
    "exam": {
        "quiz": _QWEN32B,
        "cheatSheet": _LLAMA70B,
        "examples": _LLAMA70B,
    },
    "coding": {
        "examples": _LLAMA70B,
        "miniProject": _GPT120B,
        "assignment": _LLAMA70B,
    },
    "expert": {
        "explanation": _GPT120B,
        "caseStudy": _GPT120B,
        "interviewQuestions": _GPT120B,
    },
}

# Execution wave groups for parallel orchestration
# Each wave runs in parallel; waves run sequentially
EXECUTION_WAVES = [
    ["overview", "explanation", "keyConcepts", "importantDefinitions"],  # Wave 1: Foundations
    ["analogy", "examples", "caseStudy", "codeExamples", "formulaExplanation", "diagrams"],  # Wave 2: Core content
    ["commonMistakes", "interviewQuestions", "quiz", "assignment", "miniProject"],  # Wave 3: Practice & apply
    ["cheatSheet", "revisionNotes", "summary"],  # Wave 4: Review & consolidate
]


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================
def get_model_for_section(
    section_type: str,
    learning_mode: str = "default",
    difficulty: str = "intermediate",
) -> str:
    """Get the best available model ID for a given section, learning mode, and difficulty."""
    # Check if user explicitly requests highest quality / expert
    is_expert = (difficulty == "expert") or (learning_mode in ("expert", "deep"))

    # If it's interviewQuestions, apply special routing:
    # Default: llama-3.3-70b-versatile
    # Fallback: openai/gpt-oss-120b
    # Only use 120B for Expert mode or highest quality
    if section_type == "interviewQuestions":
        if is_expert:
            return _GPT120B
        else:
            return _LLAMA70B

    # Check learning mode overrides next
    mode_overrides = LEARNING_MODE_OVERRIDES.get(learning_mode, {})
    if section_type in mode_overrides:
        model = mode_overrides[section_type]
        # Ensure we don't return 120B unless is_expert
        if model == _GPT120B and not is_expert:
            return _LLAMA70B
        return model

    # Check difficulty-based (quality modes) routing:
    if difficulty == "beginner":
        # Fast models — all use llama-8b for first content in <2s
        fast_map = {
            "overview": _LLAMA8B,
            "explanation": _LLAMA8B,
            "keyConcepts": _LLAMA8B,
            "importantDefinitions": _LLAMA8B,
            "analogy": _LLAMA8B,
            "examples": _LLAMA4S,
            "caseStudy": _LLAMA4S,
            "codeExamples": _LLAMA4S,
            "formulaExplanation": _LLAMA8B,
            "diagrams": _LLAMA8B,
            "quiz": _LLAMA8B,
            "assignment": _GPT20B,
            "miniProject": _GPT20B,
            "commonMistakes": _LLAMA8B,
            "interviewQuestions": _LLAMA8B,
            "cheatSheet": _LLAMA8B,
            "revisionNotes": _LLAMA8B,
            "summary": _LLAMA8B,
        }
        if section_type in fast_map:
            return fast_map[section_type]
    elif difficulty == "intermediate":
        # Balanced — first section uses fast model for instant first content
        balanced_map = {
            "overview": _LLAMA8B,  # Fast first content < 2s
            "explanation": _LLAMA70B,
            "keyConcepts": _LLAMA70B,
            "importantDefinitions": _QWEN27B,
            "analogy": _QWEN32B,
            "examples": _QWEN27B,
            "caseStudy": _LLAMA70B,
            "codeExamples": _QWEN32B,
            "formulaExplanation": _LLAMA70B,
            "diagrams": _LLAMA70B,
            "quiz": _QWEN27B,
            "assignment": _GPT20B,
            "miniProject": _LLAMA70B,
            "commonMistakes": _QWEN27B,
            "interviewQuestions": _LLAMA70B,
            "cheatSheet": _LLAMA8B,
            "revisionNotes": _LLAMA8B,
            "summary": _LLAMA70B,
        }
        if section_type in balanced_map:
            return balanced_map[section_type]
    elif difficulty == "advanced":
        # Better reasoning models
        advanced_map = {
            "overview": _LLAMA70B,
            "explanation": _LLAMA70B,
            "keyConcepts": _LLAMA70B,
            "importantDefinitions": _LLAMA70B,
            "analogy": _LLAMA70B,
            "examples": _LLAMA70B,
            "caseStudy": _LLAMA70B,
            "codeExamples": _LLAMA70B,
            "formulaExplanation": _LLAMA70B,
            "diagrams": _LLAMA70B,
            "quiz": _LLAMA70B,
            "assignment": _LLAMA70B,
            "miniProject": _LLAMA70B,
            "commonMistakes": _LLAMA70B,
            "interviewQuestions": _LLAMA70B,
            "cheatSheet": _QWEN27B,
            "revisionNotes": _QWEN27B,
            "summary": _LLAMA70B,
        }
        if section_type in advanced_map:
            return advanced_map[section_type]
    elif is_expert:
        # Largest models
        expert_map = {
            "overview": _LLAMA70B,
            "explanation": _GPT120B,
            "keyConcepts": _LLAMA70B,
            "importantDefinitions": _LLAMA70B,
            "analogy": _QWEN32B,
            "examples": _LLAMA70B,
            "caseStudy": _GPT120B,
            "codeExamples": _LLAMA70B,
            "formulaExplanation": _LLAMA70B,
            "diagrams": _LLAMA70B,
            "quiz": _QWEN32B,
            "assignment": _LLAMA70B,
            "miniProject": _LLAMA70B,
            "commonMistakes": _QWEN32B,
            "interviewQuestions": _GPT120B,
            "cheatSheet": _QWEN27B,
            "revisionNotes": _QWEN27B,
            "summary": _LLAMA70B,
        }
        if section_type in expert_map:
            return expert_map[section_type]

    # Standard fallback
    routing = SECTION_ROUTING.get(section_type)
    if routing and routing.preferred_models:
        model = routing.preferred_models[0]
        if model == _GPT120B and not is_expert:
            return _LLAMA70B
        return model

    return _LLAMA70B  # Safe default


def get_model_config(model_id: str) -> Optional[ModelConfig]:
    return MODEL_REGISTRY.get(model_id)


def get_section_config(section_type: str) -> Optional[SectionRoutingConfig]:
    return SECTION_ROUTING.get(section_type)


def list_all_models() -> list:
    return [{"key": k, **v.model_dump()} for k, v in MODEL_REGISTRY.items()]


def list_section_routing() -> dict:
    return {k: v.model_dump() for k, v in SECTION_ROUTING.items()}