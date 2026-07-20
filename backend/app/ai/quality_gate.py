import json
import re
import logging
from typing import Tuple, Dict, Any

logger = logging.getLogger(__name__)

class QualityGate:
    """
    Validates generated sections to ensure they meet quality standards.
    Checks for:
    - Valid JSON formatting (if expecting JSON)
    - Correct Mermaid syntax (no unclosed blocks, correct graph definitions)
    - Valid Markdown (no unclosed code blocks)
    - Valid Math LaTeX brackets.
    """

    def validate_section(self, section_type: str, content: str) -> Tuple[bool, str]:
        """
        Validates the content string.
        Returns (True, "") if valid, (False, "reason") if invalid.
        """
        if not content or not content.strip():
            return False, "Content is empty."

        # 1. Check for unclosed Markdown code blocks
        code_block_count = content.count("```")
        if code_block_count % 2 != 0:
            return False, "Unclosed markdown code block detected."

        # 2. Basic Mermaid validation
        if "```mermaid" in content:
            # Check if each mermaid block has a graph definition
            blocks = re.findall(r'```mermaid(.*?)```', content, re.DOTALL)
            for block in blocks:
                if not block.strip():
                    return False, "Empty Mermaid block detected."
                if not re.search(r'(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|pie|gantt)', block):
                    return False, "Mermaid block missing valid diagram type (e.g., graph, flowchart)."

        # 3. Basic Math LaTeX validation (check for mismatched $$)
        math_block_count = content.count("$$")
        if math_block_count % 2 != 0:
            return False, "Unclosed Math LaTeX block detected ($$)."
            
        # 4. Specific section JSON validation
        # Some sections might return JSON instead of raw markdown, validate if wrapped in ```json
        if "```json" in content:
            blocks = re.findall(r'```json(.*?)```', content, re.DOTALL)
            for block in blocks:
                try:
                    json.loads(block.strip())
                except json.JSONDecodeError as e:
                    return False, f"Invalid JSON in code block: {str(e)}"

        return True, ""

quality_gate = QualityGate()
