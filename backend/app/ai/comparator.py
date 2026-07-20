import logging
import json
import re
from typing import Dict, Any

logger = logging.getLogger(__name__)

class LessonComparator:
    """
    Automatically compares a legacy lesson output against an adaptive lesson output.
    Used during Shadow Mode to statistically validate structural and quality equivalence.
    """
    
    @classmethod
    def compare(cls, legacy: Dict[str, Any], adaptive: Dict[str, Any]) -> float:
        score = 1.0
        penalties = []
        
        # 1. Structural Comparison
        legacy_sections = set(legacy.keys())
        adaptive_sections = set(adaptive.keys())
        
        # In the real legacy output, sections are nested in "content" or top level. 
        # Assuming we just compare the raw section text or keys.
        missing_sections = legacy_sections - adaptive_sections
        if missing_sections:
            score -= 0.1 * len(missing_sections)
            penalties.append(f"Missing sections: {missing_sections}")
            
        # 2. Content Quality & Word Count
        legacy_text = " ".join([str(v) for v in legacy.values()])
        adaptive_text = " ".join([str(v) for v in adaptive.values()])
        
        legacy_words = len(legacy_text.split())
        adaptive_words = len(adaptive_text.split())
        
        if legacy_words > 0:
            ratio = adaptive_words / legacy_words
            if ratio < 0.90:
                # Penalize if adaptive is significantly shorter
                penalty = (0.90 - ratio)
                score -= penalty
                penalties.append(f"Word count regression: {adaptive_words} vs {legacy_words}")
                
        # 3. Code Blocks & Markdown
        legacy_code_blocks = len(re.findall(r"```[a-z]*\n", legacy_text))
        adaptive_code_blocks = len(re.findall(r"```[a-z]*\n", adaptive_text))
        if legacy_code_blocks > 0 and adaptive_code_blocks < legacy_code_blocks * 0.8:
            score -= 0.05
            penalties.append("Significant drop in code block frequency.")
            
        # 4. Mermaid Diagrams
        if "mermaid" in legacy_text.lower() and "mermaid" not in adaptive_text.lower():
            score -= 0.05
            penalties.append("Missing Mermaid diagram.")
            
        # 5. Math LaTeX
        legacy_math = len(re.findall(r"\$[^$]+\$", legacy_text))
        adaptive_math = len(re.findall(r"\$[^$]+\$", adaptive_text))
        if legacy_math > 0 and adaptive_math == 0:
            score -= 0.05
            penalties.append("Missing Math LaTeX.")
            
        score = max(0.0, score)
        
        if score < 0.95:
            logger.warning(f"[SHADOW MODE REGRESSION] Similarity Score: {score:.2f} | Reasons: {', '.join(penalties)}")
        else:
            logger.info(f"[SHADOW MODE SUCCESS] Similarity Score: {score:.2f}")
            
        return score

lesson_comparator = LessonComparator()
