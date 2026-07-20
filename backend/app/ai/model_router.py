"""
Model Router — Capability-based dynamic routing engine.
Routes requests to appropriate models using required capabilities, health, and load balancing.
"""
import logging
from typing import Dict, List, Optional
import random

from .model_router_config import (
    MODEL_REGISTRY,
    SECTION_ROUTING,
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
            # A model is compatible if it has at least one of the required capabilities
            # OR if it's a generic fallback and there are no specific requirements.
            # For strictness, let's require at least one matching capability.
            overlap = set(config.capabilities).intersection(set(required))
            if overlap:
                compatible_models.append(model_id)
        
        # If no models match exactly, fallback to generic reasoning models
        if not compatible_models:
            compatible_models = ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant"]

        return compatible_models

    def select_model(self, section_type: str) -> str:
        """
        Selects the best available model for a task based on capabilities, health, and load.
        """
        candidates = self._get_compatible_models(section_type)
        
        # Score candidates
        healthy_candidates = []
        for mid in candidates:
            health = model_pool._ensure_model(mid)
            if health.healthy:
                config = MODEL_REGISTRY.get(mid)
                
                # Base score from capabilities
                score = 100
                
                # Bonus for reasoning if needed, penalty for high cost if not needed
                if config and config.category == "reasoning":
                    score += 50
                if config and config.cost_tier == "high":
                    score -= 10 # slightly prefer standard/low if all else is equal
                    
                # Load balancing: penalize models with higher average latency (ms) or failure history
                score -= (health.average_latency_ms / 100.0)
                
                # Add a small random jitter to distribute load among equally scored models
                score += random.uniform(0, 5)
                
                healthy_candidates.append((mid, score))
                
        if not healthy_candidates:
            logger.warning(f"All capable models for {section_type} are on cooldown. Forcing least cooldown.")
            # fallback to the original model_pool logic for forced selection
            return model_pool.select_best_model(candidates, []) or "llama-3.1-8b-instant"
            
        # Sort by score descending
        healthy_candidates.sort(key=lambda x: x[1], reverse=True)
        return healthy_candidates[0][0]

    def route(self, section_type: str, subject: str = "", topic: str = "") -> str:
        """
        Routes the section to the best model.
        """
        return self.select_model(section_type)

    def get_fallback_chain(self, section_type: str) -> List[str]:
        """Returns the full list of compatible models in priority order based on health."""
        candidates = self._get_compatible_models(section_type)
        
        healthy = [m for m in candidates if model_pool._ensure_model(m).healthy]
        unhealthy = [m for m in candidates if not model_pool._ensure_model(m).healthy]
        
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

# Legacy wrapper for backward compatibility, now ignores learning_mode and difficulty
def get_model_for_section(
    section_type: str, learning_mode: str = "default", difficulty: str = "intermediate"
) -> str:
    return model_router.select_model(section_type)