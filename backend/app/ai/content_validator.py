import re
import json
import logging
import os
import time
from typing import Dict, Any, List, Tuple, Optional

logger = logging.getLogger(__name__)

# =============================================================================
# 1. LaTeX Validation & Auto-Repair
# =============================================================================


def validate_and_repair_latex(text: str) -> Tuple[str, bool]:
    original = text
    repaired = text
    is_valid = True

    # 1. Globally normalize double-escaped begin/end tags so they are correctly matched and wrapped
    repaired = re.sub(r'\\\\(begin|end)', r'\\\1', repaired)

    # 2. Double/Triple delimiter normalization (e.g. $$$ or $$$$ -> $$)
    repaired = re.sub(r'\${3,}', '$$', repaired)

    # Temporary hide valid block math to find bare environments easily
    block_maths = []
    def hide_double_dollar(match):
        idx = len(block_maths)
        block_maths.append(match.group(0))
        return f"__BLOCK_MATH_{idx}__"
    repaired = re.sub(r'\$\$[\s\S]*?\$\$', hide_double_dollar, repaired)
    repaired = re.sub(r'\\\[[\s\S]*?\\\]', hide_double_dollar, repaired)

    # 3. Ensure un-delimited LaTeX environments are wrapped in $$
    # Since all valid blocks are hidden, any remaining \begin is bare!
    def wrap_bare(match):
        return f"\n$$\n{match.group(0).strip()}\n$$\n"
    repaired = re.sub(r'\\begin\{(matrix|bmatrix|pmatrix|vmatrix|align|equation|gather|split|cases)\}[\s\S]*?\\end\{\1\}', wrap_bare, repaired)

    # Restore block math
    for idx, block in enumerate(block_maths):
        repaired = repaired.replace(f"__BLOCK_MATH_{idx}__", block)

    # 4. Unmatched dollar signs ($) repair/balancing
    repaired, math_ok = _balance_inline_math_delimiters(repaired)
    if not math_ok:
        is_valid = False

    # 5. Repair malformed matrix syntax (missing \\ row breaks inside matrix blocks)
    repaired = _repair_matrix_syntax(repaired)

    # 6. Fix double-escaped backslashes inside math blocks (e.g., \\begin -> \begin, \\alpha -> \alpha)
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

def _validate_mermaid_syntax(code: str) -> Tuple[bool, List[str]]:
    errors = []
    lines = code.split('\n')
    has_declaration = False
    
    valid_declarations = (
        'graph ', 'flowchart ', 'sequenceDiagram', 'classDiagram', 
        'stateDiagram-v2', 'stateDiagram', 'erDiagram', 'gantt', 
        'pie', 'gitGraph', 'requirementDiagram', 'journey'
    )
    
    is_flowchart = False
    
    for i, line in enumerate(lines):
        l = line.strip()
        if not l:
            continue
            
        if any(l.startswith(dec) for dec in valid_declarations):
            has_declaration = True
            if l.startswith(('graph', 'flowchart')):
                is_flowchart = True
                
        # 1. Flowchart notes check
        if is_flowchart:
            if re.match(r'^note\s+(right|left)\s+of\b', l, re.IGNORECASE):
                errors.append(f"Line {i+1}: Flowcharts do not support note directives.")
                
        # 2. Invalid arrow / trailing arrow check
        if re.search(r'\|[^|]+\|>', l):
            errors.append(f"Line {i+1}: Invalid labeled edge syntax (trailing arrow).")
            
        # 3. Unbalanced brackets check
        if not l.startswith('%%'):
            for ob, cb in [('[', ']'), ('(', ')'), ('{', '}')]:
                if l.count(ob) != l.count(cb):
                    errors.append(f"Line {i+1}: Unbalanced brackets '{ob}' and '{cb}'.")
                    
        # 4. Duplicate arrows
        if re.search(r'-->\s*-->', l) or re.search(r'==>\s*==>', l):
            errors.append(f"Line {i+1}: Duplicate edge arrow declarations.")
            
    if not has_declaration:
        errors.append("Missing diagram declaration type (e.g. flowchart TD).")
        
    return len(errors) == 0, errors


