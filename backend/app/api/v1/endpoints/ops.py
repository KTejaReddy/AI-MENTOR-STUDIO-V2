import json
import logging
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_, Integer, cast, Date
from sse_starlette.sse import EventSourceResponse

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.ai_request_analytics import AiRequestAnalytics
from app.ai.model_pool import model_pool
from app.ai.key_manager import key_manager
from app.ai.key_pool import key_pool
from app.ai.broadcaster import ops_broadcaster
from app.ai.model_router_config import SECTION_ROUTING, LEARNING_MODE_OVERRIDES

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ops"])

# ─── Auth Guard ──────────────────────────────────────────────────────────────

def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    ADMIN_EMAILS = {"arkoreai0@gmail.com"}
    if current_user.email not in ADMIN_EMAILS:
        # Hide endpoint completely to unauthorized requests
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Not Found"
        )
    return current_user

# ─── Helper: Get Today Range ──────────────────────────────────────────────────

def _get_today_range():
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return today_start, now

# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    today_start, _ = _get_today_range()
    
    # 1. Total & Today's requests
    total_requests = db.query(func.count(AiRequestAnalytics.id)).scalar() or 0
    today_requests = db.query(func.count(AiRequestAnalytics.id)).filter(
        AiRequestAnalytics.request_timestamp >= today_start
    ).scalar() or 0

    # 2. Total & Today's tokens
    total_tokens = db.query(func.sum(AiRequestAnalytics.total_tokens)).scalar() or 0
    today_tokens = db.query(func.sum(AiRequestAnalytics.total_tokens)).filter(
        AiRequestAnalytics.request_timestamp >= today_start
    ).scalar() or 0

    # 3. Sections generated (where success = True and section_name != "full_lesson" and section_name != "chat")
    sections_generated = db.query(func.count(AiRequestAnalytics.id)).filter(
        and_(
            AiRequestAnalytics.success == True,
            AiRequestAnalytics.section_name.isnot(None),
            ~AiRequestAnalytics.section_name.in_(["full_lesson", "chat", "overview_review", "explanation_review", "quiz_review"])
        )
    ).scalar() or 0

    # 4. Average Lesson Time (Total latency of full_lesson requests)
    avg_lesson_time_ms = db.query(func.avg(AiRequestAnalytics.latency_ms)).filter(
        and_(
            AiRequestAnalytics.success == True,
            AiRequestAnalytics.section_name == "full_lesson"
        )
    ).scalar() or 0
    avg_lesson_time_sec = round(avg_lesson_time_ms / 1000.0, 2) if avg_lesson_time_ms else 0.0

    # 5. Lessons today (number of unique full_lesson generations today)
    lessons_today = db.query(func.count(func.distinct(AiRequestAnalytics.lesson_id))).filter(
        and_(
            AiRequestAnalytics.request_timestamp >= today_start,
            AiRequestAnalytics.lesson_id.isnot(None)
        )
    ).scalar() or 0

    # 6. Bottlenecks (highest failure rates/latency today)
    bottleneck_model = "None"
    max_failure_count = 0
    model_failures = db.query(
        AiRequestAnalytics.model_used, 
        func.count(AiRequestAnalytics.id)
    ).filter(
        and_(
            AiRequestAnalytics.request_timestamp >= today_start,
            AiRequestAnalytics.success == False
        )
    ).group_by(AiRequestAnalytics.model_used).all()
    
    if model_failures:
        model_failures.sort(key=lambda x: x[1], reverse=True)
        bottleneck_model = model_failures[0][0]
        max_failure_count = model_failures[0][1]
    else:
        # Fall back to highest avg latency model today
        high_latency_model = db.query(
            AiRequestAnalytics.model_used,
            func.avg(AiRequestAnalytics.latency_ms)
        ).filter(
            AiRequestAnalytics.request_timestamp >= today_start
        ).group_by(AiRequestAnalytics.model_used).order_by(desc(func.avg(AiRequestAnalytics.latency_ms))).first()
        if high_latency_model:
            bottleneck_model = high_latency_model[0]

    bottleneck_key = "None"
    key_failures = db.query(
        AiRequestAnalytics.api_key_identifier,
        func.count(AiRequestAnalytics.id)
    ).filter(
        and_(
            AiRequestAnalytics.request_timestamp >= today_start,
            AiRequestAnalytics.success == False
        )
    ).group_by(AiRequestAnalytics.api_key_identifier).all()
    
    if key_failures:
        key_failures.sort(key=lambda x: x[1], reverse=True)
        bottleneck_key = key_failures[0][0]
    else:
        high_latency_key = db.query(
            AiRequestAnalytics.api_key_identifier,
            func.avg(AiRequestAnalytics.latency_ms)
        ).filter(
            AiRequestAnalytics.request_timestamp >= today_start
        ).group_by(AiRequestAnalytics.api_key_identifier).order_by(desc(func.avg(AiRequestAnalytics.latency_ms))).first()
        if high_latency_key:
            bottleneck_key = high_latency_key[0]

    # 7. Remaining Estimated Lessons
    # Compute average tokens for a complete lesson (combining full_lesson, quiz, reviews under same lesson_id)
    lesson_tokens_sub = db.query(
        func.sum(AiRequestAnalytics.total_tokens).label("lesson_sum")
    ).filter(
        AiRequestAnalytics.lesson_id.isnot(None)
    ).group_by(AiRequestAnalytics.lesson_id).subquery()

    avg_lesson_tokens = db.query(func.avg(lesson_tokens_sub.c.lesson_sum)).scalar() or 50000
    
    # Calculate estimates based on model pool limits
    remaining_lessons = 0
    total_tokens_remaining = 0
    for m_health in model_pool.models.values():
        total_tokens_remaining += m_health.tokens_remaining
    
    if total_tokens_remaining > 0:
        remaining_lessons = int(total_tokens_remaining / max(1.0, avg_lesson_tokens))
    else:
        remaining_lessons = 500  # Fallback guess if pool metrics not synced yet

    return {
        "lessons_today": lessons_today,
        "sections_generated": sections_generated,
        "total_requests": total_requests,
        "today_requests": today_requests,
        "total_tokens": total_tokens,
        "today_tokens": today_tokens,
        "average_lesson_time_sec": avg_lesson_time_sec,
        "bottleneck_model": bottleneck_model,
        "bottleneck_api_key": bottleneck_key,
        "remaining_estimated_lessons": remaining_lessons,
    }


