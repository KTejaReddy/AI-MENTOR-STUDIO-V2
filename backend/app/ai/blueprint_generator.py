"""
Blueprint Generator Agent — Generates a unified Lesson Blueprint before section generation starts.
Guarantees consistent terminology, notation, variables, objectives, and tone.
"""
import json
import logging
from typing import Dict, Any

from app.ai.base import AIProvider, CompletionRequest, Message
from app.ai.resilience import execute_with_failover
from app.ai.model_router import model_router

logger = logging.getLogger(__name__)

BLUEPRINT_PROMPT_TEMPLATE = """You are a Distinguished Professor planning a university-level curriculum.
Create a highly detailed, unified LESSON BLUEPRINT for the topic '{topic}' in the subject '{subject}'.

This blueprint will be distributed to multiple AI agents who will write different sections of the lesson.
Your output must ensure they use identical terminology, mathematical notation, variable names, and maintain a consistent voice.

You MUST return a JSON object with this exact structure (do not add any markdown formatting or surrounding text, just the raw JSON):
{{
  "terminology": {{
    "key_terms": ["list of exact key terms to use"],
    "notation": "rules for LaTeX notation (e.g. bold vectors, uppercase matrices)"
  }},
  "variables": {{
    "symbols": {{"symbol_name": "exact symbol (e.g., θ for parameter space)"}}
  }},
  "objectives": ["detailed learning objectives"],
  "difficulty": "intermediate",
  "style_guide": {{
    "tone": "academic, authoritative, yet clear and engaging",
    "word_targets": {{
      "overview": 300,
      "explanation": 800,
      "examples": 500,
      "codeExamples": 400
    }}
  }},
  "references": ["authoritative textbook, academic paper, or standard documentation references"],
  "section_transitions": {{
    "transition_rules": "guidelines for how sections should link to avoid repetition"
  }}
}}
"""

async def generate_blueprint(
    provider: AIProvider,
    subject: str,
    topic: str,
    complexity: str = "moderate",
    engine_id: str = "",
) -> Dict[str, Any]:
    """Generates the lesson blueprint using the best planner model."""
    model_id = model_router.route("planner", subject=subject, topic=topic, complexity=complexity)
    
    prompt = BLUEPRINT_PROMPT_TEMPLATE.format(subject=subject, topic=topic)
    
    def _build_req(mid: str) -> CompletionRequest:
        return CompletionRequest(
            messages=[Message(role="user", content=prompt)],
            model=mid,
            temperature=0.2,
            max_tokens=2048,
            stream=False,
            extra={
                "lesson_id": engine_id,
                "section_name": "blueprint",
                "subject": subject,
                "topic": topic
            }
        )

    try:
        logger.info(f"Generating Lesson Blueprint for '{topic}' in '{subject}' using model '{model_id}'...")
        response = await execute_with_failover(
            provider=provider,
            section_type="planner",
            request_builder=_build_req
        )
        content = response.content.strip()
        
        # Parse JSON
        from app.ai.response_parser import response_parser
        extracted, _ = response_parser.extract_json(content)
        if not extracted:
            extracted = content
        
        repaired = response_parser.repair_json(extracted)
        blueprint_data = json.loads(repaired)
        logger.info(f"Successfully generated Lesson Blueprint: {list(blueprint_data.keys())}")
        return blueprint_data
    except Exception as e:
        logger.error(f"Failed to generate lesson blueprint: {e}. Returning minimal fallback blueprint.")
        return {
            "terminology": {"key_terms": [topic], "notation": "Standard notation"},
            "variables": {"symbols": {}},
            "objectives": [f"Understand the core concepts of {topic}."],
            "difficulty": complexity,
            "style_guide": {"tone": "academic", "word_targets": {}},
            "references": [],
            "section_transitions": {"transition_rules": ""}
        }
