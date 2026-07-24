"""
Editor Agent — Post-processing step to merge sections, fix transitions, maintain tone, and remove duplication.
Does not rewrite entire sections; preserves code, LaTeX/KaTeX math, and Mermaid diagrams.
"""
import logging
from typing import Dict, Any, List

from app.ai.base import AIProvider, Message, CompletionRequest
from app.ai.resilience import execute_with_failover
from app.ai.model_router import model_router

logger = logging.getLogger(__name__)

# System prompt for Editor Agent
EDITOR_SYSTEM_PROMPT = """You are a professional textbook editor and continuity supervisor.
Your job is to read multiple independently generated sections of a lesson and edit them into a single, cohesive, perfectly unified document.

CRITICAL RULES:
1. DO NOT rewrite entire sections. Keep the core explanations, examples, and details intact.
2. Smooth out transitions between sections so the text flows naturally from one section to the next.
3. Eliminate duplicate sentences, overlapping introductions, or repetitive explanations across sections.
4. Maintain a consistent, authoritative, academic tone as defined in the Lesson Blueprint.
5. STRICTLY preserve all formatting, including:
   - Markdown structure (headings, tables, lists, bold/italics)
   - Code blocks (including imports and comments)
   - KaTeX/LaTeX math equations (inline $...$, display $$...$$)
   - Mermaid diagrams (do not change diagram code at all unless fixing syntax errors)
6. Ensure that Section headings (e.g. ## 1. Overview) are kept intact.
"""

class EditorAgent:
    def __init__(self):
        pass

    async def edit_lesson(
        self,
        provider: AIProvider,
        subject: str,
        topic: str,
        blueprint: Dict[str, Any],
        sections: List[Dict[str, Any]],
        engine_id: str = ""
    ) -> str:
        # Select best editor model (usually gpt-oss-120b or llama-3.3-70b)
        model_id = model_router.route("explanation", subject=subject, topic=topic)
        
        # Format sections for the editor prompt
        sections_str = ""
        for sec in sections:
            sections_str += f"\n=========================================================\n"
            sections_str += f"SECTION: {sec.get('title', sec.get('type'))}\n"
            sections_str += f"=========================================================\n"
            sections_str += f"{sec.get('content', '')}\n"

        prompt = (
            f"Subject: {subject}\n"
            f"Topic: {topic}\n\n"
            f"Lesson Blueprint Style Guide:\n{blueprint.get('style_guide', {})}\n\n"
            f"Generated Sections:\n{sections_str}\n\n"
            "Please perform the edits now, and return the final edited lesson as a single continuous Markdown document. "
            "Do NOT include any introduction, conversational filler, or commentary before or after the edited lesson. "
            "Start directly with the first section."
        )

        # Bypass LLM Editor if payload is too massive to avoid 413 Entity Too Large error
        if len(sections_str) > 25000:
            logger.warning(f"Editor Agent bypassed: combined sections exceed 25,000 characters ({len(sections_str)}). Falling back to simple merge.")
            merged = []
            for sec in sections:
                merged.append(f"## {sec.get('title', sec.get('type'))}\n\n{sec.get('content', '')}")
            return "\n\n".join(merged)

        def _build_req(mid: str) -> CompletionRequest:
            return CompletionRequest(
                messages=[
                    Message(role="system", content=EDITOR_SYSTEM_PROMPT),
                    Message(role="user", content=prompt)
                ],
                model=mid,
                temperature=0.3,
                max_tokens=8192,
                stream=False,
                extra={
                    "lesson_id": engine_id,
                    "section_name": "editor",
                    "subject": subject,
                    "topic": topic
                }
            )

        try:
            logger.info(f"Invoking Editor Agent to merge & polish lesson using model '{model_id}'...")
            response = await execute_with_failover(
                provider=provider,
                section_type="explanation",
                request_builder=_build_req
            )
            return self._sanitize_mermaid(response.content.strip())
        except Exception as e:
            logger.error(f"Editor Agent failed: {e}. Falling back to simple merge of sections.")
            # Fallback: simple merge of sections
            merged = []
            for sec in sections:
                merged.append(f"## {sec.get('title', sec.get('type'))}\n\n{sec.get('content', '')}")
            return self._sanitize_mermaid("\n\n".join(merged))
            
    def _sanitize_mermaid(self, text: str) -> str:
        import re
        blocks = re.finditer(r'```mermaid(.*?)```', text, re.DOTALL)
        result = text
        for match in blocks:
            block = match.group(0)
            inner = match.group(1).lower()
            is_valid = True
            if "|>" in inner: is_valid = False
            if not any(x in inner for x in ["graph", "flowchart", "state", "sequence", "class", "pie", "gantt", "mindmap"]): is_valid = False
            
            if not is_valid:
                rep = "\n> *Visual diagram simplified for clarity.*\n"
                result = result.replace(block, rep)
        return result

editor_agent = EditorAgent()
