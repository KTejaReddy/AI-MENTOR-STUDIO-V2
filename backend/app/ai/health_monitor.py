"""Health monitoring for AI providers, keys, cache, and request metrics."""
import time
from typing import Dict, Any, Optional

from app.ai.key_manager import key_manager
from app.ai.cache import lesson_cache
from app.ai.model_router import model_router


class HealthMonitor:
    """Aggregates health data across all AI subsystems."""

    def __init__(self):
        self._start_time = time.time()
        self._total_requests = 0
        self._successful_requests = 0
        self._failed_requests = 0
        self._last_request_time: Optional[float] = None
        self._response_times: list[float] = []

    def record_request(self, success: bool, response_time_ms: float) -> None:
        self._total_requests += 1
        if success:
            self._successful_requests += 1
        else:
            self._failed_requests += 1
        self._last_request_time = time.time()
        self._response_times.append(response_time_ms)
        if len(self._response_times) > 1000:
            self._response_times = self._response_times[-500:]

    def get_provider_health(self, provider_name: str) -> Dict[str, Any]:
        healthy = key_manager.get_healthy_count()
        total = len(key_manager.keys)
        avg_response_ms = 0.0
        if self._response_times:
            avg_response_ms = sum(self._response_times) / len(self._response_times)
        error_rate = 0.0
        if self._total_requests > 0:
            error_rate = self._failed_requests / self._total_requests

        status = "healthy"
        if healthy == 0:
            status = "down"
        elif error_rate > 0.1 or healthy < total / 2:
            status = "degraded"

        return {
            "name": provider_name,
            "status": status,
            "available_models": model_router.get_available_models(),
            "healthy_keys": healthy,
            "total_keys": total,
            "total_requests": self._total_requests,
            "error_rate": round(error_rate, 4),
            "last_check": time.time(),
            "avg_response_time_ms": round(avg_response_ms, 1),
            "cooldown_keys": key_manager.get_cooldown_count(),
            "failed_keys": key_manager.get_failed_count(),
        }

    def get_health(self) -> Dict[str, Any]:
        cache_stats = lesson_cache.stats()
        key_summary = key_manager.health_summary()
        provider_health = self.get_provider_health("groq")

        overall = "healthy"
        if key_summary.get("healthy", 0) == 0:
            overall = "down"
        elif provider_health.get("error_rate", 0) > 0.1:
            overall = "degraded"

        return {
            "status": overall,
            "uptime_seconds": round(time.time() - self._start_time, 1),
            "total_requests": self._total_requests,
            "successful_requests": self._successful_requests,
            "failed_requests": self._failed_requests,
            "last_request_time": self._last_request_time,
            "providers": [provider_health],
            "keys": key_summary,
            "cache": {
                "size": cache_stats.get("size", 0),
                "max_entries": cache_stats.get("max_entries", 500),
                "ttl_seconds": cache_stats.get("ttl_seconds", 3600),
            },
        }

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_requests": self._total_requests,
            "successful_requests": self._successful_requests,
            "failed_requests": self._failed_requests,
            "uptime_seconds": round(time.time() - self._start_time, 1),
            "keys": key_manager.health_summary(),
            "cache": lesson_cache.stats(),
        }


health_monitor = HealthMonitor()
