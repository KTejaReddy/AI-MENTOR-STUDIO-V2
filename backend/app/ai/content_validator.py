import re
import json
import logging
from typing import Dict, Any, List, Tuple, Optional

logger = logging.getLogger(__name__)

# =============================================================================
# 1. LaTeX Validation & Auto-Repair
# =============================================================================


def validate_and_repair_latex(text: str) -> Tuple[str, bool]:
    original = text
    repaired = text
    is_valid = True

    # 1. Double/Triple delimiter normalization (e.g. $$$ or $$$$ -> $$)
    repaired = re.sub(r'\${3,}', '$$', repaired)

    # Temporary hide valid block math to find bare environments easily
    block_maths = []
    def hide_double_dollar(match):
        idx = len(block_maths)
        block_maths.append(match.group(0))
        return f"__BLOCK_MATH_{idx}__"
    repaired = re.sub(r'\$\$[\s\S]*?\$\$', hide_double_dollar, repaired)
    repaired = re.sub(r'\\\[[\s\S]*?\\\]', hide_double_dollar, repaired)

    # 2. Ensure un-delimited LaTeX environments are wrapped in $$
    # Since all valid blocks are hidden, any remaining \begin is bare!
    def wrap_bare(match):
        return f"\n$$\n{match.group(0).strip()}\n$$\n"
    repaired = re.sub(r'\\begin\{(matrix|bmatrix|pmatrix|vmatrix|align|equation|gather|split|cases)\}[\s\S]*?\\end\{\1\}', wrap_bare, repaired)

    # Restore block math
    for idx, block in enumerate(block_maths):
        repaired = repaired.replace(f"__BLOCK_MATH_{idx}__", block)

    # 3. Unmatched dollar signs ($) repair/balancing
    repaired, math_ok = _balance_inline_math_delimiters(repaired)
    if not math_ok:
        is_valid = False

    # 4. Repair malformed matrix syntax (missing \\ row breaks inside matrix blocks)
    repaired = _repair_matrix_syntax(repaired)

    # 5. Fix double-escaped backslashes inside math blocks (e.g., \\begin -> \begin, \\alpha -> \alpha)
    repaired = _fix_math_escapes(repaired)

    was_changed = repaired != original
    if was_changed:
        logger.info(f"LaTeX auto-repaired. Length delta: {len(repaired) - len(original)}")

    return repaired, is_valid


def _wrap_bare_latex_environments(text: str) -> str:
    r"""Wraps environments like \begin{bmatrix}...\end{bmatrix} in $$ if not already delimited."""
    pattern = r'(?<!\$\$)(?<!\\\[)\s*(\\begin\{(matrix|bmatrix|pmatrix|vmatrix|align|equation|gather|split|cases)\}[\s\S]*?\\end\{\2\})\s*(?!\$\$)(?!\\\])'
    
    def replacer(match):
        return f"\n$$\n{match.group(1).strip()}\n$$\n"
        
    return re.sub(pattern, replacer, text)

def _balance_inline_math_delimiters(text: str) -> Tuple[str, bool]:
    inline_math_pattern = re.compile(r'(?<!\\)\$([^\s\$](?:[^\$\n]*?[^\s\$])?)(?<!\\)\$')
    lines = text.split('\n')
    repaired_lines = []
    is_ok = True
    
    for line in lines:
        if line.strip().startswith('#'):
            repaired_lines.append(line)
            continue
            
        block_maths = []
        placeholder = line
        while '$$' in placeholder:
            idx = len(block_maths)
            start = placeholder.find('$$')
            end = placeholder.find('$$', start + 2)
            if end != -1:
                block_maths.append(placeholder[start:end+2])
                placeholder = placeholder[:start] + f"__BLOCK_MATH_{idx}__" + placeholder[end+2:]
            else:
                block_maths.append(placeholder[start:])
                placeholder = placeholder[:start] + f"__BLOCK_MATH_{idx}__"
                break
                
        inline_maths = []
        def inline_repl(match):
            idx = len(inline_maths)
            inline_maths.append(match.group(0))
            return f"__INLINE_MATH_{idx}__"
            
        placeholder = inline_math_pattern.sub(inline_repl, placeholder)
        
        unmatched_count = len(re.findall(r'(?<!\\)\$', placeholder))
        if unmatched_count > 0:
            logger.info(f"Escaping {unmatched_count} unmatched dollar signs in line: {line[:50]}...")
            placeholder = re.sub(r'(?<!\\)\$', r'\$', placeholder)
            
        for idx, math_content in enumerate(inline_maths):
            placeholder = placeholder.replace(f"__INLINE_MATH_{idx}__", math_content)
            
        for idx, math_content in enumerate(block_maths):
            placeholder = placeholder.replace(f"__BLOCK_MATH_{idx}__", math_content)
            
        repaired_lines.append(placeholder)
        
    return '\n'.join(repaired_lines), is_ok