@router.get("/models")
def get_models_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    today_start, _ = _get_today_range()
    
    # Map friendly model categorizations
    MODEL_MAPPINGS = {
        "Llama 70B": "llama-3.3-70b-versatile",
        "Llama 8B": "llama-3.1-8b-instant",
        "GPT OSS 120B": "openai/gpt-oss-120b",
        "GPT OSS 20B": "openai/gpt-oss-20b",
        "Qwen": "qwen/qwen3-32b", # maps both qwen models
        "Compound": "groq/compound", # maps both compound models
    }

    # Fetch stats per model
    all_requests = db.query(
        AiRequestAnalytics.model_used,
        func.count(AiRequestAnalytics.id).label("requests"),
        func.sum(AiRequestAnalytics.total_tokens).label("tokens"),
        func.avg(AiRequestAnalytics.total_tokens).label("avg_tokens"),
        func.avg(AiRequestAnalytics.latency_ms).label("avg_latency"),
        func.avg(AiRequestAnalytics.response_characters).label("avg_chars"),
        func.sum(func.cast(AiRequestAnalytics.success == False, Integer)).label("failures"),
        func.sum(AiRequestAnalytics.retry_count).label("retries"),
        func.sum(func.cast(AiRequestAnalytics.fallback_used, Integer)).label("fallbacks"),
    ).group_by(AiRequestAnalytics.model_used).all()

    today_stats = db.query(
        AiRequestAnalytics.model_used,
        func.count(AiRequestAnalytics.id).label("requests"),
        func.sum(AiRequestAnalytics.total_tokens).label("tokens")
    ).filter(
        AiRequestAnalytics.request_timestamp >= today_start
    ).group_by(AiRequestAnalytics.model_used).all()

    today_map = {row.model_used: row for row in today_stats}
    all_map = {row.model_used: row for row in all_requests}

    # Extract average lesson token consumption
    lesson_tokens_sub = db.query(
        func.sum(AiRequestAnalytics.total_tokens).label("lesson_sum")
    ).filter(
        AiRequestAnalytics.lesson_id.isnot(None)
    ).group_by(AiRequestAnalytics.lesson_id).subquery()
    avg_lesson_tokens = db.query(func.avg(lesson_tokens_sub.c.lesson_sum)).scalar() or 50000

    results = []
    
    # 1. Stats per custom group
    for label, model_key in MODEL_MAPPINGS.items():
        # Match using prefix/substring if necessary
        matched_models = [m_id for m_id in model_pool.models.keys() if model_key in m_id or m_id.startswith(model_key)]
        if not matched_models and model_key in model_pool.models:
            matched_models = [model_key]
        if not matched_models:
            matched_models = [model_key]

        requests_today = 0
        tokens_today = 0
        requests_total = 0
        tokens_total = 0
        avg_tokens = 0
        avg_latency = 0.0
        avg_size = 0
        failures = 0
        retries = 0
        fallbacks = 0
        tokens_remaining = 100000000
        
        for m_id in matched_models:
            # Accumulate today's stats
            if m_id in today_map:
                requests_today += today_map[m_id].requests
                tokens_today += today_map[m_id].tokens or 0
            
            # Accumulate historical metrics
            if m_id in all_map:
                row = all_map[m_id]
                requests_total += row.requests
                tokens_total += row.tokens or 0
                failures += row.failures or 0
                retries += row.retries or 0
                fallbacks += row.fallbacks or 0
                avg_tokens += row.avg_tokens or 0
                avg_latency += row.avg_latency or 0.0
                avg_size += row.avg_chars or 0

            # Pull rate limits from active pool
            h_info = model_pool.models.get(m_id)
            if h_info:
                tokens_remaining = min(tokens_remaining, h_info.tokens_remaining)
        
        # Take averages if multiple models matched
        div = len(matched_models) if matched_models else 1
        avg_tokens = round(avg_tokens / div, 1)
        avg_latency = round(avg_latency / div, 1)
        avg_size = int(avg_size / div)
        
        success_rate = 1.0
        if requests_total > 0:
            success_rate = round((requests_total - failures) / requests_total, 3)

        est_lessons = int(tokens_remaining / max(1.0, avg_lesson_tokens))

        results.append({
            "model_name": label,
            "requests_today": requests_today,
            "tokens_today": tokens_today,
            "avg_tokens": avg_tokens,
            "avg_latency_ms": avg_latency,
            "avg_response_characters": avg_size,
            "failures": failures,
            "retries": retries,
            "fallbacks": fallbacks,
            "success_rate": success_rate,
            "remaining_daily_quota": tokens_remaining,
            "remaining_estimated_lessons": est_lessons
        })

    # 2. Add an "All Models" summary row
    all_req_today = sum(r["requests_today"] for r in results)
    all_tok_today = sum(r["tokens_today"] for r in results)
    all_avg_tok = round(sum(r["avg_tokens"] for r in results) / len(results), 1) if results else 0
    all_avg_lat = round(sum(r["avg_latency_ms"] for r in results) / len(results), 1) if results else 0
    all_avg_size = int(sum(r["avg_response_characters"] for r in results) / len(results)) if results else 0
    all_failures = sum(r["failures"] for r in results)
    all_retries = sum(r["retries"] for r in results)
    all_fallbacks = sum(r["fallbacks"] for r in results)
    
    total_historical = sum(row.requests for row in all_requests)
    all_success_rate = 1.0
    if total_historical > 0:
        all_success_rate = round((total_historical - all_failures) / total_historical, 3)

    results.insert(0, {
        "model_name": "All Models",
        "requests_today": all_req_today,
        "tokens_today": all_tok_today,
        "avg_tokens": all_avg_tok,
        "avg_latency_ms": all_avg_lat,
        "avg_response_characters": all_avg_size,
        "failures": all_failures,
        "retries": all_retries,
        "fallbacks": all_fallbacks,
        "success_rate": all_success_rate,
        "remaining_daily_quota": sum(r["remaining_daily_quota"] for r in results),
        "remaining_estimated_lessons": sum(r["remaining_estimated_lessons"] for r in results)
    })

    return results


