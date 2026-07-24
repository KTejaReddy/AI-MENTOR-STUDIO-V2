"""
Model Router Configuration — Capability-based routing for maximum throughput.
All 13 Groq API models are mapped to capabilities.
"""
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

class ModelConfig(BaseModel):
    """Configuration for a single model."""
    id: str
    provider: str = "groq"
    category: str  # "reasoning", "general", "fast", "coding", "safety"
    capabilities: List[str] = Field(default_factory=list)
    max_tokens: int = 8192
    temperature: float = 0.7
    cost_tier: str = "standard"  # "low", "standard", "high"
    description: str = ""
    context_window: int = 8192

class SectionRoutingConfig(BaseModel):
    """Routing configuration for a specific lesson section based on required capabilities."""
    section_type: str
    required_capabilities: List[str] = Field(default_factory=list)
    max_tokens: int = 4096
    temperature: float = 0.7
    description: str = ""

# =============================================================================
# MODEL REGISTRY — All 13 confirmed Groq API models
# =============================================================================
MODEL_REGISTRY: Dict[str, ModelConfig] = {
    "llama-3.3-70b-versatile": ModelConfig(
        id="llama-3.3-70b-versatile",
        category="reasoning",
        capabilities=["deep_reasoning", "general_reasoning", "structured_generation", "visual_generation", "code_generation", "mathematics", "concise_generation"],
        max_tokens=32768,
        context_window=128000,
        temperature=0.7,
        cost_tier="standard",
        description="Meta Llama 3.3 70B — Deep explanations, complex reasoning",
    ),
    "llama-3.1-8b-instant": ModelConfig(
        id="llama-3.1-8b-instant",
        category="fast",
        capabilities=["lightweight_reasoning", "structured_generation", "visual_generation", "concise_generation"],
        max_tokens=8192,
        context_window=128000,
        temperature=0.7,
        cost_tier="low",
        description="Meta Llama 3.1 8B — Ultra-fast for structured outputs and summaries",
    ),
    "qwen/qwen3.6-27b": ModelConfig(
        id="qwen/qwen3.6-27b",
        category="general",
        capabilities=["general_reasoning", "structured_generation", "visual_generation", "code_generation", "mathematics"],
        max_tokens=16384,
        context_window=131072,
        temperature=0.6,
        cost_tier="standard",
        description="Qwen 3.6 27B — Structured output, analytical sections",
    ),
    "openai/gpt-oss-120b": ModelConfig(
        id="openai/gpt-oss-120b",
        category="reasoning",
        capabilities=["deep_reasoning", "general_reasoning", "visual_generation", "code_generation", "mathematics"],
        max_tokens=16384,
        context_window=128000,
        temperature=0.7,
        cost_tier="high",
        description="OpenAI GPT-OSS 120B — Largest available, best for coding and case studies",
    ),
    "openai/gpt-oss-20b": ModelConfig(
        id="openai/gpt-oss-20b",
        category="general",
        capabilities=["general_reasoning", "lightweight_reasoning", "structured_generation", "visual_generation", "concise_generation"],
        max_tokens=8192,
        context_window=128000,
        temperature=0.7,
        cost_tier="standard",
        description="OpenAI GPT-OSS 20B — Fast mid-tier for structured assignments",
    ),
    "groq/compound": ModelConfig(
        id="groq/compound",
        category="reasoning",
        capabilities=["deep_reasoning", "general_reasoning", "code_generation", "mathematics"],
        max_tokens=8192,
        context_window=128000,
        temperature=0.3,
        cost_tier="standard",
        description="Groq Compound — Multi-model compound for analysis and planning",
    ),
    "groq/compound-mini": ModelConfig(
        id="groq/compound-mini",
        category="fast",
        capabilities=["lightweight_reasoning", "structured_generation", "concise_generation"],
        max_tokens=4096,
        context_window=128000,
        temperature=0.3,
        cost_tier="low",
        description="Groq Compound Mini — Ultra-fast planning and validation",
    ),
    "allam-2-7b": ModelConfig(
        id="allam-2-7b",
        category="fast",
        capabilities=["lightweight_reasoning", "structured_generation", "concise_generation"],
        max_tokens=4096,
        context_window=4096,
        temperature=0.7,
        cost_tier="low",
        description="Allam 2 7B — Fast general purpose fallback",
    ),
    "openai/gpt-oss-safeguard-20b": ModelConfig(
        id="openai/gpt-oss-safeguard-20b",
        category="safety",
        capabilities=["output_safety"],
        max_tokens=4096,
        context_window=128000,
        temperature=0.1,
        cost_tier="standard",
        description="OpenAI GPT-OSS Safeguard — Content safety and moderation",
    ),
    "meta-llama/llama-prompt-guard-2-86m": ModelConfig(
        id="meta-llama/llama-prompt-guard-2-86m",
        category="safety",
        capabilities=["prompt_safety"],
        max_tokens=512,
        context_window=512,
        temperature=0.1,
        cost_tier="low",
        description="Llama Prompt Guard 2 86M — Prompt injection detection",
    ),
    "meta-llama/llama-prompt-guard-2-22m": ModelConfig(
        id="meta-llama/llama-prompt-guard-2-22m",
        category="safety",
        capabilities=["prompt_validation"],
        max_tokens=512,
        context_window=512,
        temperature=0.1,
        cost_tier="low",
        description="Llama Prompt Guard 2 22M — Ultra-fast prompt injection detection",
    ),
}

