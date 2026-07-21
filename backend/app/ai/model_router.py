"""
Model Router — Capability-based dynamic routing engine with quota-aware scoring.
Routes requests to appropriate models using required capabilities, health, and load balancing.
"""
import logging
import random
from typing import Dict, List, Optional, Any

from .model_router_config import (
    MODEL_REGISTRY,
    SECTION_ROUTING,
    MODEL_SPECIALIZATION,
    ModelConfig,
    SectionRoutingConfig,
    get_model_config,
    get_section_config,
    list_all_models,
    list_section_routing,
)
from .model_pool import model_pool
from .key_manager import key_manager

logger = logging.getLogger(__name__)


class ModelRouter:
    """
    Capability-based dynamic routing engine.
    """

    def _get_compatible_models(self, section_type: str) -> List[str]:
        """Finds all models that have the required capabilities for a section."""
        routing = SECTION_ROUTING.get(section_type)
        if not routing:
            logger.warning(f"No routing config found for {section_type}, defaulting to generic reasoning")
            required = ["deep_reasoning"]
        else:
            required = routing.required_capabilities

        compatible_models = []
        for model_id, config in MODEL_REGISTRY.items():
            overlap = set(config.capabilities).intersection(set(required))
            if overlap:
                compatible_models.append(model_id)
        
        # If no models match exactly, fallback to generic reasoning models
        if not compatible_models:
            compatible_models = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant"]

        return compatible_models

    def __init__(self):
        self._last_decisions = {}
        self._live_metrics = {}
        self._preload_historical_metrics()

    def _preload_historical_metrics(self):
        """Loads historical moving average stats once on startup."""
        import os
        import json
        log_file = "backend/logs/section_telemetry.jsonl"
        if not os.path.exists(log_file):
            return
        try:
            with open(log_file, "r", encoding="utf-8") as f:
                lines = f.readlines()
                recent = lines[-500:]
            for line in recent:
                if not line.strip():
                    continue
                try:
                    data = json.loads(line)
                    self.update_in_memory_metrics(data)
                except Exception:
                    continue
        except Exception:
            pass

    def update_in_memory_metrics(self, data: dict):
        """Updates the in-memory moving average metrics for routing."""
        model = data.get("selected_model")
        if not model or model == "unknown":
            return
        if not hasattr(self, "_live_metrics"):
            self._live_metrics = {}
        if model not in self._live_metrics:
            self._live_metrics[model] = {
                "latencies": [],
                "failures": 0,
                "fallbacks": 0,
                "total": 0
            }
        mstats = self._live_metrics[model]
        mstats["total"] += 1
        mstats["latencies"].append(data.get("latency", 0.0))
        if len(mstats["latencies"]) > 20:
            mstats["latencies"].pop(0)
        if not data.get("success", True):
            mstats["failures"] += 1
        if data.get("fallback_count", 0) > 0:
            mstats["fallbacks"] += 1

    def _load_live_telemetry_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Loads moving average stats for models from recent telemetry records."""
        if not hasattr(self, "_live_metrics"):
            self._live_metrics = {}
        return self._live_metrics

    def select_model(self, section_type: str, subject: str = "", topic: str = "", complexity: str = "moderate", engine_id: str = "") -> str:
        """
        Selects the best available model for a task based on capabilities, health, live telemetry, and specialization.
        """
        candidates = self._get_compatible_models(section_type)
        live_metrics = self._load_live_telemetry_metrics()
        
        # Base quality scores for models
        quality_scores = {
            "openai/gpt-oss-120b": 980,
            "llama-3.3-70b-versatile": 950,
            "groq/compound": 900,
            "qwen/qwen3.6-27b": 800,
            "openai/gpt-oss-20b": 750,
            "groq/compound-mini": 700,
            "llama-3.1-8b-instant": 650,
            "allam-2-7b": 600,
            "meta-llama/llama-prompt-guard-2-86m": 950,
            "meta-llama/llama-prompt-guard-2-22m": 900,
            "openai/gpt-oss-safeguard-20b": 980,
        }

        # Check if we have explicit specialization list for the section
        specialization_list = MODEL_SPECIALIZATION.get(section_type, [])

        scored_candidates = []
        for mid in candidates:
            health = model_pool._ensure_model(mid)
            config = MODEL_REGISTRY.get(mid)
            
            # 1. Base Quality Score
            score = quality_scores.get(mid, 500)
            
            # 2. Key/Quota Metrics check
            available_keys = [
                k for k in key_manager.keys 
                if k.is_available 
                and (not k.model_whitelist or mid in k.model_whitelist)
            ]
            
            total_req_rem = 0
            total_tok_rem = 0
            for key in available_keys:
                if hasattr(key, "metrics"):
                    total_req_rem += key.metrics.model_remaining_requests.get(mid, 1000)
                    total_tok_rem += key.metrics.model_remaining_tokens.get(mid, 100000)
            
            # Quota score additions
            score += min(total_req_rem, 1000) * 0.5
            score += min(total_tok_rem / 200.0, 500)
 
            # 80% Quota Trigger: If requests remaining falls below 20% apply heavy penalty
            if total_req_rem < 200:
                score -= 1500

            # 3. Live Telemetry Adaptations (Latency, Failure rate, Fallback rate)
            m_live = live_metrics.get(mid, {"latencies": [], "failures": 0, "fallbacks": 0, "total": 0})
            live_latency = sum(m_live["latencies"]) / len(m_live["latencies"]) if m_live["latencies"] else (health.average_latency_ms / 1000.0)
            failure_rate = m_live["failures"] / m_live["total"] if m_live["total"] else 0.0
            fallback_rate = m_live["fallbacks"] / m_live["total"] if m_live["total"] else 0.0
            
            # Penalize dynamic latency (50 pts per sec)
            score -= (live_latency * 50.0)
            # Penalize failures (up to 2000 pts)
            score -= (failure_rate * 2000.0)
            # Penalize fallback usage (up to 1000 pts)
            score -= (fallback_rate * 1000.0)

            # 4. Queue / Concurrency Penalty
            queue_len = sum(k.in_flight for k in available_keys)
            score -= (queue_len * 200.0)

            # 5. Health / Cooldown check
            if not health.healthy:
                score -= 100000
            if health.consecutive_failures > 0:
                score -= (health.consecutive_failures * 2000)

            # 6. Specialization Bonus
            if specialization_list:
                if mid == specialization_list[0]:
                    score += 2000
                elif len(specialization_list) > 1 and mid == specialization_list[1]:
                    score += 1000
                elif len(specialization_list) > 2 and mid == specialization_list[2]:
                    score += 500

            # 7. Complexity Match Bonus
            if complexity == "complex" and config and config.category in ("reasoning", "general"):
                score += 300
            elif complexity == "simple" and config and config.category == "fast":
                score += 300

            # 8. Jitter
            score += random.uniform(0, 5)

            scored_candidates.append((mid, score))

        if not scored_candidates:
            best_model = specialization_list[0] if specialization_list else "llama-3.1-8b-instant"
            best_score = 0.0
        else:
            scored_candidates.sort(key=lambda x: x[1], reverse=True)
            best_model, best_score = scored_candidates[0]

        # Record decision metadata
        decision = {
            "candidate_models": candidates,
            "routing_score": float(best_score),
            "reason": f"Model {best_model} selected with score {best_score:.2f} based on telemetry latency {live_latency:.2f}s, queue length {queue_len}, and quotas."
        }
        if not hasattr(self, "_last_decisions"):
            self._last_decisions = {}
        self._last_decisions[(engine_id, section_type)] = decision

        logger.info(f"ModelRouter scored candidates for '{section_type}': {scored_candidates}")
        return best_model

    def route(self, section_type: str, subject: str = "", topic: str = "", complexity: str = "moderate", engine_id: str = "") -> str:
        """
        Routes the section to the best model.
        """
        return self.select_model(section_type, subject, topic, complexity, engine_id=engine_id)

    def get_fallback_chain(self, section_type: str) -> List[str]:
        """Returns the full list of compatible models in priority order based on specialization and health."""
        spec_list = MODEL_SPECIALIZATION.get(section_type, [])
        compat = self._get_compatible_models(section_type)
        
        # Merge preserving order: specialization list first, then remaining compatible models
        combined = []
        for m in spec_list + compat:
            if m not in combined:
                combined.append(m)

        healthy = [m for m in combined if model_pool._ensure_model(m).healthy]
        unhealthy = [m for m in combined if not model_pool._ensure_model(m).healthy]
        
        return healthy + unhealthy

    def get_routes(self) -> Dict[str, str]:
        return {k: v.id for k, v in MODEL_REGISTRY.items()}

    def get_available_models(self) -> List[Dict[str, str]]:
        return list_all_models()

    def get_section_routing_info(self) -> Dict:
        return list_section_routing()

    def get_model_info(self, model_id: str) -> Optional[ModelConfig]:
        return get_model_config(model_id)

    def get_section_info(self, section_type: str) -> Optional[SectionRoutingConfig]:
        return get_section_config(section_type)


# Global instance
model_router = ModelRouter()

# Legacy wrapper for backward compatibility
def get_model_for_section(
    section_type: str, learning_mode: str = "default", difficulty: str = "intermediate", engine_id: str = ""
) -> str:
    return model_router.select_model(section_type, complexity=difficulty, engine_id=engine_id)