import time
import logging
from typing import Dict, List, Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from app.ai.health_cache import health_cache

class ModelHealth(BaseModel):
    model_id: str
    quality_score: float = 1.0
    speed_score: float = 1.0
    last_failure: float = 0.0
    consecutive_failures: int = 0
    requests_served: int = 0
    requests_remaining: int = 1000000
    tokens_remaining: int = 100000000
    average_latency_ms: float = 0.0
    
    @property
    def healthy(self) -> bool:
        return health_cache.is_model_healthy(self.model_id)


class ModelPool:
    def __init__(self):
        self.models: Dict[str, ModelHealth] = {}
        
    def _ensure_model(self, model_id: str) -> ModelHealth:
        if model_id not in self.models:
            self.models[model_id] = ModelHealth(model_id=model_id)
        return self.models[model_id]

    def report_success(self, model_id: str, latency_ms: float, rate_limit_remaining: Optional[int] = None, token_limit_remaining: Optional[int] = None):
        model = self._ensure_model(model_id)
        model.consecutive_failures = 0
        model.requests_served += 1
        
        # update moving average
        if model.requests_served == 1:
            model.average_latency_ms = latency_ms
        else:
            model.average_latency_ms = (model.average_latency_ms * 0.9) + (latency_ms * 0.1)
            
        if rate_limit_remaining is not None:
            model.requests_remaining = rate_limit_remaining
        if token_limit_remaining is not None:
            model.tokens_remaining = token_limit_remaining

    def report_failure(self, model_id: str, error_type: str, key_prefix: Optional[str] = None):
        model = self._ensure_model(model_id)
        model.consecutive_failures += 1
        model.last_failure = time.time()
        
        # Exponential backoff: 30s, 60s, 120s... max 300s
        backoff = min(30 * (2 ** (model.consecutive_failures - 1)), 300)
        
        health_cache.mark_model_cooldown(model_id, int(backoff))
        if key_prefix:
            health_cache.mark_pair_cooldown(key_prefix, model_id, int(backoff))
        
        logger.warning(f"Model {model_id} marked as unhealthy for {backoff}s. Error: {error_type}")

    def select_best_model(self, preferred: List[str], fallback: List[str]) -> Optional[str]:
        all_models = preferred + fallback
        if not all_models:
            return None
            
        healthy_models = []
        for mid in all_models:
            health = self._ensure_model(mid)
            if health.healthy:
                is_preferred = mid in preferred
                tier_score = 1000 if is_preferred else 0
                
                quota_score = min(health.requests_remaining, 100)
                
                total_score = tier_score + quota_score - (health.average_latency_ms / 1000.0)
                healthy_models.append((mid, total_score))
                
        if not healthy_models:
            logger.warning(f"All models for task are on cooldown. Forcing model with earliest expiry.")
            forced = sorted(all_models, key=lambda m: self._ensure_model(m).current_cooldown)
            return forced[0]
            
        healthy_models.sort(key=lambda x: x[1], reverse=True)
        return healthy_models[0][0]

    def get_fallback_chain(self, preferred: List[str], fallback: List[str]) -> List[str]:
        # Distinct list to preserve order without duplicates
        all_models = []
        for m in preferred + fallback:
            if m not in all_models:
                all_models.append(m)
                
        healthy = [m for m in all_models if self._ensure_model(m).healthy]
        unhealthy = [m for m in all_models if not self._ensure_model(m).healthy]
        
        return healthy + unhealthy

model_pool = ModelPool()