def _repair_matrix_syntax(text: str) -> str:
    """Ensures lines inside matrix/align environments end with \\ properly."""
    # Find block math sections
    def replacer(match):
        block = match.group(0)
        # Search inside \begin{matrix} ... \end{matrix}
        inner_matches = re.finditer(r'(\\begin\{(matrix|bmatrix|pmatrix|vmatrix|align|split)\})([\s\S]*?)(\\end\{\2\})', block)
        new_block = block
        for im in inner_matches:
            env_type = im.group(1)
            env_content = im.group(3)
            env_end = im.group(4)
            
            # Split rows by newline and clean empty ones
            rows = env_content.strip().split('\n')
            new_rows = []
            for i, r in enumerate(rows):
                r_clean = r.strip()
                if not r_clean:
                    continue
                # If it doesn't end with \\ and isn't the final row, append \\
                if not r_clean.endswith('\\\\') and i < len(rows) - 1:
                    r_clean += ' \\\\'
                new_rows.append(r_clean)
            
            new_content = '\n  ' + '\n  '.join(new_rows) + '\n'
            # Escape strings to be replaced safely
            new_env = f"{env_type}{new_content}{env_end}"
            new_block = new_block.replace(im.group(0), new_env)
        return new_block

    return re.sub(r'\$\$[\s\S]*?\$\$', replacer, text)


def _fix_math_escapes(text: str) -> str:
    """Corrects double-escaped backslashes inside math blocks."""
    def replacer(match):
        block = match.group(0)
        # Convert double backslashes to single ones, except for row breaks (\\\\)
        # Temporary replace row breaks
        temp = block.replace('\\\\', '__ROW_BREAK__')
        # Replace remaining double backslashes \\alpha -> \alpha
        temp = re.sub(r'\\\\([a-zA-Z{}])', r'\\\1', temp)
        temp = re.sub(r'\\\\(begin|end)', r'\\\1', temp)
        # Restore row breaks
        return temp.replace('__ROW_BREAK__', '\\\\')

    return re.sub(r'\$\$[\s\S]*?\$\$', replacer, text)


# =============================================================================
# 2. Mermaid Validation & Auto-Repair
# =============================================================================

def validate_and_repair_mermaid(text: str) -> Tuple[str, bool]:
    """
    Validates Mermaid syntax (starts with graph/flowchart, quotes label parameters, fix arrows).
    Returns (repaired_text, is_valid).
    """
    original = text
    parts = []
    last_end = 0
    is_valid = True

    # Scan for mermaid code blocks
    for match in re.finditer(r"```mermaid\s*([\s\S]*?)\s*```", text, flags=re.DOTALL):
        parts.append(text[last_end:match.start()])
        block_content = match.group(1).strip()
        
        repaired_block, block_ok = _repair_mermaid_block(block_content)
        if not block_ok:
            is_valid = False
            
        parts.append(f"```mermaid\n{repaired_block}\n```")
        last_end = match.end()

    parts.append(text[last_end:])
    repaired_text = "".join(parts)
    
    if repaired_text != original:
        logger.info(f"Mermaid auto-repaired. Length delta: {len(repaired_text) - len(original)}")
        
    return repaired_text, is_valid


