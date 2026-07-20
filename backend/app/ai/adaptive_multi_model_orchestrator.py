import asyncio
import logging
import time
from typing import Dict, List, Any, Optional

from app.ai.smart_router import smart_router
from app.ai.quality_gate import quality_gate
from app.ai.model_router_config import EXECUTION_WAVES
from app.ai.groq_provider import GroqProvider
from app.ai.base import CompletionRequest, Message
from app.ai.key_manager import key_manager

logger = logging.getLogger(__name__)

class AdaptiveMultiModelOrchestrator:
    """
    Next-generation orchestrator that distributes lesson generation across multiple
    models concurrently, validating each section with a Quality Gate.
    """
    def __init__(self, max_concurrent: int = 4):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.provider = GroqProvider(key_manager=key_manager)
        
    async def generate_section(self, section_type: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates a single section. Routes to best model, generates, validates,
        and regenerates on failure.
        """
        async with self.semaphore:
            max_retries = 2
            
            for attempt in range(max_retries):
                # 1. Route to best model dynamically
                model_id = smart_router.route(section_type, context)
                logger.info(f"Generating '{section_type}' using {model_id} (Attempt {attempt+1})")
                
                start_time = time.time()
                
                # Build real prompt payload
                messages = [
                    Message(role="system", content=f"You are an expert tutor writing the '{section_type}' section for {context.get('subject', 'a subject')}."),
                    Message(role="user", content=f"Write the {section_type} section for the topic '{context.get('topic', 'the topic')}'. Ensure it passes strict quality checks for Markdown, Mermaid, Math, and JSON.")
                ]
                
                request = CompletionRequest(
                    model=model_id,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=4096,
                    extra={
                        "topic": context.get('topic'),
                        "subject": context.get('subject'),
                        "section_name": section_type,
                        "retry_count": attempt
                    }
                )
                
                try:
                    response = await self.provider.complete(request)
                    content = response.content
                except Exception as e:
                    logger.warning(f"AI Provider failed for {section_type} on {model_id}: {e}")
                    content = ""
                    # Mark failure so router avoids this model/key
                    if hasattr(smart_router, "failure_penalty"):
                        # In a real app we'd mark the specific key as failed via key_manager
                        pass

                
                latency = time.time() - start_time
                
                # 2. Quality Gate Validation
                is_valid, reason = quality_gate.validate_section(section_type, content)
                
                if is_valid:
                    logger.info(f"Section '{section_type}' passed Quality Gate.")
                    return {
                        "section_type": section_type,
                        "content": content,
                        "model": model_id,
                        "latency": latency,
                        "retries": attempt
                    }
                else:
                    logger.warning(f"Section '{section_type}' failed Quality Gate: {reason}. Retrying...")
                    # If it fails, report failure to model pool/health cache so next route picks different model
                    # health_cache.mark_failure(model_id)
                    
            # If all retries fail, return a fallback empty/safe section or raise error
            logger.error(f"Section '{section_type}' permanently failed after {max_retries} attempts.")
            return {
                "section_type": section_type,
                "content": f"Failed to generate valid content for {section_type}.",
                "model": "failed",
                "latency": 0,
                "retries": max_retries,
                "error": True
            }

    async def generate_lesson(self, topic: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the 4-wave parallel generation plan.
        Waves run sequentially, but sections within a wave run in parallel.
        """
        logger.info(f"Starting Adaptive Multi-Model Orchestration for topic: {topic}")
        lesson_data = {}
        
        # We process execution waves in order
        for wave_idx, wave_sections in enumerate(EXECUTION_WAVES):
            logger.info(f"Starting Execution Wave {wave_idx + 1}: {wave_sections}")
            
            # Execute all sections in this wave concurrently
            tasks = [
                self.generate_section(section, context) 
                for section in wave_sections
            ]
            
            # Wait for the entire wave to finish before moving to the next
            results = await asyncio.gather(*tasks)
            
            for res in results:
                lesson_data[res["section_type"]] = res
                
            logger.info(f"Completed Execution Wave {wave_idx + 1}.")
            
        logger.info(f"Successfully orchestrated full lesson for '{topic}'.")
        return lesson_data

adaptive_orchestrator = AdaptiveMultiModelOrchestrator()