# =============================================================================
# MODEL SPECIALIZATION MATRIX
# =============================================================================
MODEL_SPECIALIZATION: Dict[str, List[str]] = {
    "overview": ["llama-3.1-8b-instant", "groq/compound-mini", "allam-2-7b"],
    "learningObjectives": ["llama-3.1-8b-instant", "groq/compound-mini", "allam-2-7b"],
    "keyConcepts": ["llama-3.1-8b-instant", "groq/compound-mini", "allam-2-7b"],
    "explanation": ["groq/compound", "qwen/qwen3.6-27b", "openai/gpt-oss-120b"],
    "formulaExplanation": ["openai/gpt-oss-120b", "llama-3.3-70b-versatile", "qwen/qwen3.6-27b"],
    "mathematicalDerivation": ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "qwen/qwen3.6-27b"],
    "examples": ["groq/compound", "openai/gpt-oss-120b", "llama-3.3-70b-versatile"],
    "codeExamples": ["qwen/qwen3.6-27b", "groq/compound", "openai/gpt-oss-20b"],
    "visualization": ["qwen/qwen3.6-27b", "llama-3.3-70b-versatile", "groq/compound"],
    "applications": ["groq/compound", "openai/gpt-oss-20b", "llama-3.1-8b-instant"],
    "caseStudy": ["openai/gpt-oss-20b", "groq/compound", "qwen/qwen3.6-27b"],
    "assignment": ["llama-3.1-8b-instant", "groq/compound-mini", "allam-2-7b"],
    "quiz": ["allam-2-7b", "openai/gpt-oss-20b", "groq/compound-mini"],
    "summary": ["groq/compound-mini", "llama-3.1-8b-instant", "groq/compound"],
    "reviewer": ["openai/gpt-oss-safeguard-20b", "llama-3.3-70b-versatile", "llama-3.1-8b-instant"],
    "prompt_injection": ["meta-llama/llama-prompt-guard-2-86m", "meta-llama/llama-prompt-guard-2-22m"],
}

