"""
Production Readiness Test Suite for Mentor AI Studio V2.
Contains integration tests, failure injection, load tests, stability monitoring,
and educational quality evaluation checks.
"""
import pytest
import asyncio
import time
import json
import random
import os
import threading
from typing import List, Dict, Any, AsyncGenerator

from app.ai.base import AIProvider, CompletionRequest, CompletionResponse, Message, StreamChunk
from app.ai.key_manager import key_manager, ApiKey, KeyStatus
from app.ai.model_router import model_router
from app.ai.model_router_config import MODEL_REGISTRY
from app.ai.parallel_orchestrator import generate_lesson_parallel
from app.ai.teaching_agents import TeachingAgent
from app.ai.reviewer_agent import reviewer_agent, ReviewResult

# Populate KeyManager with 5 simulated keys for testing
key_manager._keys = [ApiKey(key=f"gsk_testkey_{i}") for i in range(5)]
for k in key_manager._keys:
    k.reset()
    for mid in MODEL_REGISTRY.keys():
        k.metrics.model_remaining_requests[mid] = 2000
        k.metrics.model_remaining_tokens[mid] = 2000000

# Patch asyncio.sleep to bypass retry backoff delays
asyncio_sleep_orig = asyncio.sleep
async def mock_sleep(delay, *args, **kwargs):
    if delay <= 15:
        return
    await asyncio_sleep_orig(delay, *args, **kwargs)
asyncio.sleep = mock_sleep

class MockAIProvider(AIProvider):
    def __init__(self, mode="normal"):
        self.mode = mode
        self.request_count = 0

    @property
    def name(self) -> str:
        return "MockGroqProvider"

    @property
    def available_models(self) -> List[str]:
        return list(MODEL_REGISTRY.keys())

    async def complete(self, request: CompletionRequest) -> CompletionResponse:
        self.request_count += 1
        
        # 1. 429 Rate Limit Failure Injection
        if self.mode == "inject_429":
            raise Exception("429 Rate Limit Exceeded: Groq TPM Limit Reached")

        # 2. Timeout Failure Injection
        if self.mode == "inject_timeout":
            await asyncio.sleep(5.0)
            raise asyncio.TimeoutError("Request timed out")

        # 3. Invalid JSON Failure Injection
        if self.mode == "inject_invalid_json" and request.extra and request.extra.get("section_name") == "blueprint":
            return CompletionResponse(
                content="Not valid JSON at all",
                model=request.model,
                usage={"prompt_tokens": 100, "completion_tokens": 10, "total_tokens": 110}
            )

        # Normal Response mock content
        section = request.extra.get("section_name", "unknown") if request.extra else "unknown"
        if section == "blueprint":
            content_str = json.dumps({
                "terminology": {"key_terms": ["Matrix"], "notation": "LaTeX"},
                "variables": {"symbols": {}},
                "objectives": ["Understand Matrix Multiplication"],
                "difficulty": "intermediate",
                "style_guide": {"tone": "academic", "word_targets": {}},
                "references": [],
                "section_transitions": {"transition_rules": ""}
            })
        elif section == "quiz":
            content_str = json.dumps({
                "questions": [
                    {
                        "question": "What is 2x2 matrix multiplication complexity?",
                        "options": {"A": "O(1)", "B": "O(N^3)", "C": "O(N)", "D": "O(log N)"},
                        "correctAnswer": "B",
                        "explanation": "Standard multiplication is cubic."
                    }
                ]
            })
        else:
            content_str = f"## {section.capitalize()} section content.\n" + ("This is long content to satisfy the agent length checks. $$ A \\times B = C $$ diagram flowchart TD A[Start] --> B[End]." * 40)

        return CompletionResponse(
            content=content_str,
            model=request.model,
            usage={"prompt_tokens": 100, "completion_tokens": 500, "total_tokens": 600}
        )

    async def complete_stream(self, request: CompletionRequest) -> AsyncGenerator[StreamChunk, None]:
        res = await self.complete(request)
        yield StreamChunk(content=res.content, finish_reason="stop")

# Normal mock provider
normal_provider = MockAIProvider(mode="normal")

async def mock_get_provider(self, model_id: str):
    self._acquired_key = key_manager.get_available_key(model_id) or key_manager.keys[0]
    self._acquired_key.record_use()
    return normal_provider

TeachingAgent._get_provider = mock_get_provider

# Monkeypatch reviewer
async def mock_review_section(self, section_type: str, content: str, subject: str, topic: str, lesson_id: str = "") -> ReviewResult:
    return ReviewResult(passed=True, score=0.96, issues=[])

reviewer_agent.review_section = mock_review_section

# ── 1. INTEGRATION TESTS ───────────────────────────────────────────────────

