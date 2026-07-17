"""Robust JSON response parsing, extraction, repair, and markdown fallback."""
import json
import logging
import os
import re
import time
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

RAW_LOG_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "logs", "raw_responses",
)

EXPECTED_SECTION_TYPES = {
    "explanation": {"type", "title", "content"},
    "analogy": {"type", "title", "analogy", "explanation"},
    "caseStudy": {"type", "title", "scenario", "analysis", "lessons"},
    "examples": {"type", "title", "items"},
    "code": {"type", "title", "language", "code", "explanation"},
    "complexity": {"type", "title", "bestCase", "averageCase", "worstCase", "spaceComplexity", "explanation"},
    "diagram": {"type", "title", "diagram", "caption"},
    "formula": {"type", "title", "formula", "explanation"},
    "cheatSheet": {"type", "title", "items"},
    "quiz": {"type", "title", "questions"},
    "interviewQuestions": {"type", "title", "questions"},
    "projects": {"type", "title", "projects"},
    "mistakes": {"type", "title", "mistakes"},
    "visualization": {"type", "title", "type_field", "description"},
    "prerequisites": {"type", "title", "prerequisites"},
    "references": {"type", "title", "references"},
}

REQUIRED_METADATA_FIELDS = {
    "title": str,
    "subject": str,
    "topic": str,
    "difficulty": str,
    "learningMode": str,
}