@router.get("/keys")
def get_keys_stats(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    # Fetch aggregates from DB grouped by API Key identifier
    key_stats = db.query(
        AiRequestAnalytics.api_key_identifier,
        func.count(AiRequestAnalytics.id).label("requests"),
        func.sum(AiRequestAnalytics.total_tokens).label("tokens"),
        func.avg(AiRequestAnalytics.latency_ms).label("avg_latency"),
        func.sum(func.cast(AiRequestAnalytics.success == False, Integer)).label("failures"),
    ).group_by(AiRequestAnalytics.api_key_identifier).all()

    stats_map = {row.api_key_identifier: row for row in key_stats}

    # Fetch configured keys from both manager and pool
    # Combine lists to ensure we display all loaded keys
    managed_keys = key_manager.keys
    pool_keys = key_pool.keys
    
    all_keys = []
    seen_prefixes = set()

    def process_key_object(k_obj, source):
        prefix = k_obj.key[:12] + "..."
        if prefix in seen_prefixes:
            return
        seen_prefixes.add(prefix)
        
        db_row = stats_map.get(prefix)
        requests = db_row.requests if db_row else 0
        tokens = db_row.tokens or 0 if db_row else 0
        avg_latency = db_row.avg_latency or 0.0 if db_row else 0.0
        failures = db_row.failures or 0 if db_row else 0
        
        status_val = "healthy"
        if hasattr(k_obj, "status"):
            status_val = k_obj.status.value if hasattr(k_obj.status, "value") else str(k_obj.status)

        all_keys.append({
            "key_identifier": prefix,
            "requests": requests,
            "tokens": tokens,
            "latency_ms": round(avg_latency, 1),
            "failures": failures,
            "current_status": status_val,
            "remaining_quota": "unlimited", # default placeholder as exact integers aren't kept globally
        })

    for k in managed_keys:
        process_key_object(k, "manager")
    for k in pool_keys:
        process_key_object(k, "pool")

    return all_keys


@router.get("/requests")
def get_requests_table(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    model: Optional[str] = None,
    section: Optional[str] = None,
    success: Optional[bool] = None,
):
    query = db.query(AiRequestAnalytics)
    
    if search:
        search_filter = or_(
            AiRequestAnalytics.subject.ilike(f"%{search}%"),
            AiRequestAnalytics.topic.ilike(f"%{search}%"),
            AiRequestAnalytics.lesson_id.ilike(f"%{search}%"),
            AiRequestAnalytics.error_message.ilike(f"%{search}%"),
            AiRequestAnalytics.section_name.ilike(f"%{search}%"),
        )
        query = query.filter(search_filter)

    if model:
        query = query.filter(AiRequestAnalytics.model_used == model)
    if section:
        query = query.filter(AiRequestAnalytics.section_name == section)
    if success is not None:
        query = query.filter(AiRequestAnalytics.success == success)

    total = query.count()
    items = query.order_by(desc(AiRequestAnalytics.request_timestamp)).offset(skip).limit(limit).all()

    return {
        "total": total,
        "items": items
    }


@router.get("/lessons/{lesson_id}")
def get_lesson_breakdown(
    lesson_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    requests = db.query(AiRequestAnalytics).filter(
        AiRequestAnalytics.lesson_id == lesson_id
    ).order_by(AiRequestAnalytics.request_timestamp).all()
    
    if not requests:
        raise HTTPException(status_code=404, detail="Lesson analytics record not found")
        
    return requests


@router.get("/routing")
def get_routing_inspector(
    admin: User = Depends(get_current_admin),
):
    return {
        "routing": {k: v.model_dump() for k, v in SECTION_ROUTING.items()},
        "overrides": LEARNING_MODE_OVERRIDES
    }


@router.get("/errors")
def get_errors_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    today_start, _ = _get_today_range()

    # Query error records
    error_query = db.query(AiRequestAnalytics).filter(
        AiRequestAnalytics.success == False
    )

    timeouts = error_query.filter(AiRequestAnalytics.error_message.ilike("%timeout%")).count()
    rate_limits = error_query.filter(
        or_(
            AiRequestAnalytics.error_message.ilike("%429%"),
            AiRequestAnalytics.error_message.ilike("%quota%"),
            AiRequestAnalytics.error_message.ilike("%limit%")
        )
    ).count()
    
    total_failures = error_query.count()
    provider_errors = max(0, total_failures - timeouts - rate_limits)

    # Retries and fallbacks (overall today)
    retries = db.query(func.sum(AiRequestAnalytics.retry_count)).scalar() or 0
    fallbacks = db.query(func.sum(func.cast(AiRequestAnalytics.fallback_used, Integer))).scalar() or 0
    
    cancelled = error_query.filter(
        or_(
            AiRequestAnalytics.error_message.ilike("%cancel%"),
            AiRequestAnalytics.error_message.ilike("%abort%")
        )
    ).count()

    return {
        "timeouts": timeouts,
        "rate_limits_429": rate_limits,
        "provider_errors": provider_errors,
        "retries": retries,
        "fallbacks": fallbacks,
        "cancelled": cancelled,
    }


@router.get("/charts")
def get_charts_data(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
    days: int = Query(7, ge=1, le=30),
):
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # 1. Requests, tokens, latency grouped by day
    if db.bind.dialect.name == "sqlite":
        date_group = func.strftime("%Y-%m-%d", AiRequestAnalytics.request_timestamp)
    else:
        date_group = cast(AiRequestAnalytics.request_timestamp, Date)
    
    historical = db.query(
        date_group.label("date"),
        func.count(AiRequestAnalytics.id).label("requests"),
        func.sum(AiRequestAnalytics.total_tokens).label("tokens"),
        func.avg(AiRequestAnalytics.latency_ms).label("latency")
    ).filter(
        AiRequestAnalytics.request_timestamp >= start_date
    ).group_by("date").order_by("date").all()

    # 2. Model distribution
    model_dist = db.query(
        AiRequestAnalytics.model_used.label("name"),
        func.count(AiRequestAnalytics.id).label("value")
    ).group_by(AiRequestAnalytics.model_used).all()

    # 3. Section distribution
    section_dist = db.query(
        AiRequestAnalytics.section_name.label("name"),
        func.count(AiRequestAnalytics.id).label("value")
    ).group_by(AiRequestAnalytics.section_name).all()

    # 4. Success vs failure distribution
    status_dist = db.query(
        AiRequestAnalytics.success,
        func.count(AiRequestAnalytics.id)
    ).group_by(AiRequestAnalytics.success).all()
    
    success_count = sum(v for s, v in status_dist if s == True)
    failure_count = sum(v for s, v in status_dist if s == False)

    return {
        "time_series": [
            {
                "date": row.date,
                "requests": row.requests,
                "tokens": int(row.tokens) if row.tokens else 0,
                "latency_sec": round(row.latency / 1000.0, 2) if row.latency else 0.0
            }
            for row in historical
        ],
        "model_distribution": [{"name": row.name, "value": row.value} for row in model_dist if row.name],
        "section_distribution": [{"name": row.name, "value": row.value} for row in section_dist if row.name],
        "failures_distribution": [
            {"name": "Success", "value": success_count},
            {"name": "Failures", "value": failure_count}
        ]
    }


@router.get("/live-stream")
async def get_live_monitor(
    admin: User = Depends(get_current_admin),
):
    """EventSource SSE channel returning real-time lesson generation events."""
    queue = asyncio.Queue()
    ops_broadcaster.register(queue)
    
    async def event_generator():
        try:
            while True:
                event = await queue.get()
                yield {
                    "event": "message",
                    "data": json.dumps(event)
                }
        except asyncio.CancelledError:
            pass
        finally:
            ops_broadcaster.unregister(queue)

    return EventSourceResponse(event_generator())