def _balance_brackets(line: str) -> str:
    brackets = [('[', ']'), ('(', ')'), ('{', '}')]
    for ob, cb in brackets:
        o_count = line.count(ob)
        c_count = line.count(cb)
        if o_count > c_count:
            line += cb * (o_count - c_count)
    return line


def _log_mermaid_failure(original: str, repaired: str, errors: List[str], rules: List[str]):
    log_dir = os.path.join(os.getcwd(), "logs")
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, "mermaid_errors.log")
    try:
        with open(log_file, "a", encoding="utf-8") as f:
            f.write("="*80 + "\n")
            f.write(f"TIMESTAMP: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"PARSER ERRORS:\n" + "\n".join(f"- {e}" for e in errors) + "\n")
            f.write(f"REPAIR RULES APPLIED:\n" + "\n".join(f"- {r}" for r in rules) + "\n")
            f.write(f"ORIGINAL MERMAID:\n{original}\n\n")
            f.write(f"SANITIZED MERMAID:\n{repaired}\n")
            f.write("="*80 + "\n\n")
    except Exception as ex:
        logger.error(f"Failed to log Mermaid failure: {ex}")


def _repair_mermaid_block(content: str) -> Tuple[str, bool, bool, List[str]]:
    """
    Repairs syntax inside a single Mermaid diagram block.
    Returns (repaired_content, is_valid, did_repair, applied_rules).
    """
    lines = content.split('\n')
    cleaned_lines = []
    has_declaration = False
    did_repair = False
    applied_rules = []
    
    valid_declarations = (
        'graph ', 'flowchart ', 'sequenceDiagram', 'classDiagram', 
        'stateDiagram-v2', 'stateDiagram', 'erDiagram', 'gantt', 
        'pie', 'gitGraph', 'requirementDiagram', 'journey'
    )
    
    is_flowchart = False
    
    # First pass: find declaration and clean empty lines
    for line in lines:
        l = line.strip()
        if not l:
            continue
        if any(l.startswith(dec) for dec in valid_declarations):
            has_declaration = True
            if l.startswith(('graph', 'flowchart')):
                is_flowchart = True
        cleaned_lines.append(l)
        
    if not has_declaration:
        cleaned_lines.insert(0, "flowchart TD")
        is_flowchart = True
        did_repair = True
        applied_rules.append("Prepend default flowchart TD declaration")
        
    repaired_lines = []
    note_counter = 0
    in_note = False
    note_target = None
    note_lines = []
    
    for l in cleaned_lines:
        orig = l
        
        # Handle notes in flowcharts
        if is_flowchart:
            # Multi-line note start: note right/left of Node
            multi_note_match = re.match(r'^note\s+(right|left)\s+of\s+([a-zA-Z0-9_-]+)\s*$', l, re.IGNORECASE)
            if multi_note_match:
                in_note = True
                note_target = multi_note_match.group(2)
                note_lines = []
                did_repair = True
                applied_rules.append("Parse multi-line flowchart note start")
                continue
                
            if in_note:
                if re.match(r'^end\s+note$', l, re.IGNORECASE):
                    in_note = False
                    note_counter += 1
                    note_text = " ".join(note_lines).replace('"', "'")
                    repaired_lines.append(f'    NoteNode{note_counter}["{note_text}"]')
                    repaired_lines.append(f'    {note_target} -.-> NoteNode{note_counter}')
                    applied_rules.append(f"Convert multi-line flowchart note for {note_target} to plain node")
                else:
                    note_lines.append(l)
                continue
                
            # Single-line note: note right/left of Node: Text
            single_note_match = re.match(r'^note\s+(right|left)\s+of\s+([a-zA-Z0-9_-]+)\s*:\s*(.*)$', l, re.IGNORECASE)
            if single_note_match:
                note_counter += 1
                note_target = single_note_match.group(2)
                note_text = single_note_match.group(3).replace('"', "'")
                repaired_lines.append(f'    NoteNode{note_counter}["{note_text}"]')
                repaired_lines.append(f'    {note_target} -.-> NoteNode{note_counter}')
                did_repair = True
                applied_rules.append(f"Convert single-line flowchart note for {note_target} to plain node")
                continue
                
        # 1. Fix trailing > on labeled edges (A -->|text|> B to A -->|text| B)
        if re.search(r'\|([^|]+)\|>', l):
            l = re.sub(r'\|([^|]+)\|>', r'|\1|', l)
            applied_rules.append("Fix trailing arrow bracket on edge label")
            
        # 2. Repair malformed arrows:
        # Collapse multiple dashes: -----> or ---> to -->
        if re.search(r'-{3,}>', l):
            l = re.sub(r'-{3,}>', '-->', l)
            applied_rules.append("Collapse long arrow line (dashes)")
        if re.search(r'={3,}>', l):
            l = re.sub(r'={3,}>', '==>', l)
            applied_rules.append("Collapse long double arrow line (equals)")
        if re.search(r'\.-{2,}>', l):
            l = re.sub(r'\.-{2,}>', '-.->', l)
            applied_rules.append("Fix dotted arrow line")
            
        # Spaced arrows
        spaced_arrow = False
        if re.search(r'-\s*->', l) or re.search(r'-\s*-\s*>', l):
            l = re.sub(r'-\s*->', '-->', l)
            l = re.sub(r'-\s*-\s*>', '-->', l)
            spaced_arrow = True
        if re.search(r'=\s*=>', l) or re.search(r'=\s*=\s*>', l):
            l = re.sub(r'=\s*=>', '==>', l)
            l = re.sub(r'=\s*=\s*>', '==>', l)
            spaced_arrow = True
        if re.search(r'<\s*-\s*-', l):
            l = re.sub(r'<\s*-\s*-', '<--', l)
            spaced_arrow = True
        if spaced_arrow:
            applied_rules.append("Remove spaces in arrow characters")
            
        # Fix raw -- connecting nodes without label to -->
        if re.search(r'\s+--\s+(?![|])', l):
            l = re.sub(r'\s+--\s+(?![|])', ' --> ', l)
            applied_rules.append("Convert open line to standard arrow")
            
        # 3. Remove duplicate arrows (A --> --> B)
        if re.search(r'-->\s*-->', l) or re.search(r'==>\s*==>', l):
            l = re.sub(r'-->\s*-->', '-->', l)
            l = re.sub(r'==>\s*==>', '==>', l)
            applied_rules.append("De-duplicate consecutive arrows")
            
        # 4. Remove empty nodes
        if re.search(r'[A-Za-z0-9_-]+\s*\[\s*\]', l) or re.search(r'[A-Za-z0-9_-]+\s*\(\s*\)', l):
            l = re.sub(r'[A-Za-z0-9_-]+\s*\[\s*\]', '', l)
            l = re.sub(r'[A-Za-z0-9_-]+\s*\(\s*\)', '', l)
            l = re.sub(r'[A-Za-z0-9_-]+\s*\{\s*\}', '', l)
            applied_rules.append("Remove empty node brackets")
            
        # 5. Quote unquoted node labels with special characters
        l_quoted = _quote_mermaid_labels(l)
        if l_quoted != l:
            l = l_quoted
            applied_rules.append("Quote special characters in node label")
            
        # 6. Repair brackets (balance brackets)
        l_balanced = _balance_brackets(l)
        if l_balanced != l:
            l = l_balanced
            applied_rules.append("Balance unmatched brackets")
            
        # Clean inline HTML tags except safe breaks
        l_no_html = re.sub(r'<(?!br\s*/?>)[^>]+>', '', l)
        if l_no_html != l:
            l = l_no_html
            applied_rules.append("Clean raw HTML tags")
            
        if l != orig:
            did_repair = True
            
        if l.strip():
            repaired_lines.append(l)
            
    repaired_code = '\n'.join(repaired_lines)
    is_valid, _ = _validate_mermaid_syntax(repaired_code)
    
    return repaired_code, is_valid, did_repair, applied_rules


def _quote_mermaid_labels(line: str) -> str:
    """Quotes node labels containing special characters to prevent Mermaid parser errors."""
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
            if special_chars.search(label) and not (label.startswith('"') and label.endswith('"')):
                quoted = replacement.replace(r'\1', m.group(1)).replace(r'\2', label.replace('"', '\\"'))
                line = line.replace(m.group(0), quoted)
                
    return line


def validate_and_repair_mermaid(text: str) -> Tuple[str, bool, bool]:
    """
    Validates Mermaid syntax. If invalid, applies sanitization and logs details if it fails.
    Returns (repaired_text, is_valid, did_repair).
    """
    original = text
    parts = []
    last_end = 0
    all_valid = True
    did_repair = False

    for match in re.finditer(r"```mermaid\s*([\s\S]*?)\s*```", text, flags=re.DOTALL):
        parts.append(text[last_end:match.start()])
        block_content = match.group(1).strip()
        
        # 1. Initial Validation
        is_ok, errors = _validate_mermaid_syntax(block_content)
        
        if not is_ok:
            # 2. Repair common mistakes
            repaired_block, block_ok, block_repaired, applied_rules = _repair_mermaid_block(block_content)
            if block_repaired:
                did_repair = True
            
            # 3. Post-repair Validation
            final_ok, final_errors = _validate_mermaid_syntax(repaired_block)
            if not final_ok:
                all_valid = False
                # Log failed validation to dedicated errors file
                _log_mermaid_failure(block_content, repaired_block, final_errors, applied_rules)
            
            parts.append(f"```mermaid\n{repaired_block}\n```")
        else:
            parts.append(f"```mermaid\n{block_content}\n```")
            
        last_end = match.end()

    parts.append(text[last_end:])
    repaired_text = "".join(parts)
    
    if did_repair:
        logger.info(f"Mermaid auto-repaired. Length delta: {len(repaired_text) - len(original)}")
        
    return repaired_text, all_valid, did_repair


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

    from app.ai.health_monitor import health_monitor
    is_valid = True

    # 1. Check if visualization section is missing Mermaid block
    if section_type == "visualization":
        if "```mermaid" not in content:
            logger.warning("Visualization section is missing ```mermaid block.")
            health_monitor.diagram_missing += 1
            return content, False

    # 2. Quiz JSON validation & repair is handled separately via parse_and_validate_quiz_json.
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

    # 3. Standard Markdown sections:
    # First, run LaTeX validations
    content, latex_ok = validate_and_repair_latex(content)
    if not latex_ok:
        is_valid = False

    # Next, run Mermaid diagram validations
    content, mermaid_ok, did_repair = validate_and_repair_mermaid(content)
    if not mermaid_ok:
        is_valid = False
    if did_repair:
        health_monitor.diagram_repaired += 1

    # Finally, sanitize headings, bullets, code blocks, and HTML
    content = sanitize_markdown(content)

    # Double check visualization section post-repair
    if section_type == "visualization" and "```mermaid" not in content:
        health_monitor.diagram_missing += 1
        is_valid = False

    return content, is_valid

def validate_subject_code_rules(content: str, subject: str, topic: str) -> bool:
    """
    Validates that non-programming subjects do not contain inappropriate programming code blocks.
    Returns True if valid, False if it violates the rules.
    """
    subject_lower = subject.lower()
    topic_lower = topic.lower()

    # Subjects that should NOT contain code
    no_code_subjects = ["mathematics", "math", "physics", "chemistry"]

    # Check if current subject falls into the no_code category
    is_no_code_subject = any(s in subject_lower for s in no_code_subjects)
    
    # If the topic explicitly mentions programming, we might allow it (edge case override)
    explicit_code_override = any(word in topic_lower for word in ["programming", "code", "python", "c++", "java", "javascript"])

    if is_no_code_subject and not explicit_code_override:
        # Check for programming markdown fences
        programming_fences = [
            "```python", "```cpp", "```java", "```javascript", "```js", "```c", "```ts", "```typescript"
        ]
        for fence in programming_fences:
            if fence in content.lower():
                logger.warning(f"Validation failed: Subject '{subject}' is a non-programming subject but contained code block '{fence}'.")
                return False

    return True
