"""
Model Router — Configuration-driven model selection with section-specific routing.
"""
import os
import logging
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field

from .model_router_config import (
    MODEL_REGISTRY,
    SECTION_ROUTING,
    LEARNING_MODE_OVERRIDES,
    ModelConfig,
    SectionRoutingConfig,
    get_model_config,
    get_section_config,
    list_all_models,
    list_section_routing,
)
from .model_pool import model_pool

logger = logging.getLogger(__name__)


class ModelRouter:
    """
    Routes requests to appropriate models using the ModelPool for load balancing and health checks.
    """

    def select_model(self, section_type: str, learning_mode: str = "default") -> str:
        """
        Selects the best available model for a task, returning the model ID.
        """
        mode_overrides = LEARNING_MODE_OVERRIDES.get(learning_mode, {})
        if section_type in mode_overrides:
            preferred = [mode_overrides[section_type]]
            fallback = []
        else:
            routing = SECTION_ROUTING.get(section_type)
            if not routing:
                logger.warning(f"No routing config found for {section_type}, defaulting to Llama 70B")
                preferred = ["llama-3.3-70b-versatile"]
                fallback = ["openai/gpt-oss-120b"]
            else:
                preferred = routing.preferred_models
                fallback = routing.fallback_models
                
        best_model = model_pool.select_best_model(preferred, fallback)
        if not best_model:
            return "llama-3.3-70b-versatile"
            
        return best_model

    def route(
        self,
        section_type: str,
        learning_mode: str = "default",
        subject: str = "",
        topic: str = "",
        difficulty: str = "intermediate",
    ) -> str:
        """
        Legacy routing method preserved for backward compatibility.
        Internally delegates to select_model() via the ModelPool.
        """
        return self.select_model(section_type, learning_mode)

    def get_fallback_chain(self, section_type: str, learning_mode: str = "default") -> List[str]:
        """Returns the full list of compatible models in priority order based on health."""
        mode_overrides = LEARNING_MODE_OVERRIDES.get(learning_mode, {})
        if section_type in mode_overrides:
            preferred = [mode_overrides[section_type]]
            fallback = []
        else:
            routing = SECTION_ROUTING.get(section_type)
            if not routing:
                preferred = ["llama-3.3-70b-versatile"]
                fallback = ["openai/gpt-oss-120b"]
            else:
                preferred = routing.preferred_models
                fallback = routing.fallback_models
                
        return model_pool.get_fallback_chain(preferred, fallback)

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

# Legacy wrapper to prevent breaking existing code during migration
def get_model_for_section(
    section_type: str, learning_mode: str = "default", difficulty: str = "intermediate"
) -> str:
    return model_router.select_model(section_type, learning_mode)