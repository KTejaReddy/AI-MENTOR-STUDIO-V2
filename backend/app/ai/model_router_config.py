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

    "planner": SectionRoutingConfig(
        section_type="planner",
        preferred_models=[_LLAMA8B],
        fallback_models=[_ALLAM, _QWEN27B],
    ),
    
    "overview": SectionRoutingConfig(
        section_type="overview",
        preferred_models=[_LLAMA70B],
        fallback_models=[_GPT120B, _QWEN27B, _COMPOUND],
    ),

    "explanation": SectionRoutingConfig(
        section_type="explanation",
        preferred_models=[_LLAMA70B],
        fallback_models=[_GPT120B, _COMPOUND],
    ),
    
    "keyConcepts": SectionRoutingConfig(
        section_type="keyConcepts",
        preferred_models=[_QWEN27B],
        fallback_models=[_LLAMA8B, _COMPOUND_M],
    ),
    
    "examples": SectionRoutingConfig(
        section_type="examples",
        preferred_models=[_GPT120B],
        fallback_models=[_LLAMA70B, _QWEN27B],
    ),
    
    "applications": SectionRoutingConfig(
        section_type="applications",
        preferred_models=[_COMPOUND],
        fallback_models=[_QWEN27B, _GPT20B],
    ),

    "quiz": SectionRoutingConfig(
        section_type="quiz",
        preferred_models=[_LLAMA70B],
        fallback_models=[_GPT120B, _QWEN27B, _COMPOUND],
    ),
    
    "summary": SectionRoutingConfig(
        section_type="summary",
        preferred_models=[_LLAMA8B],
        fallback_models=[_ALLAM, _GPT20B],
    ),
    
    "semanticReview": SectionRoutingConfig(
        section_type="semanticReview",
        preferred_models=[_LLAMA8B],
        fallback_models=[_ALLAM, _QWEN27B],
    ),
    
    "regeneration": SectionRoutingConfig(
        section_type="regeneration",
        preferred_models=[_LLAMA8B],
        fallback_models=[_QWEN27B, _GPT20B],
    ),
    
    # Keeping some legacy components for backward compatibility
    "caseStudy": SectionRoutingConfig(
        section_type="caseStudy",
        preferred_models=[_GPT120B],
        fallback_models=[_LLAMA70B, _QWEN32B],
    ),
    "analogy": SectionRoutingConfig(
        section_type="analogy",
        preferred_models=[_QWEN32B],
        fallback_models=[_LLAMA8B],
    ),
    "assignment": SectionRoutingConfig(
        section_type="assignment",
        preferred_models=[_GPT20B],
        fallback_models=[_LLAMA4S],
    ),
    "miniProject": SectionRoutingConfig(
        section_type="miniProject",
        preferred_models=[_LLAMA70B],
        fallback_models=[_GPT20B],
    ),
    "commonMistakes": SectionRoutingConfig(
        section_type="commonMistakes",
        preferred_models=[_QWEN27B],
        fallback_models=[_LLAMA8B],
    ),
    "interviewQuestions": SectionRoutingConfig(
        section_type="interviewQuestions",
        preferred_models=[_LLAMA70B],
        fallback_models=[_GPT120B],
    ),
    "cheatSheet": SectionRoutingConfig(
        section_type="cheatSheet",
        preferred_models=[_LLAMA8B],
        fallback_models=[_ALLAM],
    ),
    "revisionNotes": SectionRoutingConfig(
        section_type="revisionNotes",
        preferred_models=[_LLAMA8B],
        fallback_models=[_ALLAM],
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
def get_model_config(model_id: str) -> Optional[ModelConfig]:
    return MODEL_REGISTRY.get(model_id)


def get_section_config(section_type: str) -> Optional[SectionRoutingConfig]:
    return SECTION_ROUTING.get(section_type)


def list_all_models() -> list:
    return [{"key": k, **v.model_dump()} for k, v in MODEL_REGISTRY.items()]


def list_section_routing() -> dict:
    return {k: v.model_dump() for k, v in SECTION_ROUTING.items()}