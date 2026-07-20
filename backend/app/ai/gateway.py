"""AI Gateway — unified orchestrator for lesson generation, chat, and health."""
import asyncio
import json
import logging
import time
from typing import AsyncGenerator, Dict, Any, Optional, List

from app.ai.broadcaster import ops_broadcaster

from app.ai.base import AIProvider, CompletionRequest, Message
from app.ai.groq_provider import GroqProvider
from app.ai.key_manager import key_manager
from app.ai.model_router import model_router, MODEL_REGISTRY
from app.ai.prompt_builder import prompt_builder
from app.ai.response_parser import response_parser
from app.ai.stream_manager import stream_manager
from app.ai.health_monitor import health_monitor
from app.ai.cache import lesson_cache
from app.ai.topic_analyzer import topic_analyzer
from app.ai.content_mapper import content_mapper
from app.ai.planner_agent import planner_agent
from app.ai.full_lesson_orchestrator import generate_lesson_full as generate_lesson_v2

logger = logging.getLogger(__name__)


class Gateway:
    """Central orchestrator for all AI operations."""

    def __init__(self):
        self._provider: Optional[AIProvider] = None

    def _get_provider(self) -> AIProvider:
        if not self._provider:
            self._provider = GroqProvider(key_manager=key_manager)
        return self._provider

    def set_provider(self, provider: AIProvider) -> None:
        self._provider = provider

    def analyze_topic(self, subject: str, topic: str) -> Dict[str, Any]:
        analysis = topic_analyzer.analyze(subject, topic)
        plan = planner_agent.plan(subject, topic)
        sections = plan.sections
        return {
            "category": analysis.category,
            "confidence": analysis.confidence,
            "needs_code": analysis.needs_code,
            "needs_diagram": analysis.needs_diagram,
            "needs_formula": analysis.needs_formula,
            "needs_quiz": analysis.needs_quiz,
            "needs_complexity": analysis.needs_complexity,
            "needs_projects": analysis.needs_projects,
            "needs_case_study": analysis.needs_case_study,
            "sections_planned": sections if isinstance(sections, list) else [],
        }

    def get_route(self, subject: str, topic: str = ""):
        model_id = model_router.route("planner")
        model_info = None
        for key, info in MODEL_REGISTRY.items():
            if info.id == model_id:
                model_info = {**info.model_dump(), "key": key}
                break
        return {"model_id": model_id, "model_info": model_info}

    def get_subject_suggestions(self, query: str, limit: int = 5) -> List[dict]:
        from app.curriculum.search import search_curriculum

        results = search_curriculum(query)
        seen = set()
        suggestions = []
        for s in results.subjects:
            key = (s.branch_name, s.name)
            if key not in seen and len(suggestions) < limit:
                seen.add(key)
                suggestions.append({"subject": s.branch_name, "topic": s.name})
        for b in results.branches:
            if len(suggestions) >= limit:
                break
            suggestions.append({"subject": b.name, "topic": b.name})
        return suggestions

    def get_subjects(self) -> List[dict]:
        from app.curriculum.registry import curriculum_registry

        subjects = []
        for s in curriculum_registry.get_subjects():
            full = curriculum_registry.get_subject(s.id)
            subjects.append({
                "id": s.id,
                "name": s.name,
                "category": s.category,
                "description": full.description if full else "",
                "topics": list(full.tags) if full and full.tags else [],
            })
        return subjects

    def get_models(self) -> List[dict]:
        return model_router.get_available_models()

    def get_health(self) -> dict:
        return health_monitor.get_health()

    def get_cache_stats(self) -> dict:
        return lesson_cache.stats()

    def clear_cache(self) -> int:
        return lesson_cache.clear()

    def get_key_health(self) -> dict:
        return key_manager.health_summary()

    def map_lesson(self, data: dict) -> dict:
        return {
            "sidebar_items": content_mapper.map_to_sidebar_items(data),
            "sections": content_mapper.map_to_sections(data),
            "metadata_preview": content_mapper.get_metadata_preview(data),
        }

    def validate_topic(self, subject: str, topic: str) -> dict:
        """Validate topic belongs to selected subject, suggest alternatives if not."""
        from app.curriculum.registry import curriculum_registry as cr
        validation = cr.validate_topic(subject, topic)
        return validation

    async def generate(
        self,
        subject: str,
        topic: str,
        output_language: str = "english",
        context: Optional[str] = None,
        is_document: bool = False,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        provider = self._get_provider()
        route_info = self.get_route(subject, topic)
        model_id = route_info["model_id"]

        logger.info(
            "Generation request: subject=%s topic=%s model=%s",
            subject, topic, model_id,
        )

        cached = lesson_cache.get(subject, topic, "intermediate", "default")
        if cached:
            logger.info("Cache hit for %s/%s", subject, topic)
            health_monitor.record_request(True, 0)
            mapped = self.map_lesson(cached)
            yield {
                "type": "lesson",
                "data": cached,
                "mapped": mapped,
                "cached": True,
                "model": model_id,
                "elapsed": 0,
            }
            return

        logger.info("No cache hit, starting generation")

        # Wait for keys to become available (up to 300s)
        for wait_attempt in range(60):
            if key_manager.available_keys:
                break
            logger.info("Waiting for API keys (attempt %d/60)...", wait_attempt + 1)
            await asyncio.sleep(5)
        if not key_manager.available_keys:
            logger.error("No API keys available after waiting")
            yield {"type": "error", "content": "All API keys are currently exhausted. Please wait a moment and try again."}
            return

        analysis = self.analyze_topic(subject, topic)
        sections_planned = analysis.get("sections_planned", [])
        yield {
            "type": "analysis",
            "data": {
                "category": analysis.get("category", "general"),
                "confidence": analysis.get("confidence", 0),
                "sections_planned": sections_planned,
                "model": model_id,
            },
        }

        active_stream = await stream_manager.create(subject, topic)
        start_event = {
            "type": "stream_start",
            "engine_id": active_stream.id,
            "model": model_id,
            "lesson_id": active_stream.id,
            "subject": subject,
            "topic": topic,
        }
        ops_broadcaster.broadcast(start_event)
        yield start_event

        start_time = time.time()

        # Use multi-agent teaching orchestrator for all modes
        logger.info("Teaching Orchestrator: generating %d sections", len(sections_planned))
        try:
            async for event in generate_lesson_v2(
                provider, subject, topic, active_stream.id, sections_planned, source_material=context, is_document=is_document
            ):
                yielded_event = None
                if event["type"] == "plan":
                    # Forward planner decision to frontend immediately
                    yielded_event = {
                        "type": "plan",
                        "sections": event.get("sections", []),
                        "section_titles": event.get("section_titles", {}),
                        "topic_category": event.get("topic_category", ""),
                        "engine_id": active_stream.id,
                    }
                elif event["type"] == "section_done":
                    yielded_event = {
                        "type": "section_done",
                        "section_type": event["section_type"],
                        "section_data": event["section_data"],
                        "status": event.get("status", "completed"),
                        "engine_id": active_stream.id,
                        "elapsed": event.get("elapsed", 0),
                        "model": event.get("model", model_id),
                        "quality_score": event.get("quality_score"),
                    }
                elif event["type"] == "section_status":
                    yielded_event = {
                        "type": "section_status",
                        "section_type": event["section_type"],
                        "status": event["status"],
                        "title": event["title"],
                        "engine_id": active_stream.id,
                    }
                elif event["type"] in ("section_queued", "section_running", "section_started", "section_retry", "section_fallback"):
                    yielded_event = {
                        **event,
                        "engine_id": active_stream.id
                    }
                elif event["type"] == "section_chunk":
                    yielded_event = {
                        "type": "section_chunk",
                        "section_type": event["section_type"],
                        "content": event.get("content", ""),
                        "engine_id": active_stream.id,
                    }
                elif event["type"] == "section_clear":
                    yielded_event = {
                        "type": "section_clear",
                        "section_type": event["section_type"],
                        "engine_id": active_stream.id,
                    }
                elif event["type"] == "done":
                    yielded_event = event
                elif event["type"] == "lesson":
                    lesson_data = event["data"]
                    lesson_cache.set(subject, topic, "intermediate", "default", lesson_data)
                    mapped = self.map_lesson(lesson_data)
                    yielded_event = {
                        "type": "lesson",
                        "data": lesson_data,
                        "mapped": mapped,
                        "repaired": False,
                        "cached": False,
                        "model": model_id,
                        "elapsed": event.get("elapsed", 0),
                    }
                    health_monitor.record_request(True, (time.time() - start_time) * 1000)
                elif event["type"] == "error":
                    yielded_event = event
                
                if yielded_event:
                    ops_broadcaster.broadcast({
                        "lesson_id": active_stream.id,
                        "subject": subject,
                        "topic": topic,
                        **yielded_event
                    })
                    yield yielded_event
        except Exception as e:
            total_time = time.time() - start_time
            logger.error("Teaching Orchestrator failed at %.2fs: %s", total_time, str(e), exc_info=True)
            err_event = {
                "type": "error", 
                "content": f"Generation failed: {str(e)}", 
                "code": "ORCHESTRATOR_EXCEPTION", 
                "stage": "orchestrator",
                "details": str(e),
                "lesson_id": active_stream.id,
                "subject": subject,
                "topic": topic,
            }
            ops_broadcaster.broadcast(err_event)
            yield err_event

        finally:
            await stream_manager.remove(active_stream.id)
            return

    async def chat(
        self,
        message: str,
        history: Optional[List[dict]] = None,
        context: Optional[str] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        start_time = time.time()
        logger.info(f"Chat request received: {len(message)} chars")
        provider = self._get_provider()
        model_name = "llama-3.3-70b-versatile"
        logger.info(f"Model selected: {model_name} via {provider.__class__.__name__}")
        
        messages = prompt_builder.build_chat(
            message=message, history=history, context=context
        )
        request = CompletionRequest(
            messages=messages,
            model=model_name,
            temperature=0.7,
            max_tokens=4096,
            stream=True,
        )
        
        logger.info(f"Sending chat request to {provider.__class__.__name__}")
        active_stream = await stream_manager.create("chat", message[:50])
        first_token = False
        
        try:
            async for event in stream_manager.stream_generate(
                provider=provider, request=request, stream=active_stream
            ):
                try:
                    parsed = json.loads(
                        event.replace("data: ", "", 1).strip()
                    )
                    if not first_token and parsed.get("type") == "chunk" and parsed.get("content"):
                        first_token = True
                        latency = time.time() - start_time
                        logger.info(f"First chat token received in {latency:.2f}s")
                    yield parsed
                except (json.JSONDecodeError, IndexError):
                    continue
        except Exception as e:
            logger.error(f"Chat stream error: {e}", exc_info=True)
            yield {"type": "error", "content": "An error occurred while generating the response."}
        finally:
            await stream_manager.remove(active_stream.id)
            total_time = time.time() - start_time
            logger.info(f"Chat streaming complete. Total latency: {total_time:.2f}s")
            yield {"type": "done"}


gateway = Gateway()