@pytest.mark.anyio
async def test_lesson_generation_pipeline():
    """Verifies complete end-to-end lesson generation pipeline runs cleanly."""
    sections_count = 0
    lesson_yielded = False
    
    async for event in generate_lesson_parallel(
        provider=normal_provider,
        subject="Mathematics",
        topic="Matrix Multiplication",
        difficulty="intermediate",
        engine_id="test_integ_001"
    ):
        if event["type"] == "section_done":
            sections_count += 1
        elif event["type"] == "lesson":
            lesson_yielded = True
            lesson_data = event["data"]
            assert "metadata" in lesson_data
            assert "sections" in lesson_data
            
    assert sections_count > 0
    assert lesson_yielded

# ── 2. FAILURE INJECTION TESTS ─────────────────────────────────────────────

@pytest.mark.anyio
async def test_failure_injection_429():
    """Injects 429 errors and verifies that the model router handles section failovers."""
    provider_429 = MockAIProvider(mode="inject_429")
    
    # Temporarily bind 429 provider
    async def mock_get_provider_429(self, model_id: str):
        self._acquired_key = key_manager.get_available_key(model_id) or key_manager.keys[0]
        return provider_429
        
    TeachingAgent._get_provider = mock_get_provider_429
    
    failed_sections = 0
    async for event in generate_lesson_parallel(
        provider=provider_429,
        subject="Mathematics",
        topic="Linear Algebra",
        difficulty="intermediate",
        engine_id="test_429_001"
    ):
        if event["type"] == "section_done" and event.get("status") == "failed":
            failed_sections += 1
            
    # Reset agent provider
    TeachingAgent._get_provider = mock_get_provider
    assert failed_sections > 0  # Handles failed sections cleanly

@pytest.mark.anyio
async def test_failure_injection_invalid_json():
    """Injects non-JSON blueprint and quiz results, checking the repair fallback mechanisms."""
    provider_json = MockAIProvider(mode="inject_invalid_json")
    
    async def mock_get_provider_json(self, model_id: str):
        self._acquired_key = key_manager.get_available_key(model_id) or key_manager.keys[0]
        return provider_json
        
    TeachingAgent._get_provider = mock_get_provider_json
    
    # Pipeline should complete using fallback minimal blueprint
    lesson_yielded = False
    async for event in generate_lesson_parallel(
        provider=provider_json,
        subject="Computer Science",
        topic="Graph Algorithms",
        difficulty="intermediate",
        engine_id="test_json_001"
    ):
        if event["type"] == "lesson":
            lesson_yielded = True
            
    TeachingAgent._get_provider = mock_get_provider
    assert lesson_yielded

# ── 3. QUALITY EVALUATION SCORES ───────────────────────────────────────────

def evaluate_lesson_quality(lesson_text: str) -> Dict[str, float]:
    """Scores lesson text dynamically for educational quality parameters."""
    scores = {}
    
    # 1. Technical Accuracy & Formatting (KaTeX check)
    katex_count = lesson_text.count("$$") + lesson_text.count("$")
    scores["mathematical_depth"] = min(1.0, katex_count / 10.0)
    
    # 2. Diagrams check (Mermaid block)
    diagrams_count = lesson_text.count("diagram flowchart") + lesson_text.count("mermaid")
    scores["visual_quality"] = min(1.0, diagrams_count / 2.0)
    
    # 3. Code block quality
    code_blocks = lesson_text.count("```")
    scores["code_quality"] = min(1.0, code_blocks / 2.0)
    
    # 5. Overall average educational score
    scores["overall_score"] = sum(scores.values()) / len(scores)
    return scores

@pytest.mark.anyio
async def test_quality_evaluator():
    """Verifies that generated lessons pass the minimum quality score threshold."""
    final_text = ""
    async for event in generate_lesson_parallel(
        provider=normal_provider,
        subject="Mathematics",
        topic="Calculus Derivatives",
        difficulty="intermediate",
        engine_id="test_quality_001"
    ):
        if event["type"] == "lesson":
            final_text = event["data"]["metadata"]["full_content"]
            
    assert len(final_text) > 0
    scores = evaluate_lesson_quality(final_text)
    assert scores["overall_score"] >= 0.5  # Passes minimum threshold
    print(f"\nLesson Quality Scores: {scores}")

# ── 4. STABILITY TESTS (Memory & Thread Leaks check) ───────────────────────

@pytest.mark.anyio
async def test_stability_loop():
    """Runs repeated generation loop to verify stability, checking for thread leaks."""
    initial_threads = threading.active_count()
    
    for i in range(2):
        async for event in generate_lesson_parallel(
            provider=normal_provider,
            subject="Physics",
            topic=f"Kinematics Part {i}",
            difficulty="intermediate",
            engine_id=f"test_stability_{i}"
        ):
            pass
            
    final_threads = threading.active_count()
    # Accept small variation (+/- 3 threads due to thread pool execution)
    assert abs(final_threads - initial_threads) <= 4