# =============================================================================
# SECTION ROUTING TABLE — Capability Matching
# =============================================================================
SECTION_ROUTING: Dict[str, SectionRoutingConfig] = {
    "planner": SectionRoutingConfig(section_type="planner", required_capabilities=["deep_reasoning", "general_reasoning"]),
    "overview": SectionRoutingConfig(section_type="overview", required_capabilities=["structured_generation"], max_tokens=4096),
    "introduction": SectionRoutingConfig(section_type="introduction", required_capabilities=["structured_generation", "lightweight_reasoning"], max_tokens=4096),
    # explanation needs 3000+ words → must give the model full token budget
    "explanation": SectionRoutingConfig(section_type="explanation", required_capabilities=["deep_reasoning", "general_reasoning"], max_tokens=16384),
    "keyConcepts": SectionRoutingConfig(section_type="keyConcepts", required_capabilities=["concise_generation", "lightweight_reasoning"], max_tokens=4096),
    "working": SectionRoutingConfig(section_type="working", required_capabilities=["deep_reasoning", "general_reasoning"], max_tokens=8192),
    "algorithm": SectionRoutingConfig(section_type="algorithm", required_capabilities=["code_generation"]),
    "pseudocode": SectionRoutingConfig(section_type="pseudocode", required_capabilities=["code_generation"]),
    "codeExamples": SectionRoutingConfig(section_type="codeExamples", required_capabilities=["code_generation"]),
    "complexity": SectionRoutingConfig(section_type="complexity", required_capabilities=["mathematics", "general_reasoning"]),
    "formulaExplanation": SectionRoutingConfig(section_type="formulaExplanation", required_capabilities=["mathematics", "structured_generation"]),
    "mathematicalDerivation": SectionRoutingConfig(section_type="mathematicalDerivation", required_capabilities=["mathematics"]),
    "realWorldExample": SectionRoutingConfig(section_type="realWorldExample", required_capabilities=["general_reasoning", "structured_generation"]),
    "applications": SectionRoutingConfig(section_type="applications", required_capabilities=["general_reasoning", "structured_generation"]),
    "advantages": SectionRoutingConfig(section_type="advantages", required_capabilities=["structured_generation", "concise_generation"]),
    "disadvantages": SectionRoutingConfig(section_type="disadvantages", required_capabilities=["structured_generation", "concise_generation"]),
    "comparison": SectionRoutingConfig(section_type="comparison", required_capabilities=["structured_generation", "general_reasoning"]),
    "visualization": SectionRoutingConfig(section_type="visualization", required_capabilities=["visual_generation"]),
    "diagramDescription": SectionRoutingConfig(section_type="diagramDescription", required_capabilities=["visual_generation"]),
    "flowchartDescription": SectionRoutingConfig(section_type="flowchartDescription", required_capabilities=["visual_generation"]),
    "commonMistakes": SectionRoutingConfig(section_type="commonMistakes", required_capabilities=["general_reasoning", "structured_generation"]),
    "interviewQuestions": SectionRoutingConfig(section_type="interviewQuestions", required_capabilities=["deep_reasoning", "general_reasoning"]),
    "quiz": SectionRoutingConfig(section_type="quiz", required_capabilities=["structured_generation"]),
    "summary": SectionRoutingConfig(section_type="summary", required_capabilities=["concise_generation"]),
    "revisionNotes": SectionRoutingConfig(section_type="revisionNotes", required_capabilities=["concise_generation", "lightweight_reasoning"]),
    "caseStudy": SectionRoutingConfig(section_type="caseStudy", required_capabilities=["deep_reasoning", "general_reasoning"]),
    "analogy": SectionRoutingConfig(section_type="analogy", required_capabilities=["general_reasoning", "structured_generation"]),
    "assignment": SectionRoutingConfig(section_type="assignment", required_capabilities=["structured_generation", "general_reasoning"]),
    "miniProject": SectionRoutingConfig(section_type="miniProject", required_capabilities=["code_generation", "deep_reasoning"]),
    "cheatSheet": SectionRoutingConfig(section_type="cheatSheet", required_capabilities=["concise_generation"]),
    "semanticReview": SectionRoutingConfig(section_type="semanticReview", required_capabilities=["output_safety"]),
    "regeneration": SectionRoutingConfig(section_type="regeneration", required_capabilities=["deep_reasoning", "general_reasoning"]),
}

# =============================================================================
# WAVE EXECUTION GROUPS
# =============================================================================
EXECUTION_WAVES = [
    # Wave 1: Foundation
    ["overview", "learningObjectives", "keyConcepts", "formulaExplanation", "applications"],
    # Wave 2: Core explanation & examples
    ["explanation", "examples", "codeExamples", "visualization"],
    # Wave 3: Case studies, Assignments, Quizzes
    ["caseStudy", "assignment", "quiz"],
    # Wave 4: Summary & Synthesis
    ["summary"]
]

def get_model_config(model_id: str) -> Optional[ModelConfig]:
    return MODEL_REGISTRY.get(model_id)

def get_section_config(section_type: str) -> Optional[SectionRoutingConfig]:
    return SECTION_ROUTING.get(section_type)

def list_all_models() -> list:
    return [{"key": k, **v.model_dump()} for k, v in MODEL_REGISTRY.items()]

def list_section_routing() -> dict:
    return {k: v.model_dump() for k, v in SECTION_ROUTING.items()}