"""
Reviewer Agent — Quality control for generated sections.
Validates content before showing to student. Regenerates on failure.
"""
import logging
import re
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass

from app.ai.base import AIProvider, CompletionRequest, Message
from app.ai.key_pool import key_pool
from app.ai.model_router import model_router
from app.ai.agents import AGENT_CONFIGS

logger = logging.getLogger(__name__)


@dataclass
class ReviewResult:
    passed: bool
    score: float  # 0-1
    issues: List[str]
    suggestions: List[str]
    metrics: Dict[str, Any]

    @property
    def quality_score(self) -> float:
        return self.score


class ReviewerAgent:
    """
    Reviews generated sections for quality.
    If quality is below threshold, triggers regeneration with specific feedback.
    """

    # Minimum quality thresholds per section
    QUALITY_THRESHOLDS = {
        "explanation": 0.75,
        "caseStudy": 0.70,
        "analogy": 0.70,
        "examples": 0.70,
        "quiz": 0.75,
        "assignment": 0.70,
        "projects": 0.70,
        "commonMistakes": 0.65,
        "interviewQuestions": 0.70,
        "cheatSheet": 0.65,
    }

    def __init__(self, key_pool=key_pool):
        self.key_pool = key_pool

    async def review(
        self,
        section_type: str,
        content: str,
        subject: str,
        topic: str,
        difficulty: str = "intermediate",
    ) -> ReviewResult:
        """Alias for review_section to maintain compatibility with orchestrator."""
        return await self.review_section(
            section_type=section_type,
            content=content,
            subject=subject,
            topic=topic,
            difficulty=difficulty,
        )

    async def review_section(
        self,
        section_type: str,
        content: str,
        subject: str,
        topic: str,
        difficulty: str = "intermediate",
    ) -> ReviewResult:
        """Review a single section for quality."""
        issues = []
        suggestions = []
        metrics = {}

        # 1. Structural checks
        structural_issues = self._check_structure(section_type, content)
        issues.extend(structural_issues)

        # 2. Content depth checks
        depth_issues = self._check_depth(section_type, content, subject, topic)
        issues.extend(depth_issues)

        # 3. Formatting checks
        format_issues = self._check_formatting(section_type, content)
        issues.extend(format_issues)

        # 4. AI-phrase detection
        ai_issues = self._check_ai_phrases(content)
        issues.extend(ai_issues)

        # 5. JSON leakage
        json_issues = self._check_json_leakage(content)
        issues.extend(json_issues)

        # Calculate metrics
        metrics = self._calculate_metrics(section_type, content)

        # Score based on issues found
        severity_weights = {
            "critical": 0.25,
            "major": 0.15,
            "minor": 0.05,
        }

        score = 1.0
        for issue in issues:
            severity = issue.get("severity", "minor")
            score -= severity_weights.get(severity, 0.05)

        score = max(0.0, min(1.0, score))
        threshold = self.QUALITY_THRESHOLDS.get(section_type, 0.6)

        passed = score >= threshold and not any(i.get("severity") == "critical" for i in issues)

        if not passed:
            suggestions = self._generate_suggestions(section_type, issues, metrics)

        return ReviewResult(
            passed=passed,
            score=score,
            issues=[i["message"] for i in issues],
            suggestions=suggestions,
            metrics=metrics,
        )

    def _check_structure(self, section_type: str, content: str) -> List[Dict]:
        """Check section-specific structure requirements."""
        issues = []

        if section_type == "explanation":
            # Must have 30 sections
            required_markers = [
                "BEAUTIFUL TITLE", "INTRODUCTION", "LEARNING OBJECTIVES",
                "WHY THIS TOPIC EXISTS", "INTUITION", "REAL-LIFE ANALOGY",
                "FORMAL DEFINITION", "MENTAL MODEL", "HOW IT WORKS INTERNALLY",
                "VISUAL DIAGRAM", "FLOWCHART", "SYNTAX", "STEP-BY-STEP EXAMPLE",
                "DRY RUN", "MEMORY VISUALIZATION", "EXECUTION TRACE",
                "COMMON VARIATIONS", "ADVANCED CONCEPTS", "BEST PRACTICES",
                "COMMON MISTAKES", "DEBUGGING TIPS", "TIME COMPLEXITY",
                "SPACE COMPLEXITY", "REAL-WORLD APPLICATIONS", "INTERVIEW PERSPECTIVE",
                "EXAM PERSPECTIVE", "SUMMARY", "KEY TAKEAWAYS", "REVISION NOTES", "TRANSITION"
            ]
            found = sum(1 for m in required_markers if m.lower() in content.upper())
            if found < 25:
                issues.append({
                    "severity": "major",
                    "message": f"Only {found}/30 required sections found in explanation"
                })

        elif section_type == "caseStudy":
            case_count = content.lower().count("case study")
            if case_count < 3:
                issues.append({
                    "severity": "major",
                    "message": f"Only {case_count} case studies (minimum 3)"
                })
            if "mermaid" not in content.lower():
                issues.append({
                    "severity": "minor",
                    "message": "Missing architecture diagram (mermaid)"
                })

        elif section_type == "analogy":
            if content.lower().count("analogy") < 3:
                issues.append({
                    "severity": "major",
                    "message": "Less than 3 analogies found"
                })
            if "|" not in content:
                issues.append({
                    "severity": "minor",
                    "message": "Missing mapping tables"
                })

        elif section_type == "examples":
            code_blocks = content.count("```")
            if code_blocks < 10:
                issues.append({
                    "severity": "major",
                    "message": f"Only {code_blocks} code blocks (minimum 10 for 20+ examples)"
                })

        elif section_type == "quiz":
            mcq_count = content.count("**Correct Answer:")
            if mcq_count < 20:
                issues.append({
                    "severity": "major",
                    "message": f"Only {mcq_count} MCQs (minimum 20)"
                })

        elif section_type == "quiz":
            if "**Why others are wrong:**" not in content and "why others are wrong" not in content.lower():
                issues.append({
                    "severity": "minor",
                    "message": "Missing explanations for incorrect options"
                })

        elif section_type == "cheatSheet":
            if content.count("|") < 20:
                issues.append({
                    "severity": "major",
                    "message": "Insufficient tables for cheat sheet"
                })
            if "$$" not in content and "$" not in content:
                issues.append({
                    "severity": "minor",
                    "message": "Missing LaTeX formulas"
                })

        return issues

    def _check_depth(self, section_type: str, content: str, subject: str, topic: str) -> List[Dict]:
        """Check content depth and specificity."""
        issues = []
        words = len(content.split())

        min_words = {
            "explanation": 2500,
            "caseStudy": 1000,
            "analogy": 600,
            "examples": 2000,
            "quiz": 3000,
            "assignment": 1500,
            "projects": 1500,
            "commonMistakes": 1500,
            "interviewQuestions": 2000,
            "cheatSheet": 800,
        }

        required = min_words.get(section_type, 500)
        if words < required:
            issues.append({
                "severity": "major" if words < required * 0.5 else "minor",
                "message": f"Content too short: {words} words (minimum {required})"
            })

        # Check for generic content
        generic_phrases = [
            "example code here", "your code here", "implementation here",
            "add details", "todo:", "placeholder", "[insert", "etc.",
            "and so on", "various companies", "many organizations"
        ]
        for phrase in generic_phrases:
            if phrase.lower() in content.lower():
                issues.append({
                    "severity": "minor",
                    "message": f"Generic placeholder detected: '{phrase}'"
                })

        # Check for real company names (for case study, examples, projects)
        if section_type in ["caseStudy", "examples", "projects", "interviewQuestions"]:
            companies = ["google", "amazon", "netflix", "uber", "tesla", "microsoft",
                        "meta", "apple", "spotify", "airbnb", "stripe", "github",
                        "facebook", "linkedin", "twitter", "adobe", "nvidia"]
            found = sum(1 for c in companies if c in content.lower())
            if found < 2:
                issues.append({
                    "severity": "minor",
                    "message": f"Only {found} real company references (recommend 3+)"
                })

        return issues

    def _check_formatting(self, section_type: str, content: str) -> List[Dict]:
        """Check markdown formatting quality."""
        issues = []

        # Must have proper markdown
        if section_type != "cheatSheet" and "##" not in content:
            issues.append({
                "severity": "minor",
                "message": "Missing markdown headings (##)"
            })

        # Code blocks should have language
        code_blocks = re.findall(r'```(\w*)', content)
        for lang in code_blocks:
            if not lang:
                issues.append({
                    "severity": "minor",
                    "message": "Code block missing language identifier"
                })

        # Tables should be properly formatted
        if "|" in content:
            lines = content.split("\n")
            table_lines = [l for l in lines if l.strip().startswith("|")]
            for line in table_lines:
                if line.count("|") < 3:
                    issues.append({
                        "severity": "minor",
                        "message": "Malformed table row detected"
                    })
                    break

        return issues

    def _check_ai_phrases(self, content: str) -> List[Dict]:
        """Detect generic AI phrases."""
        ai_phrases = [
            ("delve into", "major"),
            ("let's dive into", "major"),
            ("in this section, we will", "major"),
            ("welcome to", "minor"),
            ("in conclusion", "minor"),
            ("certainly!", "minor"),
            ("hope this helps", "minor"),
            ("as an ai", "critical"),
            ("as a language model", "critical"),
            ("i don't have", "minor"),
        ]

        issues = []
        for phrase, severity in ai_phrases:
            if phrase.lower() in content.lower():
                issues.append({
                    "severity": severity,
                    "message": f"AI phrase detected: '{phrase}'"
                })

        return issues

    def _check_json_leakage(self, content: str) -> List[Dict]:
        """Check for JSON structure in content."""
        issues = []
        stripped = content.strip()

        if stripped.startswith("{") and '"content"' in stripped[:200]:
            issues.append({
                "severity": "critical",
                "message": "JSON wrapper leaked into content"
            })

        if '"type":' in content and '"title":' in content and '"content":' in content:
            # Might be full JSON
            if content.count('"content"') > 1:
                issues.append({
                    "severity": "major",
                    "message": "Possible nested JSON structure in content"
                })

        return issues

    def _calculate_metrics(self, section_type: str, content: str) -> Dict[str, Any]:
        """Calculate content metrics."""
        words = len(content.split())
        chars = len(content)
        lines = content.count("\n")
        code_blocks = content.count("```")
        headings = len(re.findall(r'^#{1,3}\s', content, re.MULTILINE))
        tables = content.count("|") // 2  # rough estimate
        mermaid = content.lower().count("mermaid")
        latex = content.count("$")
        bold = content.count("**")
        blockquotes = content.count(">")

        return {
            "words": words,
            "chars": chars,
            "lines": lines,
            "code_blocks": code_blocks,
            "headings": headings,
            "tables_estimated": tables,
            "mermaid_diagrams": mermaid,
            "latex_expressions": latex,
            "bold_terms": bold // 2,
            "blockquotes": blockquotes,
        }

    def _generate_suggestions(
        self,
        section_type: str,
        issues: List[Dict],
        metrics: Dict[str, Any],
    ) -> List[str]:
        """Generate specific improvement suggestions."""
        suggestions = []

        for issue in issues:
            msg = issue["message"]

            if "words" in msg and "short" in msg:
                suggestions.append(
                    f"Expand {section_type} content significantly. Target: "
                    f"{2500 if section_type == 'explanation' else 1000}+ words."
                )

            elif "sections found" in msg:
                suggestions.append(
                    "Ensure all 30 mandatory sections are present with clear headings. "
                    "Use format: '## 1. INTRODUCTION', '## 2. LEARNING OBJECTIVES', etc."
                )

            elif "case studies" in msg:
                suggestions.append(
                    "Add 3 detailed case studies from real companies (Google, Amazon, Netflix, etc.) "
                    "with metrics tables and mermaid architecture diagrams."
                )

            elif "analogies" in msg:
                suggestions.append(
                    "Create 3 distinct analogies from different domains (cooking, sports, music, etc.) "
                    "each with a mapping table and 'where it breaks' section."
                )

            elif "code blocks" in msg:
                suggestions.append(
                    "Add complete, runnable code examples. Each example needs: "
                    "title, code block with language, line-by-line explanation, expected output."
                )

            elif "MCQs" in msg:
                suggestions.append(
                    "Generate 25 multiple choice questions with A/B/C/D options, "
                    "correct answer, full explanation, and why each wrong option is incorrect."
                )

            elif "AI phrase" in msg:
                suggestions.append(
                    "Rewrite in professor voice. Use: 'Here's the key insight...', "
                    "'Think of it this way...', 'What most textbooks miss...', "
                    "'Let me show you...', 'Notice how...'"
                )

            elif "JSON" in msg:
                suggestions.append(
                    "Output ONLY the markdown content string. No JSON wrapper, no 'type', 'title' fields."
                )

            elif "tables" in msg:
                suggestions.append(
                    "Use markdown tables extensively for comparisons, syntax references, "
                    "complexity analysis, and mapping tables."
                )

        # Section-specific suggestions
        if section_type == "explanation" and metrics.get("mermaid_diagrams", 0) == 0:
            suggestions.append("Add at least one mermaid architecture diagram and one flowchart.")

        if section_type == "explanation" and metrics.get("latex_expressions", 0) == 0:
            suggestions.append("Include LaTeX math formulas ($$ for display, $ for inline).")

        if section_type == "cheatSheet" and metrics.get("tables_estimated", 0) < 5:
            suggestions.append("Cheat sheet needs more tables: concepts, syntax, formulas, complexity, comparisons.")

        return suggestions


# Global instance
reviewer_agent = ReviewerAgent()