class ResponseParser:
    def __init__(self):
        self._total = 0
        self._repaired = 0
        self._failed = 0
        self._markdown_fallback = 0
        os.makedirs(RAW_LOG_DIR, exist_ok=True)

    def _log_raw(self, raw: str, label: str) -> None:
        ts = time.strftime("%Y%m%d_%H%M%S")
        safe = re.sub(r'[^\w\-]', '_', label)[:60]
        path = os.path.join(RAW_LOG_DIR, f"{ts}_{safe}.txt")
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(raw)
            logger.info("Raw response logged: %s (%d chars)", path, len(raw))
        except Exception as e:
            logger.warning("Failed to log raw response: %s", e)

    def extract_json(self, text: str) -> Tuple[Optional[str], str]:
        """Extract JSON from AI response. Returns (json_string, format_description)."""
        text = text.strip()
        if not text:
            return None, "empty"

        fmt = "unknown"

        # Pattern 1: ```json ... ```
        code_match = re.search(
            r"```(?:json|JSON)\s*([\s\S]*?)\s*```", text, re.IGNORECASE
        )
        if code_match:
            extracted = code_match.group(1).strip()
            if extracted.startswith("{") and extracted.endswith("}"):
                return extracted, "json_fence"

        # Pattern 2: ``` ... ``` (bare fence)
        code_match = re.search(
            r"```\s*([\s\S]*?)\s*```", text, re.IGNORECASE
        )
        if code_match:
            extracted = code_match.group(1).strip()
            if extracted.startswith("{") and extracted.endswith("}"):
                return extracted, "bare_fence"

        # Pattern 3: text before/after JSON object
        brace_start = text.find("{")
        brace_end = text.rfind("}")
        if brace_start != -1 and brace_end > brace_start:
            # Check if there's text before or after the JSON
            before = text[:brace_start].strip()
            after = text[brace_end + 1:].strip()
            if before or after:
                fmt = "mixed" if before else "mixed_after"
            else:
                fmt = "bare"
            return text[brace_start:brace_end + 1], fmt

        return None, "no_json"

    def repair_json(self, text: str) -> str:
        """Repair common JSON issues. Returns repaired text."""
        original = text

        # Fix trailing commas before } and ]
        text = re.sub(r",\s*}", "}", text)
        text = re.sub(r",\s*]", "]", text)

        # Fix unescaped backslashes (but keep valid \n, \t, etc.)
        text = re.sub(r'(?<!\\)\\(?![\/\\"bfnrtu])', r'\\\\', text)

        # Convert single-quote keys to double-quote
        text = re.sub(r"'([^']*)'\s*:", r'"\1":', text)
        text = re.sub(r":\s*'([^']*)'", r': "\1"', text)
        text = re.sub(r"(?<![\\\"])'(?![\\\"])", '"', text)

        # Fix unescaped quotes inside strings
        text = self._fix_unescaped_quotes(text)

        # Fix missing commas between array elements (closing } followed by {)
        text = re.sub(r"}\s*{", "},{", text)

        # Fix missing commas between object properties (} followed by ")
        text = re.sub(r'"([^"]+)"\s*{', r'"\1":{', text)

        # Fix NaN / Infinity / undefined values
        text = re.sub(r':\s*NaN', ': null', text)
        text = re.sub(r':\s*Infinity', ': null', text)
        text = re.sub(r':\s*undefined', ': null', text)

        # Fix broken unicode escapes
        text = re.sub(r'\\u([0-9a-fA-F]{0,3}[^0-9a-fA-F])', r'\\u0000\1', text)
        text = re.sub(r'\\u([0-9a-fA-F]{1,3})(?=[^0-9a-fA-F\\"])', lambda m: '\\u' + m.group(1).zfill(4), text)

        # Fix Python-style True/False/None
        text = re.sub(r':\s*True', ': true', text)
        text = re.sub(r':\s*False', ': false', text)
        text = re.sub(r':\s*None', ': null', text)

        # Fix JavaScript-style undefined/null shorthand
        text = re.sub(r':\s*null\s*,', ': null,', text)

        # Strip invalid control characters (0x00-0x1F except \t, \n, \r)
        text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)

        # Escape code blocks inside string values
        text = self._fix_code_in_strings(text)

        # Convert \n outside strings to real newlines
        text = self._fix_outside_escapes(text)

        # Escape raw newlines/tabs inside string values
        text = self._escape_control_in_strings(text)

        if text != original:
            logger.debug("Repair applied: %d chars changed", len(text) - len(original))

        return text

    def _fix_code_in_strings(self, text: str) -> str:
        """Escape problematic characters inside code block string values."""
        result = []
        i = 0
        in_string = False
        escape_next = False
        code_depth = 0

        while i < len(text):
            ch = text[i]

            if escape_next:
                result.append(ch)
                escape_next = False
                i += 1
                continue

            if ch == '\\' and in_string:
                escape_next = True
                result.append(ch)
                i += 1
                continue

            if ch == '"':
                # Check if this is a code block boundary
                peek = text[i:i + 6]
                if peek == '"""' or peek == '"```':
                    code_depth += 1 if not in_string else -1
                    if code_depth < 0:
                        code_depth = 0
                    result.append(ch)
                    i += 1
                    continue

                if in_string:
                    j = i + 1
                    while j < len(text) and text[j] in " \t\n\r":
                        j += 1
                    if j < len(text) and text[j] in ":,]}":
                        in_string = False
                        result.append(ch)
                    else:
                        result.append('\\"')
                else:
                    j = i - 1
                    while j >= 0 and text[j] in " \t\n\r":
                        j -= 1
                    if j < 0 or text[j] in ":[{,":
                        in_string = True
                        result.append(ch)
                    else:
                        result.append('\\"')
                i += 1
                continue

            result.append(ch)
            i += 1

        return "".join(result)

    def _fix_outside_escapes(self, text: str) -> str:
        """Replace \\n, \\t, \\r with actual whitespace when outside JSON string values.
        This fixes models that use JSON escape sequences as formatting.
        """
        result = []
        in_string = False
        escape_next = False
        i = 0
        while i < len(text):
            ch = text[i]

            if escape_next:
                result.append(ch)
                escape_next = False
                i += 1
                continue

            if ch == '\\' and in_string:
                escape_next = True
                result.append(ch)
                i += 1
                continue

            if ch == '\\' and not in_string and i + 1 < len(text):
                nxt = text[i + 1]
                if nxt == 'n':
                    result.append('\n')
                    i += 2
                    continue
                if nxt == 't':
                    result.append('\t')
                    i += 2
                    continue
                if nxt == 'r':
                    result.append('\r')
                    i += 2
                    continue

            if ch == '"':
                if not in_string:
                    # Check if quote starts a string (preceded by :, [, {, or ,)
                    j = i - 1
                    while j >= 0 and text[j] in ' \t\n\r':
                        j -= 1
                    if j < 0 or text[j] in ':[{,':
                        in_string = True
                else:
                    # Check if quote ends a string (followed by :, ,, ], })
                    j = i + 1
                    while j < len(text) and text[j] in ' \t\n\r':
                        j += 1
                    if j < len(text) and text[j] in ':,]}':
                        in_string = False
                result.append(ch)
                i += 1
                continue

            result.append(ch)
            i += 1

        return ''.join(result)

    def _escape_control_in_strings(self, text: str) -> str:
        """Escape literal newlines, tabs, and carriage returns inside JSON string values."""
        result = []
        in_string = False
        escape_next = False
        i = 0
        while i < len(text):
            ch = text[i]
            if escape_next:
                result.append(ch)
                escape_next = False
                i += 1
                continue
            if ch == '\\' and in_string:
                escape_next = True
                result.append(ch)
                i += 1
                continue
            if ch == '"':
                if not in_string:
                    j = i - 1
                    while j >= 0 and text[j] in ' \t\n\r':
                        j -= 1
                    if j < 0 or text[j] in ':[{,':
                        in_string = True
                else:
                    j = i + 1
                    while j < len(text) and text[j] in ' \t\n\r':
                        j += 1
                    if j < len(text) and text[j] in ':,]}':
                        in_string = False
                result.append(ch)
                i += 1
                continue
            if in_string and ch in '\n\r\t':
                result.append('\\n' if ch == '\n' else '\\r' if ch == '\r' else '\\t')
                i += 1
                continue
            result.append(ch)
            i += 1
        return ''.join(result)

    def _fix_unescaped_quotes(self, text: str) -> str:
        """Fix unescaped double quotes inside JSON strings."""
        result = []
        i = 0
        in_string = False
        escape_next = False

        while i < len(text):
            ch = text[i]

            if ch == "\\" and in_string:
                escape_next = not escape_next
                result.append(ch)
                i += 1
                continue

            if escape_next:
                escape_next = False
                result.append(ch)
                i += 1
                continue

            if ch == '"':
                if in_string:
                    j = i + 1
                    while j < len(text) and text[j] in " \t\n\r":
                        j += 1
                    if j < len(text) and text[j] in ":,":
                        in_string = False
                        result.append(ch)
                    elif j < len(text) and text[j] in "]}":
                        in_string = False
                        result.append(ch)
                    else:
                        result.append('\\"')
                else:
                    j = i - 1
                    while j >= 0 and text[j] in " \t\n\r":
                        j -= 1
                    if j < 0 or text[j] in ":[{,":
                        in_string = True
                        result.append(ch)
                    else:
                        result.append('\\"')
                i += 1
                continue

            result.append(ch)
            i += 1

        return "".join(result)

    def json_to_markdown(self, raw_text: str, subject: str = "", topic: str = "") -> Dict[str, Any]:
        """Convert raw AI response to a markdown-based lesson structure."""
        self._markdown_fallback += 1
        lines = raw_text.strip().split("\n")
        title = topic or "Lesson"
        content_lines = []
        in_code = False

        for line in lines:
            stripped = line.strip()
            if stripped.startswith("```"):
                in_code = not in_code
                content_lines.append(line)
                continue
            if in_code:
                content_lines.append(line)
                continue
            # Count header levels for section detection
            content_lines.append(line)

        content = "\n".join(content_lines)

        # Extract title from first # heading or first line
        title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        if title_match:
            title = title_match.group(1).strip()
        elif subject and topic:
            title = f"{subject}: {topic}"

        return {
            "metadata": {
                "title": title,
                "subject": subject,
                "topic": topic,
                "difficulty": "intermediate",
                "learningMode": "default",
                "estimatedReadingTime": max(5, len(content) // 2000),
                "prerequisites_list": [],
                "learningObjectives": [],
                "tags": [subject.lower().replace(" ", "-")] if subject else [],
            },
            "sections": {
                "introduction": {
                    "type": "introduction",
                    "title": "1. Introduction",
                    "content": content,
                }
            },
            "is_markdown": True,
            "markdown_content": content,
        }

    def validate(self, raw_content: str, subject: str = "", topic: str = "") -> Tuple[Dict[str, Any], bool]:
        """Validate and parse AI response. Returns (lesson_data, was_repaired)."""
        self._total += 1

        # Log raw response before any processing
        self._log_raw(raw_content, f"{subject}_{topic}_raw")

        extracted, fmt = self.extract_json(raw_content)

        if not extracted:
            logger.warning("No JSON found in response (fmt=%s), falling back to markdown", fmt)
            self._failed += 1
            markdown_lesson = self.json_to_markdown(raw_content, subject, topic)
            return markdown_lesson, True

        logger.info("JSON extraction: format=%s length=%d chars", fmt, len(extracted))

        repaired_text = self.repair_json(extracted)
        was_repaired = repaired_text != extracted

        if was_repaired:
            logger.info("JSON repair applied: %d chars changed", len(repaired_text) - len(extracted))
            self._log_raw(repaired_text, f"{subject}_{topic}_repaired")
            self._repaired += 1

        try:
            data = json.loads(repaired_text)
        except json.JSONDecodeError as e:
            logger.error("JSON parse failed after repair: %s", e)
            self._failed += 1
            self._repaired += 1
            # Try markdown fallback
            logger.info("Attempting markdown fallback...")
            markdown_lesson = self.json_to_markdown(raw_content, subject, topic)
            return markdown_lesson, True

        data = self._ensure_metadata(data, subject, topic)
        data = self._ensure_sections(data)
        data = self._ensure_resources(data)

        return data, was_repaired

    def _ensure_metadata(self, data: Dict[str, Any], subject: str = "", topic: str = "") -> Dict[str, Any]:
        if "metadata" not in data or not isinstance(data["metadata"], dict):
            data["metadata"] = {}
        meta = data["metadata"]
        defaults = {
            "title": topic or "Untitled Lesson",
            "subject": subject,
            "topic": topic,
            "difficulty": "intermediate",
            "learningMode": "default",
            "estimatedReadingTime": 5,
            "prerequisites_list": [],
            "learningObjectives": [],
            "tags": [],
        }
        for key, default in defaults.items():
            if key not in meta or meta[key] is None:
                meta[key] = default
        if not isinstance(meta.get("prerequisites_list", []), list):
            meta["prerequisites_list"] = []
        if not isinstance(meta.get("learningObjectives", []), list):
            meta["learningObjectives"] = []
        if not isinstance(meta.get("tags", []), list):
            meta["tags"] = []
        return data

    def _ensure_sections(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if "sections" not in data or not isinstance(data["sections"], dict):
            data["sections"] = {}
        sections = data["sections"]
        for key, section in list(sections.items()):
            if not isinstance(section, dict):
                sections[key] = {"type": key, "title": key, "content": ""}
                continue
            section["type"] = key
            if "title" not in section:
                section["title"] = key.replace("_", " ").title()
            if key == "quiz":
                section = self._ensure_quiz(section)
        return data

    def _ensure_quiz(self, section: Dict[str, Any]) -> Dict[str, Any]:
        questions = section.get("questions", [])
        if not isinstance(questions, list):
            section["questions"] = []
            return section
        for q in questions:
            if not isinstance(q, dict):
                continue
            if "options" in q and isinstance(q["options"], list):
                if len(q["options"]) < 4:
                    q["options"] = q["options"] + ["(A) Option A", "(B) Option B", "(C) Option C", "(D) Option D"][
                        len(q["options"]) - 4:
                    ]
        return section

    def _ensure_resources(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if "resources" not in data or not isinstance(data["resources"], dict):
            data["resources"] = {"keyTerms": [], "furtherReading": []}
        resources = data["resources"]
        if "keyTerms" not in resources or not isinstance(resources["keyTerms"], list):
            resources["keyTerms"] = []
        if "furtherReading" not in resources or not isinstance(resources["furtherReading"], list):
            resources["furtherReading"] = []
        return data

    def get_stats(self) -> Dict[str, int]:
        return {
            "total": self._total,
            "repaired": self._repaired,
            "failed": self._failed,
            "markdown_fallback": self._markdown_fallback,
        }


response_parser = ResponseParser()
