from fastapi import APIRouter
from typing import Dict, Any
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

@router.get("/metrics")
async def get_telemetry_metrics() -> Dict[str, Any]:
    """
    Returns aggregated telemetry data for the Smart Router, Key Pool,
    and Orchestrator performance.
    """
    
    # In a full implementation, we would extract real stats from key_manager
    # For now we provide the structure that the frontend expects.
    
    metrics = {
        "keys": [],
        "models": {},
        "system_health": "Degraded" if any(not k.is_available for k in key_manager.keys) else "Healthy",
        "shadow_requests": telemetry_stats["shadow_requests"],
        "average_similarity": telemetry_stats["average_similarity"],
        "quality_score": telemetry_stats["quality_score"],
        "fallback_frequency": telemetry_stats["fallback_frequency"],
        "model_usage_percent": telemetry_stats["model_usage_percent"],
        "key_usage_percent": telemetry_stats["key_usage_percent"],
    }
    
    for key in key_manager.keys:
        metrics["keys"].append({
            "key_prefix": key.key[:8] + "...",
            "status": key.status.value,
            "requests_served": key.metrics.total_requests if hasattr(key, 'metrics') else 0,
            "latency": key.metrics.total_latency if hasattr(key, 'metrics') else 0,
            "in_flight": key.in_flight
        })
        
    return metrics
