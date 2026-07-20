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
        capabilities=["deep_reasoning", "difficult_concepts", "interview_questions", "quiz_generation", "concept_integration"],
        max_tokens=32768,
        context_window=128000,
        temperature=0.7,
        cost_tier="standard",
        description="Meta Llama 3.3 70B — Deep explanations, complex reasoning",
    ),
    "llama-3.1-8b-instant": ModelConfig(
        id="llama-3.1-8b-instant",
        category="fast",
        capabilities=["fast_generation", "summarization", "overview", "revision_notes", "quick_explanations", "introduction"],
        max_tokens=8192,
        context_window=128000,
        temperature=0.7,
        cost_tier="low",
        description="Meta Llama 3.1 8B — Ultra-fast for structured outputs and summaries",
    ),


    "qwen/qwen3.6-27b": ModelConfig(
        id="qwen/qwen3.6-27b",
        category="general",
        capabilities=["mathematics", "complexity_analysis", "mathematical_derivations", "formula_explanation", "common_mistakes"],
        max_tokens=16384,
        context_window=131072,
        temperature=0.6,
        cost_tier="standard",
        description="Qwen 3.6 27B — Structured output, analytical sections",
    ),
    "openai/gpt-oss-120b": ModelConfig(
        id="openai/gpt-oss-120b",
        category="reasoning",
        capabilities=["coding", "algorithms", "pseudocode", "programming_explanations", "case_study", "code_examples"],
        max_tokens=16384,
        context_window=128000,
        temperature=0.7,
        cost_tier="high",
        description="OpenAI GPT-OSS 120B — Largest available, best for coding and case studies",
    ),
    "openai/gpt-oss-20b": ModelConfig(
        id="openai/gpt-oss-20b",
        category="general",
        capabilities=["examples", "applications", "comparison", "assignment"],
        max_tokens=8192,
        context_window=128000,
        temperature=0.7,
        cost_tier="standard",
        description="OpenAI GPT-OSS 20B — Fast mid-tier for structured assignments",
    ),
    "groq/compound": ModelConfig(
        id="groq/compound",
        category="reasoning",
        capabilities=["long_context", "concept_integration", "cross_topic", "planning", "deep_reasoning"],
        max_tokens=8192,
        context_window=128000,
        temperature=0.3,
        cost_tier="standard",
        description="Groq Compound — Multi-model compound for analysis and planning",
    ),
    "groq/compound-mini": ModelConfig(
        id="groq/compound-mini",
        category="fast",
        capabilities=["concise", "transitions", "supporting_explanations", "planning"],
        max_tokens=4096,
        context_window=128000,
        temperature=0.3,
        cost_tier="low",
        description="Groq Compound Mini — Ultra-fast planning and validation",
    ),
    "allam-2-7b": ModelConfig(
        id="allam-2-7b",
        category="fast",
        capabilities=["multilingual", "fallback", "simple_explanations", "key_concepts"],
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
# SECTION ROUTING TABLE — Capability Matching
# =============================================================================
SECTION_ROUTING: Dict[str, SectionRoutingConfig] = {
    "planner": SectionRoutingConfig(section_type="planner", required_capabilities=["planning"]),
    "overview": SectionRoutingConfig(section_type="overview", required_capabilities=["overview"]),
    "introduction": SectionRoutingConfig(section_type="introduction", required_capabilities=["introduction"]),
    "explanation": SectionRoutingConfig(section_type="explanation", required_capabilities=["deep_reasoning"]),
    "keyConcepts": SectionRoutingConfig(section_type="keyConcepts", required_capabilities=["key_concepts", "summarization"]),
    "working": SectionRoutingConfig(section_type="working", required_capabilities=["working", "deep_reasoning"]),
    "algorithm": SectionRoutingConfig(section_type="algorithm", required_capabilities=["algorithms"]),
    "pseudocode": SectionRoutingConfig(section_type="pseudocode", required_capabilities=["pseudocode"]),
    "codeExamples": SectionRoutingConfig(section_type="codeExamples", required_capabilities=["code_examples", "coding"]),
    "complexity": SectionRoutingConfig(section_type="complexity", required_capabilities=["complexity_analysis"]),
    "formulaExplanation": SectionRoutingConfig(section_type="formulaExplanation", required_capabilities=["formula_explanation"]),
    "mathematicalDerivation": SectionRoutingConfig(section_type="mathematicalDerivation", required_capabilities=["mathematical_derivations"]),
    "realWorldExample": SectionRoutingConfig(section_type="realWorldExample", required_capabilities=["real_world_examples"]),
    "applications": SectionRoutingConfig(section_type="applications", required_capabilities=["applications"]),
    "advantages": SectionRoutingConfig(section_type="advantages", required_capabilities=["advantages"]),
    "disadvantages": SectionRoutingConfig(section_type="disadvantages", required_capabilities=["disadvantages"]),
    "comparison": SectionRoutingConfig(section_type="comparison", required_capabilities=["comparison"]),
    "visualization": SectionRoutingConfig(section_type="visualization", required_capabilities=["visualization"]),
    "diagramDescription": SectionRoutingConfig(section_type="diagramDescription", required_capabilities=["diagram_description"]),
    "flowchartDescription": SectionRoutingConfig(section_type="flowchartDescription", required_capabilities=["flowchart_description"]),
    "commonMistakes": SectionRoutingConfig(section_type="commonMistakes", required_capabilities=["common_mistakes"]),
    "interviewQuestions": SectionRoutingConfig(section_type="interviewQuestions", required_capabilities=["interview_questions"]),
    "quiz": SectionRoutingConfig(section_type="quiz", required_capabilities=["quiz_generation"]),
    "summary": SectionRoutingConfig(section_type="summary", required_capabilities=["summarization"]),
    "revisionNotes": SectionRoutingConfig(section_type="revisionNotes", required_capabilities=["revision_notes"]),
    "caseStudy": SectionRoutingConfig(section_type="caseStudy", required_capabilities=["case_study"]),
    "analogy": SectionRoutingConfig(section_type="analogy", required_capabilities=["analogies"]),
    "assignment": SectionRoutingConfig(section_type="assignment", required_capabilities=["assignment"]),
    "miniProject": SectionRoutingConfig(section_type="miniProject", required_capabilities=["coding", "deep_reasoning"]),
    "cheatSheet": SectionRoutingConfig(section_type="cheatSheet", required_capabilities=["summarization", "concise"]),
    "semanticReview": SectionRoutingConfig(section_type="semanticReview", required_capabilities=["output_safety", "deep_reasoning"]),
    "regeneration": SectionRoutingConfig(section_type="regeneration", required_capabilities=["fallback", "deep_reasoning"]),
}

# Execution wave groups for parallel orchestration
# All independent sections are moved to Wave 1 to maximize concurrency and throughput.
EXECUTION_WAVES = [
    [
        "overview", "introduction", "explanation", "keyConcepts", "working",
        "algorithm", "pseudocode", "codeExamples", "complexity", "formulaExplanation",
        "mathematicalDerivation", "realWorldExample", "applications", "advantages",
        "disadvantages", "comparison", "visualization", "diagramDescription",
        "flowchartDescription", "commonMistakes", "interviewQuestions", "quiz",
        "caseStudy", "analogy", "assignment", "miniProject"
    ],
    ["summary", "revisionNotes", "cheatSheet"],  # Wave 2: Dependencies on core content
]

def get_model_config(model_id: str) -> Optional[ModelConfig]:
    return MODEL_REGISTRY.get(model_id)

def get_section_config(section_type: str) -> Optional[SectionRoutingConfig]:
    return SECTION_ROUTING.get(section_type)

def list_all_models() -> list:
    return [{"key": k, **v.model_dump()} for k, v in MODEL_REGISTRY.items()]

def list_section_routing() -> dict:
    return {k: v.model_dump() for k, v in SECTION_ROUTING.items()}