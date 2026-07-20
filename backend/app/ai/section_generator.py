"""Section-by-section lesson generation — each section is an independent AI call."""
import asyncio
import json
import logging
import time
from typing import AsyncGenerator, Dict, Any, List, Optional, Tuple

from app.ai.base import AIProvider, CompletionRequest, Message
from app.ai.cache import lesson_cache
from app.ai.response_parser import response_parser
from app.ai.stream_manager import stream_manager, ActiveStream

logger = logging.getLogger(__name__)

# Max concurrent API calls per provider instance
MAX_CONCURRENT_SECTIONS = 3
_section_semaphore = asyncio.Semaphore(MAX_CONCURRENT_SECTIONS)

SECTION_PROMPTS: Dict[str, str] = {
    "introduction": (
        "Write a textbook introduction for a lesson on {topic} in {subject}. "
        "Provide context, motivation, real-world relevance, and a roadmap. "
        "Minimum 300 words. Output valid JSON: {{\"type\":\"introduction\",\"title\":\"1. Introduction\",\"content\":\"...\"}}"
    ),
    "definition": (
        "Write the formal definition and description of {topic} in {subject}. "
        "Include mathematical notation in LaTeX. Explain every symbol. "
        "Minimum 200 words. Output valid JSON: {{\"type\":\"definition\",\"title\":\"4. Definition\",\"content\":\"...\"}}"
    ),
    "coreConcepts": (
        "Explain the core concepts of {topic} in {subject}. "
        "Break down into subtopics with definitions, properties, behavior, edge cases. "
        "Minimum 400 words. Output valid JSON with \"type\", \"title\", \"concepts\" array, and \"content\"."
    ),
    "working": (
        "Explain how {topic} works in {subject}. "
        "Cover internal operation, process flow, algorithm, data flow, state changes. "
        "Minimum 300 words. Output valid JSON: {{\"type\":\"working\",\"title\":\"7. How It Works\",\"content\":\"...\"}}"
    ),
    "examples": (
        "Provide 3+ concrete examples of {topic} in {subject}. "
        "Each example: scenario, problem, solution, explanation. "
        "Minimum 300 words. Output valid JSON with \"type\", \"title\", \"items\" array, and \"content\"."
    ),
    "codeExamples": (
        "Provide 2+ complete, runnable code examples demonstrating {topic} in {subject}. "
        "Include imports, setup, expected output, complexity analysis. "
        "NOT pseudo-code. Output valid JSON with \"type\", \"title\", \"examples\" array, and \"content\"."
    ),
    "cheatSheet": (
        "Create a cheat sheet for {topic} in {subject}. "
        "15+ entries: term, definition, formula (LaTeX), remember tip. "
        "Output valid JSON with \"type\", \"title\", \"items\" array, and \"content\"."
    ),
    "quiz": (
        "Create 5+ quiz questions about {topic} in {subject}. "
        "Each: question, 4 options, correctIndex, explanation. "
        "Output valid JSON with \"type\", \"title\", \"questions\" array, and \"content\"."
    ),
    "interviewQuestions": (
        "Create 5+ interview questions about {topic} in {subject}. "
        "Progressive easy→hard. Each: question, difficulty, answer, tips, followUp. "
        "Output valid JSON with \"type\", \"title\", \"questions\" array, and \"content\"."
    ),
    "commonMistakes": (
        "Describe 6+ common mistakes and misconceptions about {topic} in {subject}. "
        "Each: mistake, why, correctApproach, consequence. "
        "Output valid JSON with \"type\", \"title\", \"mistakes\" array, and \"content\"."
    ),
    "advantages": (
        "Describe 5+ advantages of {topic} in {subject}. "
        "Each: point, explanation, scenario. "
        "Output valid JSON with \"type\", \"title\", \"items\" array, and \"content\"."
    ),
    "disadvantages": (
        "Describe 5+ disadvantages or limitations of {topic} in {subject}. "
        "Each: point, explanation, scenario. "
        "Output valid JSON with \"type\", \"title\", \"items\" array, and \"content\"."
    ),
    "realWorldApplications": (
        "Describe 5+ real-world applications of {topic} in {subject}. "
        "Each: domain, description, impact. "
        "Output valid JSON with \"type\", \"title\", \"applications\" array, and \"content\"."
    ),
    "industryUsage": (
        "Describe how real companies (Google, Amazon, Tesla, Microsoft, Meta, Apple, etc.) "
        "use {topic} in {subject}. 5+ companies, technically accurate. "
        "Output valid JSON with \"type\", \"title\", \"usages\" array, and \"content\"."
    ),
    "summary": (
        "Write a comprehensive summary of {topic} in {subject}. "
        "Reiterate critical concepts, principles, insights. Minimum 300 words. "
        "Output valid JSON: {{\"type\":\"summary\",\"title\":\"26. Summary\",\"content\":\"...\",\"keyPoints\":[{{\"point\":\"...\",\"elaboration\":\"...\"}}]}}"
    ),
}

