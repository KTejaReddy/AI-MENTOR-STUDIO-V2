import logging
import time
from typing import Dict, List, Optional
from dataclasses import dataclass

from app.ai.model_router_config import (
    MODEL_REGISTRY,
    SECTION_ROUTING,
    ModelConfig,
    SectionRoutingConfig,
)
from app.ai.key_manager import key_manager
from app.ai.health_cache import health_cache

logger = logging.getLogger(__name__)

@dataclass
class ModelScore:
    model_id: str
    capability_score: float
    remaining_request_quota: float
    remaining_token_quota: float
    rpm_headroom: float
    tpm_headroom: float
    latency: float
    failure_penalty: float
    total_score: float

class SmartRouter:
    """
    Dynamic model routing engine that scores models based on real-time quotas,
    rate limits, latency, and capability scores.
    """
    def __init__(self):
        # Weights for the scoring function
        self.w_cap = 100.0   # Capability is highly weighted when healthy
        self.w_req = 10.0    # Remaining request quota
        self.w_tok = 10.0    # Remaining token quota
        self.w_rpm = 20.0    # RPM headroom
        self.w_tpm = 20.0    # TPM headroom
        self.w_lat = 5.0     # Latency penalty
        self.w_fail = 500.0  # Heavy penalty for failures/cooldown

    def get_capability_score(self, model_id: str) -> float:
        """Mock/Static capability scores based on model ID."""
        scores = {
            "openai/gpt-oss-120b": 9.8,
            "llama-3.3-70b-versatile": 9.5,
            "groq/compound": 9.0,
            "qwen/qwen3-32b": 8.5,
            "qwen/qwen3.6-27b": 8.0,
            "meta-llama/llama-4-scout-17b-16e-instruct": 7.8,
            "openai/gpt-oss-20b": 7.5,
            "groq/compound-mini": 7.0,
            "llama-3.1-8b-instant": 6.5,
            "allam-2-7b": 6.0,
            "meta-llama/llama-prompt-guard-2-22m": 9.0,
            "meta-llama/llama-prompt-guard-2-86m": 9.5,
            "openai/gpt-oss-safeguard-20b": 9.8,
        }
        return scores.get(model_id, 5.0)

    def route(self, section_type: str, context: Optional[Dict] = None) -> str:
        """
        Dynamically route to the best available model for the given section type.
        """
        routing_config = SECTION_ROUTING.get(section_type)
        if not routing_config:
            logger.warning(f"No routing config found for {section_type}, defaulting to safe fallback.")
            return "llama-3.1-8b-instant"

        candidates = routing_config.preferred_models + routing_config.fallback_models
        best_model = None
        best_score = -float('inf')
        scored_models = []

        for model_id in candidates:
            # If the model is globally marked unhealthy/cooldown, heavily penalize or skip
            # We check if there's AT LEAST ONE healthy key for this model
            healthy_keys = [k for k in key_manager.keys if k.is_available and (not k.model_whitelist or model_id in k.model_whitelist)]
            
            # 1. Capability Score
            cap_score = self.get_capability_score(model_id)
            
            # 2. Get Telemetry
            # Aggregate available quota from the healthy keys for this model
            total_rem_req = 0
            total_rem_tok = 0
            total_rpm = 0
            total_tpm = 0
            
            for k in healthy_keys:
                if hasattr(k, "metrics"):
                    total_rem_req += k.metrics.model_remaining_requests.get(model_id, 100)
                    total_rem_tok += k.metrics.model_remaining_tokens.get(model_id, 10000)
                    total_rpm += k.metrics.model_rpm.get(model_id, 100)
                    total_tpm += k.metrics.model_tpm.get(model_id, 10000)

            remaining_req = min(1.0, total_rem_req / 1000.0) if total_rem_req > 0 else 0.0
            remaining_tok = min(1.0, total_rem_tok / 100000.0) if total_rem_tok > 0 else 0.0
            rpm_headroom = min(1.0, total_rpm / 100.0) if total_rpm > 0 else 0.0
            tpm_headroom = min(1.0, total_tpm / 100000.0) if total_tpm > 0 else 0.0
            
            # Simple latency heuristic based on capability (larger models are slower)
            latency = 1.0 - (cap_score / 10.0)
            
            # Check if all keys for this model are on cooldown
            failure_penalty = 0.0
            if not healthy_keys:
                failure_penalty = 1.0 # Max penalty
                
            # Calculate Total Score
            score = (
                (self.w_cap * cap_score) +
                (self.w_req * remaining_req) +
                (self.w_tok * remaining_tok) +
                (self.w_rpm * rpm_headroom) +
                (self.w_tpm * tpm_headroom) -
                (self.w_lat * latency) -
                (self.w_fail * failure_penalty)
            )
            
            scored_models.append(ModelScore(
                model_id=model_id, capability_score=cap_score,
                remaining_request_quota=remaining_req, remaining_token_quota=remaining_tok,
                rpm_headroom=rpm_headroom, tpm_headroom=tpm_headroom,
                latency=latency, failure_penalty=failure_penalty, total_score=score
            ))

            if score > best_score:
                best_score = score
                best_model = model_id

        if not best_model:
            # Absolute fallback
            best_model = candidates[-1] if candidates else "llama-3.1-8b-instant"

        logger.info(f"SmartRouter: Routed section '{section_type}' to '{best_model}' (Score: {best_score:.2f})")
        return best_model

smart_router = SmartRouter()
