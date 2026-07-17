"""
Model Router — Configuration-driven model selection with section-specific routing.
"""
import os
from typing import Dict, List, Optional, Callable
from dataclasses import dataclass, field

from .model_router_config import (
    MODEL_REGISTRY,
    SECTION_ROUTING,
    LEARNING_MODE_OVERRIDES,
    ModelConfig,
    SectionRoutingConfig,
    get_model_for_section,
    get_model_config,
    get_section_config,
    list_all_models,
    list_section_routing,
)


class ModelRouter:
    """
    Routes requests to appropriate models based on:
    - Section type (explanation, quiz, code, etc.)
    - Learning mode (interview, exam, deep, etc.)
    - Subject/topic tags
    - Custom overrides
    """

    def __init__(self):
        self._custom_resolver: Optional[Callable] = None
        self._overrides: Dict[str, str] = {}

    def set_custom_resolver(self, resolver: Callable) -> None:
        self._custom_resolver = resolver

    def add_override(self, subject_or_mode: str, model_key: str) -> None:
        """Add a model override for a subject or mode."""
        if model_key in MODEL_REGISTRY:
            self._overrides[subject_or_mode.lower()] = model_key
        else:
            raise ValueError(f"Unknown model key: {model_key}")

    def route(
        self,
        section_type: str,
        learning_mode: str = "default",
        subject: str = "",
        topic: str = "",
        difficulty: str = "intermediate",
    ) -> str:
        """
        Get the model ID for a given section type and learning mode.
        """
        # 1. Custom resolver (highest priority)
        if self._custom_resolver:
            result = self._custom_resolver(section_type, learning_mode, subject, topic)
            if result and result in MODEL_REGISTRY:
                return result

        # 2. Subject/mode override
        subject_key = subject.lower().replace(" ", "-")
        if subject_key in self._overrides:
            model_key = self._overrides[subject_key]
            if model_key in MODEL_REGISTRY:
                return MODEL_REGISTRY[model_key].id

        if learning_mode in self._overrides:
            model_key = self._overrides[learning_mode]
            if model_key in MODEL_REGISTRY:
                return MODEL_REGISTRY[model_key].id

        # 3. Section-specific routing (primary mechanism)
        return get_model_for_section(section_type, learning_mode, difficulty)

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