import json
import logging
import asyncio

from fastapi import APIRouter, HTTPException, Depends, Request
from sse_starlette.sse import EventSourceResponse
from app.core.dependencies import get_current_user
from app.models.user import User
from app.core.rate_limit import limiter

from app.ai.gateway import gateway
from app.ai.health_monitor import health_monitor
from app.ai.stream_manager import stream_manager
from app.schemas.ai import (
    GenerateLessonRequest,
    ChatRequest,
    AnalyzeTopicRequest,
    AnalyzeTopicResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai"])


@router.post("/generate")
@limiter.limit("10/minute")
async def generate_lesson(request: Request, body: GenerateLessonRequest, current_user: User = Depends(get_current_user)):
    req_id = request.headers.get("X-Request-ID", "unknown")
    logger.info(f"[SSE_START] generate_lesson start. req_id: {req_id}")
    async def event_generator():
        try:
            async for event in gateway.generate(
                subject=body.subject,
                topic=body.topic,
                output_language=body.output_language,
                context=body.context,
            ):
                yield {"event": "message", "data": json.dumps(event)}
        except asyncio.CancelledError:
            logger.warning(f"[SSE_DISCONNECT] Client aborted request. req_id: {req_id}")
            raise
        except Exception as e:
            logger.error(f"[SSE_ERROR] Stream error. req_id: {req_id} - {e}")
            raise
        finally:
            logger.info(f"[SSE_END] Stream finished. req_id: {req_id}")

    return EventSourceResponse(event_generator())


@router.post("/analyze", response_model=AnalyzeTopicResponse)
@limiter.limit("20/minute")
async def analyze_topic(request: Request, body: AnalyzeTopicRequest, current_user: User = Depends(get_current_user)):
    return gateway.analyze_topic(body.subject, body.topic)


@router.post("/chat")
@limiter.limit("20/minute")
async def chat(request: Request, body: ChatRequest, current_user: User = Depends(get_current_user)):
    async def event_generator():
        async for event in gateway.chat(
            message=body.message,
            history=body.history,
            context=body.context,
        ):
            yield {"event": "message", "data": json.dumps(event)}

    return EventSourceResponse(event_generator())


@router.get("/models")
async def list_models(current_user: User = Depends(get_current_user)):
    return {"models": gateway.get_models()}


@router.get("/health")
async def ai_health():
    return gateway.get_health()


@router.get("/key-health")
async def ai_key_health(current_user: User = Depends(get_current_user)):
    return gateway.get_key_health()


@router.post("/cancel/{engine_id}")
async def cancel_generation(engine_id: str, current_user: User = Depends(get_current_user)):
    success = await stream_manager.cancel(engine_id)
    if success:
        logger.info(f"Cancelled stream {engine_id}")
        return {"status": "cancelled", "engine_id": engine_id}
    return {"status": "not_found", "engine_id": engine_id}


@router.get("/streams")
async def list_streams(current_user: User = Depends(get_current_user)):
    active = await stream_manager.list_active()
    return {"active_streams": active, "count": len(active)}


@router.post("/cache/clear")
async def clear_cache(current_user: User = Depends(get_current_user)):
    count = gateway.clear_cache()
    return {"cleared": count}


@router.get("/stats")
async def ai_stats(current_user: User = Depends(get_current_user)):
    return health_monitor.get_stats()


@router.get("/suggestions")
async def topic_suggestions(query: str = ""):
    results = gateway.get_subject_suggestions(query) if query else []
    return {"suggestions": results}


@router.get("/subjects")
async def list_subjects():
    return {"subjects": gateway.get_subjects()}
