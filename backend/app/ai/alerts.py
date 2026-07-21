import logging
import os
import json
from typing import Dict, Any

logger = logging.getLogger(__name__)

def check_and_trigger_alerts(current_record: Dict[str, Any]):
    """Analyzes telemetry data and triggers warning logs if thresholds are violated."""
    
    # 1. Model below 20% quota check
    from app.ai.key_manager import key_manager
    model = current_record.get("selected_model")
    if model and model != "unknown" and model != "llama-3.3-70b-versatile":
        available_keys = [
            k for k in key_manager.keys 
            if k.is_available 
            and (not k.model_whitelist or model in k.model_whitelist)
        ]
        rem_req = sum(k.metrics.model_remaining_requests.get(model, 1000) for k in available_keys)
        if rem_req < 200:
            logger.warning(f"[ALERT] MODEL_QUOTA_LOW: Model '{model}' is below 20% remaining quota! (Remaining: {rem_req})")

    # 2. API Key exhausted check
    for key in key_manager.keys:
        if not key.is_available:
            logger.warning(f"[ALERT] API_KEY_EXHAUSTED: API Key starting with '{key.key[:8]}' is exhausted or in cooldown!")

    # 3. Latency doubles check (Optimized: read from model_router._live_metrics in-memory)
    latency = current_record.get("latency", 0.0)
    if latency > 0 and model and model != "unknown":
        from app.ai.model_router import model_router
        mstats = model_router._live_metrics.get(model, {})
        historical = mstats.get("latencies", [])
        if historical:
            avg_hist = sum(historical) / len(historical)
            if latency >= 2.0 * avg_hist and avg_hist > 0.05:
                logger.warning(f"[ALERT] LATENCY_SPIKE: Latency for model '{model}' has doubled! (Current: {latency:.2f}s, Historical Avg: {avg_hist:.2f}s)")

    # 4. Fallback rate exceeds 10% check (Optimized: read from model_router._live_metrics in-memory)
    from app.ai.model_router import model_router
    total = 0
    fallbacks = 0
    for mid, mstats in model_router._live_metrics.items():
        total += mstats.get("total", 0)
        fallbacks += mstats.get("fallbacks", 0)
        
    if total > 10:
        fb_rate = fallbacks / total
        if fb_rate > 0.10:
            logger.warning(f"[ALERT] HIGH_FALLBACK_RATE: Fallback rate is {fb_rate*100:.1f}%, exceeding 10% threshold! (Total {total} requests)")

    # 5. Editor or Reviewer agent failure check
    section = current_record.get("section")
    success = current_record.get("success", True)
    if not success:
        if section == "editor":
            logger.error(f"[ALERT] EDITOR_FAILURE: Editor agent failed for lesson '{current_record.get('lesson_id')}'!")
        elif section == "reviewer":
            logger.error(f"[ALERT] REVIEWER_FAILURE: Reviewer agent failed for lesson '{current_record.get('lesson_id')}'!")