# Section groupings (which sections to generate together for efficiency)
SECTION_GROUPS: List[List[str]] = [
    ["introduction", "definition"],
    ["coreConcepts", "working"],
    ["examples", "codeExamples"],
    ["advantages", "disadvantages"],
    ["realWorldApplications", "industryUsage"],
    ["commonMistakes", "cheatSheet"],
    ["quiz", "interviewQuestions"],
    ["summary"],
]

SECTION_METADATA: Dict[str, Dict[str, Any]] = {
    "introduction": {"title": "1. Introduction", "order": 1},
    "definition": {"title": "4. Definition and Formal Description", "order": 4},
    "coreConcepts": {"title": "5. Core Concepts", "order": 5},
    "working": {"title": "7. How It Works", "order": 7},
    "examples": {"title": "14. Examples", "order": 14},
    "codeExamples": {"title": "16. Code Examples", "order": 16},
    "advantages": {"title": "12. Advantages", "order": 12},
    "disadvantages": {"title": "13. Disadvantages", "order": 13},
    "realWorldApplications": {"title": "10. Real-World Applications", "order": 10},
    "industryUsage": {"title": "11. Industry Usage", "order": 11},
    "commonMistakes": {"title": "19. Common Mistakes and Misconceptions", "order": 19},
    "cheatSheet": {"title": "25. Cheat Sheet", "order": 25},
    "quiz": {"title": "Quiz", "order": 50},
    "interviewQuestions": {"title": "21. Interview Questions", "order": 21},
    "summary": {"title": "26. Summary", "order": 26},
}


def _build_section_prompt(section_type: str, subject: str, topic: str) -> str:
    """Build a focused prompt for a single section."""
    base = SECTION_PROMPTS.get(section_type, "Write a detailed explanation of {topic} in {subject}. Output valid JSON.")
    prompt = base.format(topic=topic, subject=subject)
    return prompt


async def _generate_section(
    provider: AIProvider,
    section_type: str,
    subject: str,
    topic: str,
    group_index: int,
) -> Tuple[str, Optional[Dict[str, Any]], Optional[str]]:
    """Generate a single section. Returns (section_type, section_data, error)."""
    meta = SECTION_METADATA.get(section_type, {"title": section_type, "order": 99})
    section_prompt = _build_section_prompt(section_type, subject, topic)
    system_msg = (
        "You are a Distinguished Professor of Engineering. "
        "Output valid JSON ONLY. No markdown fences. No extra text. "
        "Escape double quotes as \\\" and backslashes as \\\\. "
        "Use LaTeX for math: $$ for display, $ for inline. "
        "Use university textbook language."
    )
    messages = [
        Message(role="system", content=system_msg),
        Message(role="user", content=section_prompt),
    ]
    request = CompletionRequest(
        messages=messages,
        model="llama-3.1-8b-instant",
        temperature=0.7,
        max_tokens=2048,
        stream=True,
    )

    accumulated = ""
    try:
        async with _section_semaphore:
            async for event in provider.complete_stream(request):
                if event.error:
                    return section_type, None, event.error
                if event.content:
                    accumulated += event.content
    except Exception as e:
        logger.warning("Section %s generation failed: %s", section_type, e)
        return section_type, None, str(e)

    if not accumulated.strip():
        return section_type, None, "Empty response"

    # Parse the section JSON
    extracted, fmt = response_parser.extract_json(accumulated)
    if not extracted:
        logger.warning("Section %s: no JSON found, type=%s", section_type, fmt)
        # Use raw content as fallback
        return section_type, {
            "type": section_type,
            "title": meta["title"],
            "content": accumulated[:5000],
        }, None

    repaired = response_parser.repair_json(extracted)
    try:
        section_data = json.loads(repaired)
        if not isinstance(section_data, dict):
            section_data = {"type": section_type, "content": str(section_data)}
        section_data["type"] = section_type
        if "title" not in section_data:
            section_data["title"] = meta["title"]
        # Ensure content key exists — build from array fields if missing
        if "content" not in section_data or not section_data.get("content"):
            for fallback_key in ("items", "examples", "applications", "usages", "questions", "mistakes", "concepts", "keyPoints"):
                arr = section_data.get(fallback_key, [])
                if isinstance(arr, list) and arr:
                    try:
                        section_data["content"] = "\n\n".join(
                            str(item.get("point", item.get("question", item.get("name", item.get("term", str(item))))))
                            for item in arr[:5]
                        )[:5000]
                        break
                    except Exception:
                        continue
            else:
                # Final fallback: use raw accumulated content
                section_data["content"] = accumulated[:5000]
        return section_type, section_data, None
    except json.JSONDecodeError as e:
        logger.warning("Section %s: JSON parse error: %s", section_type, e)
        return section_type, {
            "type": section_type,
            "title": meta["title"],
            "content": accumulated[:5000],
        }, None