def _repair_mermaid_block(content: str) -> Tuple[str, bool]:
    """Repairs syntax inside a single Mermaid diagram block."""
    lines = content.split('\n')
    repaired_lines = []
    has_declaration = False
    
    valid_declarations = (
        'graph ', 'flowchart ', 'sequenceDiagram', 'classDiagram', 
        'stateDiagram-v2', 'stateDiagram', 'erDiagram', 'gantt', 
        'pie', 'gitGraph', 'requirementDiagram'
    )

    for line in lines:
        l_strip = line.strip()
        if not l_strip:
            continue
        if l_strip.startswith(valid_declarations):
            has_declaration = True
        
        # Repair broken arrow notation (e.g., - ->, -- >, == >, <- -)
        l_strip = re.sub(r'-\s*->', '-->', l_strip)
        l_strip = re.sub(r'-\s*-\s*>', '-->', l_strip)
        l_strip = re.sub(r'-\s*-\s*-\s*>', '--->', l_strip)
        l_strip = re.sub(r'=\s*=>', '==>', l_strip)
        l_strip = re.sub(r'=\s*=\s*>', '==>', l_strip)
        l_strip = re.sub(r'<\s*-\s*-', '<--', l_strip)
        
        # Repair unquoted node labels with special characters (e.g. A[Label (Info)])
        # Node shape delimiters in Mermaid: [], (), (()), {}, [[]], (()) etc.
        # Check node declarations and wrap label in quotes if special characters exist and are not already quoted
        l_strip = _quote_mermaid_labels(l_strip)
        
        # Strip raw HTML tags (e.g. <div style="..."> but keep safe <br> and <br/>)
        l_strip = re.sub(r'<(?!br\s*/?>)[^>]+>', '', l_strip)
        
        repaired_lines.append(l_strip)

    if not has_declaration:
        # Prepend default flowchart declaration if missing
        repaired_lines.insert(0, "graph TD")
        logger.info("Prepend missing graph TD declaration to Mermaid block")

    return '\n'.join(repaired_lines), True


def _quote_mermaid_labels(line: str) -> str:
    """Quotes node labels containing special characters to prevent Mermaid parser errors."""
    # Matches patterns like: node_id[label text] or node_id(label text)
    # Shapes: [ ] (rect), ( ) (round), (( )) (circle), { } (rhombus), > ] (flag)
    shapes = [
        (r'([a-zA-Z0-9_-]+)\[([^"\]]+)\]', r'\1["\2"]'),
        (r'([a-zA-Z0-9_-]+)\(([^"\)]+)\)', r'\1("\2")'),
        (r'([a-zA-Z0-9_-]+)\{\{([^"\}]+)\}\}', r'\1{{"\2"}}'),
        (r'([a-zA-Z0-9_-]+)\{([^"\}]+)\}', r'\1{"\2"}'),
    ]
    
    special_chars = re.compile(r'[(),:\[\]{}<>/@!%&*+=?|`~#-]')
    
    for pattern, replacement in shapes:
        matches = re.finditer(pattern, line)
        for m in matches:
            label = m.group(2)
            # If label has special chars and isn't already quoted, apply replacement
            if special_chars.search(label) and not (label.startswith('"') and label.endswith('"')):
                # Safe replacements
                quoted = replacement.replace(r'\1', m.group(1)).replace(r'\2', label.replace('"', '\\"'))
                line = line.replace(m.group(0), quoted)
                
    return line


# =============================================================================
# 3. Markdown Sanitizer
# =============================================================================

