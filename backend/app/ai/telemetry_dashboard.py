from fastapi import APIRouter
from typing import Dict, Any, List
from datetime import datetime, date
import os
import json
import time
from app.ai.key_manager import key_manager
from app.ai.health_cache import health_cache

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])

telemetry_stats = {
    "shadow_requests": 0,
    "average_similarity": 1.0,
    "quality_score": 0.98,
    "fallback_frequency": 0.05,
    "model_usage_percent": {},
    "key_usage_percent": {}
}

def load_all_telemetry_records() -> List[Dict[str, Any]]:
    """Loads moving average stats for models from recent telemetry records."""
    records = []
    log_file = "backend/logs/section_telemetry.jsonl"
    if os.path.exists(log_file):
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        try:
                            records.append(json.loads(line))
                        except Exception:
                            continue
        except Exception:
            pass
    return records

@router.get("/metrics")
async def get_telemetry_metrics() -> Dict[str, Any]:
    """
    Returns aggregated real-time telemetry data for the Smart Router, Key Pool,
    and Orchestrator performance.
    """
    records = load_all_telemetry_records()
    today_date = date.today()
    
    # 1. Model metrics
    model_stats = {}
    for rec in records:
        rec_time = rec.get("timestamp", 0)
        rec_date = datetime.fromtimestamp(rec_time).date()
        is_today = (rec_date == today_date)
        
        mid = rec.get("selected_model", "unknown")
        if mid == "unknown":
            continue
            
        if mid not in model_stats:
            model_stats[mid] = {
                "requests_today": 0,
                "tokens_today": 0,
                "latencies": [],
                "tokens": [],
                "fallbacks": 0,
                "errors": 0,
                "total": 0
            }
        
        mstats = model_stats[mid]
        mstats["total"] += 1
        mstats["latencies"].append(rec.get("latency", 0.0))
        mstats["tokens"].append(rec.get("total_tokens", 0))
        if is_today:
            mstats["requests_today"] += 1
            mstats["tokens_today"] += rec.get("total_tokens", 0)
        if rec.get("fallback_count", 0) > 0:
            mstats["fallbacks"] += 1
        if not rec.get("success", True):
            mstats["errors"] += 1

    formatted_models = {}
    for mid, mstats in model_stats.items():
        available_keys = [
            k for k in key_manager.keys 
            if k.is_available 
            and (not k.model_whitelist or mid in k.model_whitelist)
        ]
        rem_req = sum(k.metrics.model_remaining_requests.get(mid, 1000) for k in available_keys)
        rem_tok = sum(k.metrics.model_remaining_tokens.get(mid, 100000) for k in available_keys)
        health = health_cache.is_model_healthy(mid)
        
        formatted_models[mid] = {
            "requests_today": mstats["requests_today"],
            "tokens_today": mstats["tokens_today"],
            "remaining_request_quota": rem_req,
            "remaining_token_quota": rem_tok,
            "average_latency": round(sum(mstats["latencies"]) / len(mstats["latencies"]), 2) if mstats["latencies"] else 0.0,
            "average_generation_time": round(sum(mstats["latencies"]) / len(mstats["latencies"]), 2) if mstats["latencies"] else 0.0,
            "average_tokens_per_request": round(sum(mstats["tokens"]) / len(mstats["tokens"]), 1) if mstats["tokens"] else 0,
            "fallback_rate": round(mstats["fallbacks"] / mstats["total"] * 100, 2) if mstats["total"] else 0.0,
            "error_rate": round(mstats["errors"] / mstats["total"] * 100, 2) if mstats["total"] else 0.0,
            "health_status": "Healthy" if health else "Cooldown"
        }

    # 2. Lesson metrics
    lesson_groups = {}
    for rec in records:
        lid = rec.get("lesson_id")
        if not lid:
            continue
        if lid not in lesson_groups:
            lesson_groups[lid] = {
                "start": rec.get("timestamp", 0),
                "end": rec.get("timestamp", 0),
                "models": set(),
                "requests": 0,
                "tokens": 0,
                "editor_duration": 0.0,
                "reviewer_duration": 0.0
            }
        lg = lesson_groups[lid]
        lg["start"] = min(lg["start"], rec.get("timestamp", time.time()))
        lg["end"] = max(lg["end"], rec.get("timestamp", 0))
        lg["requests"] += 1
        lg["tokens"] += rec.get("total_tokens", 0)
        if rec.get("selected_model") and rec.get("selected_model") != "unknown":
            lg["models"].add(rec.get("selected_model"))
        if rec.get("section") == "editor":
            lg["editor_duration"] = rec.get("editor_time", 0.0)

    formatted_lessons = []
    lessons_today_count = 0
    for lid, lg in lesson_groups.items():
        rec_date = datetime.fromtimestamp(lg["start"]).date()
        if rec_date == today_date:
            lessons_today_count += 1
            
        formatted_lessons.append({
            "lesson_id": lid,
            "generation_time": round(lg["end"] - lg["start"], 2),
            "models_used": list(lg["models"]),
            "total_requests": lg["requests"],
            "total_tokens": lg["tokens"],
            "editor_duration": lg["editor_duration"],
            "reviewer_duration": lg["reviewer_duration"]
        })

    # 3. Global metrics
    now = time.time()
    last_24h_lessons = sum(1 for lg in lesson_groups.values() if now - lg["start"] <= 86400)
    lessons_per_hour = round(last_24h_lessons / 24.0, 2)
    projected_lessons_day = int(lessons_per_hour * 24)
    
    bottleneck_model = "None"
    bottleneck_key = "None"
    min_quota = float("inf")
    for key in key_manager.keys:
        for mid, quota in key.metrics.model_remaining_requests.items():
            if quota < min_quota:
                min_quota = quota
                bottleneck_model = mid
                bottleneck_key = key.key[:8] + "..."

    global_metrics = {
        "lessons_generated_today": lessons_today_count,
        "lessons_hour": lessons_per_hour,
        "projected_lessons_day": projected_lessons_day,
        "projected_quota_exhaustion_time": "Healthy (>48 hours)" if min_quota > 500 else "Under 12 hours",
        "bottleneck_model": bottleneck_model,
        "bottleneck_api_key": bottleneck_key
    }

    # Format keys list for UI
    keys_list = []
    for key in key_manager.keys:
        keys_list.append({
            "key_prefix": key.key[:8] + "...",
            "status": key.status.value,
            "requests_served": key.metrics.total_requests if hasattr(key, 'metrics') else 0,
            "latency": key.metrics.total_latency if hasattr(key, 'metrics') else 0,
            "in_flight": key.in_flight
        })

    return {
        "models": formatted_models,
        "lessons": formatted_lessons,
        "global": global_metrics,
        "keys": keys_list,
        "system_health": "Healthy"
    }

