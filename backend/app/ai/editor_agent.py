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
        
        import re
        mermaid_blocks = {}
        mermaid_recovery_map = {}
        placeholder_idx = 1

        # Format sections for the editor prompt & extract Mermaid blocks
        sections_str = ""
        for sec in sections:
            sec_title = sec.get('title', sec.get('type'))
            content = sec.get('content', '')
            
            def repl(match):
                nonlocal placeholder_idx
                placeholder = f"MERMAID_BLOCK_{placeholder_idx:04d}"
                mermaid_blocks[placeholder] = match.group(0)
                
                # Find nearest header before this block for auto-recovery placement
                start_pos = match.start()
                text_before = content[:start_pos]
                header_match = list(re.finditer(r'^#{1,6}\s+(.*)$', text_before, re.MULTILINE))
                if header_match:
                    nearest_header = header_match[-1].group(1).strip()
                else:
                    nearest_header = sec_title
                    
                mermaid_recovery_map[placeholder] = nearest_header
                placeholder_idx += 1
                return f"\n\n{placeholder}\n\n"
                
            content = re.sub(r'```mermaid[\s\S]*?```', repl, content, flags=re.IGNORECASE)

            sections_str += f"\n=========================================================\n"
            sections_str += f"SECTION: {sec_title}\n"
            sections_str += f"=========================================================\n"
            sections_str += f"{content}\n"

        prompt = (
            f"Subject: {subject}\n"
            f"Topic: {topic}\n\n"
            f"Lesson Blueprint Style Guide:\n{blueprint.get('style_guide', {})}\n\n"
            f"Generated Sections:\n{sections_str}\n\n"
            "Please perform the edits now, and return the final edited lesson as a single continuous Markdown document. "
            "Do NOT include any introduction, conversational filler, or commentary before or after the edited lesson. "
            "Start directly with the first section."
        )

        def restore_mermaids(text: str) -> str:
            restored = 0
            missing = 0
            recovered = 0
            
            for placeholder, block in mermaid_blocks.items():
                if placeholder in text:
                    text = text.replace(placeholder, block)
                    restored += 1
                else:
                    missing += 1
                    nearest_header = mermaid_recovery_map[placeholder]
                    clean_header = re.sub(r'^\d+[\.\-\)]\s*', '', nearest_header)
                    clean_header = re.escape(clean_header)
                    
                    pattern = re.compile(rf"^#{{1,6}}\s+.*{clean_header}", re.IGNORECASE | re.MULTILINE)
                    match = pattern.search(text)
                    if match:
                        next_heading = text.find("\n#", match.end())
                        if next_heading != -1:
                            text = text[:next_heading] + f"\n\n{block}\n\n" + text[next_heading:]
                        else:
                            text += f"\n\n{block}\n\n"
                    else:
                        # Fallback: just append to the end
                        text += f"\n\n{block}\n\n"
                    recovered += 1

            total_before = len(mermaid_blocks)
            
            logger.info(f"Mermaid blocks before editor: {total_before}")
            logger.info(f"Mermaid blocks after editor: {restored}")
            logger.info(f"Restored: {restored}")
            logger.info(f"Recovered: {recovered}")
            logger.info(f"Missing: {missing}")
            
            if total_before != restored:
                logger.warning(f"Editor LLM dropped {missing} Mermaid blocks! Auto-recovered {recovered}.")
            
            return text

        # Bypass LLM Editor if payload is too massive
        if len(sections_str) > 25000:
            logger.warning(f"Editor Agent bypassed: combined sections exceed 25,000 characters ({len(sections_str)}). Falling back to simple merge.")
            merged = []
            for sec in sections:
                merged.append(f"## {sec.get('title', sec.get('type'))}\n\n{sec.get('content', '')}")
            # The simple merge uses the original sections without placeholders since we didn't update sections array
            # However, `sections_str` HAS placeholders. Let's just use `sections_str` directly or restore on sections_str
            return restore_mermaids("\n\n".join([
                f"## {sec.get('title', sec.get('type'))}\n\n{re.sub(r'```mermaid[\s\S]*?```', repl, sec.get('content', ''), flags=re.IGNORECASE)}"
                for sec in sections
            ]))

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
            return restore_mermaids(response.content.strip())
        except Exception as e:
            logger.error(f"Editor Agent failed: {e}. Falling back to simple merge of sections.")
            # Fallback: simple merge using the parsed content with placeholders
            return restore_mermaids("\n\n".join([
                f"## {sec.get('title', sec.get('type'))}\n\n{re.sub(r'```mermaid[\s\S]*?```', repl, sec.get('content', ''), flags=re.IGNORECASE)}"
                for sec in sections
            ]))

editor_agent = EditorAgent()