def sanitize_markdown(text: str) -> str:
    """
    Normalizes markdown structure, fixing headings, duplicated list bullets,
    and ensuring code blocks are closed.
    """
    original = text
    repaired = text

    # 1. Normalize headings (e.g. ##Heading -> ## Heading)
    repaired = re.sub(r'^(#+)([^#\s\n][^\n]*)$', r'\1 \2', repaired, flags=re.MULTILINE)

    # 2. Strip bolding/formatting inside headings (e.g. ## **Heading** -> ## Heading)
    repaired = re.sub(r'^(#+)\s+\*\*([^*]+)\*\*$', r'\1 \2', repaired, flags=re.MULTILINE)
    repaired = re.sub(r'^(#+)\s+\*([^*]+)\*$', r'\1 \2', repaired, flags=re.MULTILINE)

    # 3. Normalize duplicated list bullets (e.g. * * Item -> * Item or - - Item -> - Item)
    repaired = re.sub(r'^\s*([*\-+])\s+\1\s+', r'\1 ', repaired, flags=re.MULTILINE)

    # 4. Check for unclosed code fences
    fence_count = len(re.findall(r'^```', repaired, flags=re.MULTILINE))
    if fence_count % 2 != 0:
        logger.warning("Detected unmatched markdown code fence. Autoclosing at content end.")
        repaired += "\n```\n"

    # 5. Strip raw dangerous HTML, allow styling elements like <br>, <sub>, <sup>
    repaired = re.sub(r'<(script|iframe|style|html|body|head|meta|link)[^>]*?>[\s\S]*?</\1>', '', repaired, flags=re.IGNORECASE)
    repaired = re.sub(r'on\w+\s*=\s*"(?:[^"]+|\\")*"', '', repaired, flags=re.IGNORECASE)

    if repaired != original:
        logger.debug(f"Markdown sanitized. Length delta: {len(repaired) - len(original)}")

    return repaired


# =============================================================================
# 4. Quiz JSON Pipeline
# =============================================================================

def parse_and_validate_quiz_json(raw_json: str) -> Tuple[Optional[Dict[str, Any]], List[str]]:
    """
    Strips code fences, sanitizes escapes, strictly parses JSON, and validates
    against quiz schema. Returns (parsed_dict, validation_issues).
    """
    issues = []
    
    # 1. Clean thinking blocks (<think>...</think>)
    raw_json = re.sub(r'<think>[\s\S]*?</think>', '', raw_json).strip()
    
    # 2. Strip code fences (e.g., ```json ... ```)
    if '```' in raw_json:
        # Try to find content inside the first code block
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', raw_json, re.IGNORECASE)
        if match:
            raw_json = match.group(1).strip()
        else:
            raw_json = re.sub(r'```(?:json)?', '', raw_json).strip()

    # Find the bounds of the outermost JSON object
    start_idx = raw_json.find('{')
    end_idx = raw_json.rfind('}')
    if start_idx == -1 or end_idx == -1 or end_idx < start_idx:
        issues.append("Could not locate outer JSON braces '{' and '}'.")
        return None, issues

    json_str = raw_json[start_idx:end_idx + 1]

    # 3. Sanitize bad escape sequences inside the raw string before parsing
    # Fix raw control characters and escape unescaped internal double-quotes
    json_str = _sanitize_json_string(json_str)

    # 4. Parse JSON strictly
    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as e:
        # Attempt fallback to simple regex cleaning for trailing commas or single quotes
        try:
            cleaned = _fallback_clean_json(json_str)
            data = json.loads(cleaned)
        except Exception as e2:
            issues.append(f"JSON Parse Failure: {e} (Fallback also failed: {e2})")
            return None, issues

    # 5. Schema Validation
    questions = data.get("questions")
    if not isinstance(questions, list):
        issues.append("Missing or invalid 'questions' field (must be a JSON array).")
        return data, issues

    valid_questions = []
    for idx, q in enumerate(questions):
        q_issues = []
        if not isinstance(q, dict):
            q_issues.append(f"Question {idx+1} is not a valid JSON object.")
            continue
            
        # Validate required string fields
        for field in ("question", "correctAnswer", "explanation"):
            val = q.get(field)
            if not val or not isinstance(val, str) or not val.strip():
                q_issues.append(f"Missing or empty string field '{field}'")
                
        # Validate options
        opts = q.get("options")
        if not opts or not isinstance(opts, dict):
            q_issues.append("Missing or invalid 'options' field (must be a JSON object).")
        else:
            # Enforce option keys A, B, C, D
            for opt_key in ('A', 'B', 'C', 'D'):
                opt_val = opts.get(opt_key)
                if not opt_val or not isinstance(opt_val, str) or not opt_val.strip():
                    q_issues.append(f"Missing option '{opt_key}'")

        # Validate correctAnswer key
        ans = q.get("correctAnswer")
        if ans not in ('A', 'B', 'C', 'D'):
            q_issues.append(f"correctAnswer '{ans}' must be exactly one of 'A', 'B', 'C', or 'D'.")

        if q_issues:
            issues.extend([f"Question {idx+1}: {iss}" for iss in q_issues])
        else:
            valid_questions.append(q)

    # Re-assign only fully valid questions
    data["questions"] = valid_questions

    if len(valid_questions) != 10:
        issues.append(f"Found {len(valid_questions)} valid questions instead of exactly 10.")

    return data, issues


