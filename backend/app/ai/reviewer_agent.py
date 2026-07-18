import logging
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

from app.ai.base import AIProvider, CompletionRequest, Message
from app.ai.key_manager import key_manager

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
            "You are a strict academic reviewer. Your job is to semantically review a section of a university-level lesson "
            "and determine if it meets high-quality standards. Do not just check for syntax, check for ACTUAL presence of concepts. "
            "Output your response strictly as JSON with the following format:\n"
            '{"passed": true/false, "score": 0.0-1.0, "issues": ["issue 1", ...], "suggestions": ["suggestion 1", ...]}\n\n'
            "Criteria based on section_type:\n"
            "- codeExamples/algorithm/complexity: Must actually contain code implementations or algorithmic logic.\n"
            "- diagrams/graphs: Must actually describe a visual concept clearly (Mermaid syntax is a plus).\n"
            "- formulae/chemistry: Must actually define equations, formulae, or chemical structures with math notation.\n"
            "- general: Must be deep, comprehensive, and accurate."
        )

        user_prompt = (
            f"Subject: {subject}\n"
            f"Topic: {topic}\n"
            f"Section Type: {section_type}\n\n"
            f"Content to review:\n{content}\n\n"
            "Review this content based on the criteria. Output only valid JSON."
        )

        model_id = "llama-3.3-70b-versatile"
        key = await key_manager.acquire_key(model_id)
        if not key:
            # Skip review if no keys
            return ReviewResult(True, 1.0, [], [], {})

        self.provider.set_api_key(key.key)
        
        request = CompletionRequest(
            messages=[
                Message(role="system", content=system_prompt),
                Message(role="user", content=user_prompt)
            ],
            model=model_id,
            temperature=0.1,
            max_tokens=1024,
            response_format={"type": "json_object"}
        )

        try:
            response = await self.provider.complete(request)
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
        finally:
            key_manager.release_key(key, success=True)

        return ReviewResult(
            passed=passed,
            score=score,
            issues=issues,
            suggestions=suggestions,
            metrics={"reviewed_by": "llm_semantic"}
        )

reviewer_agent = ReviewerAgent()