async def generate_sections(
    provider: AIProvider,
    subject: str,
    topic: str,
    engine_id: str = "",
) -> AsyncGenerator[Dict[str, Any], None]:
    """Generate lesson sections concurrently. Yields each section as it completes."""
    logger.info(
        "Section generation starting: subject=%s topic=%s groups=%d sections=%d",
        subject, topic, len(SECTION_GROUPS), sum(len(g) for g in SECTION_GROUPS),
    )

    start_time = time.time()

    # Generate sections group by group
    for gi, group in enumerate(SECTION_GROUPS):
        tasks = [
            _generate_section(provider, st, subject, topic, gi)
            for st in group
        ]

        # Run sections within group concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for section_type, section_data, error in results:
            if isinstance(error, str):
                logger.warning("Section %s failed: %s", section_type, error)
                section_data = {
                    "type": section_type,
                    "title": SECTION_METADATA.get(section_type, {}).get("title", section_type),
                    "content": f"*Content generation for this section encountered an issue.*",
                }
            elif isinstance(section_data, BaseException):
                logger.error("Section %s raised: %s", section_type, section_data)
                section_data = {
                    "type": section_type,
                    "title": SECTION_METADATA.get(section_type, {}).get("title", section_type),
                    "content": f"*Content generation for this section encountered an issue.*",
                }

            if section_data:
                yield {
                    "type": "section",
                    "section_type": section_type,
                    "data": section_data,
                    "engine_id": engine_id,
                    "elapsed": round(time.time() - start_time, 2),
                }

    yield {
        "type": "sections_done",
        "engine_id": engine_id,
        "elapsed": round(time.time() - start_time, 2),
    }

    logger.info(
        "Section generation complete: %d groups, %.1fs elapsed",
        len(SECTION_GROUPS), time.time() - start_time,
    )


async def generate_sections_v2(
    provider: AIProvider,
    subject: str,
    topic: str,
    engine_id: str = "",
) -> AsyncGenerator[Dict[str, Any], None]:
    """Generate sections in parallel across all API keys using asyncio.gather."""
    logger.info("Section gen v2: subject=%s topic=%s", subject, topic)
    start = time.time()

    all_sections = [st for group in SECTION_GROUPS for st in group]
    tasks = [
        _generate_section(provider, st, subject, topic, 0)
        for st in all_sections
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    for section_type, section_data, error in results:
        if isinstance(error, str):
            logger.warning("Section %s failed: %s", section_type, error)
            section_data = {"type": section_type, "title": SECTION_METADATA.get(section_type,{}).get("title",section_type), "content": "*Section generation encountered an issue.*"}
        elif isinstance(section_data, BaseException):
            logger.error("Section %s raised: %s", section_type, section_data)
            section_data = {"type": section_type, "title": SECTION_METADATA.get(section_type,{}).get("title",section_type), "content": "*Section generation encountered an issue.*"}
        yield {"type":"section","section_type":section_type,"data":section_data,"engine_id":engine_id,"elapsed":round(time.time()-start,2)}

    yield {"type":"sections_done","engine_id":engine_id,"elapsed":round(time.time()-start,2)}
    logger.info("Section gen v2 complete: %.1fs", time.time()-start)