def _sanitize_json_string(s: str) -> str:
    """Sanitizes raw JSON string escape sequences before parsing."""
    # Fix trailing commas inside array/objects
    s = re.sub(r',\s*}', '}', s)
    s = re.sub(r',\s*]', ']', s)
    
    # Strip literal control characters (tab, newline) inside string blocks
    # Replace single backslashes not matching standard escape characters with double backslashes
    s = re.sub(r'(?<!\\)\\(?!["\\\/bfnrtu])', r'\\\\', s)
    
    # Fix Python-style boolean/null
    s = re.sub(r':\s*True\b', ': true', s)
    s = re.sub(r':\s*False\b', ': false', s)
    s = re.sub(r':\s*None\b', ': null', s)
    
    return s


def _fallback_clean_json(s: str) -> str:
    """Brute force JSON syntax fixer for common LLM generation mistakes."""
    # Fix single quotes to double quotes for keys and values
    s = re.sub(r"'([^']*)'\s*:", r'"\1":', s)
    s = re.sub(r":\s*'([^']*)'", r': "\1"', s)
    # Strip dangerous unescaped newlines inside strings
    # We replace any newline that is inside a double quoted string block
    # By searching for double quotes and escaping newlines in between
    parts = s.split('"')
    for i in range(1, len(parts), 2):
        parts[i] = parts[i].replace('\n', '\\n').replace('\r', '')
    return '"'.join(parts)


# =============================================================================
# 5. Integrated Validator Entry Point
# =============================================================================

def validate_and_repair_section(section_type: str, content: str) -> Tuple[str, bool]:
    """
    Main entry point for verifying and repairing a section's markdown content.
    Returns (cleaned_content, is_valid).
    """
    if not content or not content.strip():
        return content, False

    is_valid = True

    # 1. Quiz JSON validation & repair is handled separately via parse_and_validate_quiz_json.
    # If the caller is passing a serialized quiz, we parse, validate, and convert it.
    if section_type == "quiz":
        # Check if content is raw JSON or already converted markdown
        if content.strip().startswith('{') or 'questions' in content:
            parsed, issues = parse_and_validate_quiz_json(content)
            if not issues and parsed:
                # Import here to avoid circular dependencies
                from app.ai.full_lesson_orchestrator import convert_json_to_quiz_markdown
                return convert_json_to_quiz_markdown(parsed), True
            else:
                logger.warning(f"Quiz validation failed: {issues}")
                return content, False

    # 2. Standard Markdown sections:
    # First, run LaTeX validations
    content, latex_ok = validate_and_repair_latex(content)
    if not latex_ok:
        is_valid = False

    # Next, run Mermaid diagram validations
    content, mermaid_ok = validate_and_repair_mermaid(content)
    if not mermaid_ok:
        is_valid = False

    # Finally, sanitize headings, bullets, code blocks, and HTML
    content = sanitize_markdown(content)

    return content, is_valid
