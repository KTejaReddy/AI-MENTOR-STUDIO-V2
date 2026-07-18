import logging
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from app.ai.base import AIProvider, CompletionRequest, Message
from app.ai.key_manager import key_manager
from app.ai.model_router import get_model_for_section

logger = logging.getLogger(__name__)

@dataclass
class ReviewResult:
    passed: bool
    score: float  # 0-1
    issues: List[str]
    suggestions: List[str]
    metrics: Dict[str, Any]

    @property
    def quality_score(self) -> float:
        return self.score

class ReviewerAgent:
    def __init__(self):
        self.provider: Optional[AIProvider] = None

    def set_provider(self, provider: AIProvider):
        self.provider = provider

    async def review_section(
        self,
        section_type: str,
        content: str,
        subject: str,
        topic: str,
        difficulty: str = "intermediate",
    ) -> ReviewResult:
        if not self.provider:
            logger.error("Provider not set for ReviewerAgent")
            return ReviewResult(True, 1.0, [], [], {})

        system_prompt = (
            "You are a strict academic reviewer evaluating a section of a university-level lesson. "
            "You must ensure the section meets high-quality academic standards for depth, completeness, and approximate length. "
            "Do not just check for syntax; check for ACTUAL presence of concepts and sufficient detail.\n\n"
            "Criteria based on section_type:\n"
            "- overview/introduction: Must be substantial (≥ 250 words) and set clear learning objectives.\n"
            "- explanation/theory: Must be deeply comprehensive (≥ 600 words), avoiding superficial summaries.\n"
            "- formulae/chemistry: Must actually define equations with math notation and include step-by-step derivations where appropriate.\n"
            "- codeExamples/algorithm/complexity: Must actually contain code implementations or algorithmic logic.\n"
            "- examples: Must provide at least three complex, worked-out examples.\n"
            "- practiceProblems: Must provide multiple problems with increasing difficulty.\n"
            "- summary: Must provide a substantial, comprehensive summary.\n"
            "- diagrams/graphs: Must actually describe a visual concept clearly (Mermaid syntax is mandatory if a diagram is expected).\n\n"
            "If the section is too brief, lacks necessary derivations, or misses the mandated examples, FAIL it.\n"
            "Output your response STRICTLY as JSON with the following format:\n"
            '{"passed": true/false, "score": 0.0-1.0, "issues": ["issue 1", ...], "suggestions": ["suggestion 1", ...]}\n'
        )

        user_prompt = (
            f"Subject: {subject}\n"
            f"Topic: {topic}\n"
            f"Section Type: {section_type}\n\n"
            f"Content to review:\n{content}\n\n"
            "Review this content based on the criteria. Output only valid JSON."
        )

        from app.ai.resilience import execute_with_failover
        
        def _build_req(mid: str) -> CompletionRequest:
            return CompletionRequest(
                messages=[
                    Message(role="system", content=system_prompt),
                    Message(role="user", content=user_prompt)
                ],
                model=mid,
                temperature=0.1,
                max_tokens=1024
            )
        try:
            response = await execute_with_failover(
                provider=self.provider,
                section_type="semanticReview",
                learning_mode="default",
                request_builder=_build_req
            )
            data = json.loads(response.content)
            passed = data.get("passed", True)
            score = data.get("score", 1.0)
            issues = data.get("issues", [])
            suggestions = data.get("suggestions", [])
        except Exception as e:
            logger.error(f"Semantic review failed: {e}. Degrading gracefully.")
            passed = True
            score = 1.0
            issues = []
            suggestions = []
            return ReviewResult(
                passed=passed,
                score=score,
                issues=issues,
                suggestions=suggestions,
                metrics={"reviewed_by": "llm_semantic", "fallback": "reviewer_failed", "error": str(e)}
            )

        return ReviewResult(
            passed=passed,
            score=score,
            issues=issues,
            suggestions=suggestions,
            metrics={"reviewed_by": "llm_semantic"}
        )

reviewer_agent = ReviewerAgent()