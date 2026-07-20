"""Multi-agent teaching orchestrator — 11 parallel premium section generators."""
import asyncio
import json
import logging
import re
import time
from typing import AsyncGenerator, Dict, Any, Optional, List, Tuple

from app.ai.base import AIProvider, CompletionRequest, Message
from app.ai.key_manager import key_manager
from app.ai.response_parser import response_parser
from app.ai.cache import lesson_cache

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
CONCURRENT_LIMIT = 11
_semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)

SECTION_DESCRIPTIONS: Dict[str, Dict[str, Any]] = {
    "explanation": {
        "title": "1. Explanation",
        "icon": "BookOpen",
        "order": 1,
        "max_tokens": 8192,
    },
    "caseStudy": {
        "title": "2. Case Study",
        "icon": "FileText",
        "order": 2,
        "max_tokens": 8192,
    },
    "analogy": {
        "title": "3. Analogy",
        "icon": "Lightbulb",
        "order": 3,
        "max_tokens": 8192,
    },
    "examples": {
        "title": "4. Examples",
        "icon": "List",
        "order": 4,
        "max_tokens": 8192,
    },
    "quiz": {
        "title": "5. Quiz",
        "icon": "BrainCircuit",
        "order": 5,
        "max_tokens": 8192,
    },
    "assignment": {
        "title": "6. Assignment",
        "icon": "ClipboardList",
        "order": 6,
        "max_tokens": 8192,
    },
    "projects": {
        "title": "7. Projects",
        "icon": "Puzzle",
        "order": 7,
        "max_tokens": 8192,
    },
    "commonMistakes": {
        "title": "8. Common Mistakes",
        "icon": "MessageSquare",
        "order": 8,
        "max_tokens": 8192,
    },
    "interviewQuestions": {
        "title": "9. Interview Preparation",
        "icon": "HelpCircle",
        "order": 9,
        "max_tokens": 8192,
    },
    "cheatSheet": {
        "title": "10. Cheat Sheet",
        "icon": "Bookmark",
        "order": 10,
        "max_tokens": 8192,
    },
}

# =============================================================================
# PREMIUM 30-SECTION UNIVERSITY TEXTBOOK PROMPT — explanation
# =============================================================================
EXPLANATION_PROMPT = (
    "You are a tenured Distinguished Professor at MIT with 30 years of teaching experience. "
    "You are renowned for making complex topics crystal clear. Your lectures are legendary — "
    "students line up to attend. Today you are teaching {topic} in {subject}.\n\n"
    "You MUST write a complete university lecture following the 30-section structure below. "
    "Every section is mandatory. NEVER skip any section. Each section must have rich, substantial content.\n\n"
    "---\n"
    "THE 30-SECTION STRUCTURE\n"
    "---\n\n"
    "1. BEAUTIFUL TITLE\n"
    "A creative, memorable title that captures the essence of {topic}. Example: \"{topic} — The Engine Behind Every Program\"\n"
    "Use a subtitle line with a teaser.\n\n"
    "2. INTRODUCTION\n"
    "A welcoming, friendly opening paragraph. Explain why the student should be excited to learn {topic}. "
    "Address the student directly. Use a hook — a question, a surprising fact, or a real scenario.\n\n"
    "3. LEARNING OBJECTIVES\n"
    "A bullet list of 4-6 specific, measurable things the student will be able to do after this lecture. "
    "Use verbs like: explain, implement, analyze, evaluate, design, debug.\n\n"
    "4. WHY THIS TOPIC EXISTS\n"
    "What real-world problem does {topic} solve? A brief history: who invented it, when, and why. "
    "What was life like before {topic} existed? Why is it still relevant today?\n\n"
    "5. INTUITION — The Aha Moment\n"
    "Explain the core idea using ZERO technical jargon. Use everyday language. "
    "The goal: a complete beginner should understand WHAT {topic} is after reading this section. "
    "End with one sentence that captures the entire concept: \"Here is the single most important idea...\"\n\n"
    "6. REAL-LIFE ANALOGY\n"
    "A detailed, concrete analogy from everyday life that maps perfectly to {topic}. "
    "Include a table mapping everyday concepts to technical concepts. "
    "Explain where the analogy works and where it breaks down.\n\n"
    "7. FORMAL DEFINITION\n"
    "A precise, engineering-grade definition. Use LaTeX math ($$ for display, $ for inline) where appropriate. "
    "Define every symbol and notation. Alternative formulations if they exist.\n\n"
    "8. MENTAL MODEL\n"
    "Help the student form a mental image of {topic}. "
    "\"Here is how you should picture {topic} in your mind...\" "
    "Use visual language, metaphors, and spatial descriptions.\n\n"
    "9. HOW IT WORKS INTERNALLY\n"
    "Explain what happens at the machine level. Cover: memory layout, CPU instructions, stack/heap behavior, "
    "compiler/interpreter handling, register usage, cache behavior — whichever applies to {topic}. "
    "This section is what separates a university lecture from a blog post.\n\n"
    "    10. VISUAL DIAGRAM\n"
    "Generate a Mermaid diagram showing the architecture, flow, or structure of {topic}. "
    "Use mermaid code block: ```mermaid\n...\n```\n"
    "CRITICAL: `|label|` must be followed immediately by the destination node ID, never by `>`.\n"
    "  CORRECT: `A -->|Addition| B`   WRONG: `A -->|Addition|> B`\n"
    "stateDiagram-v2: NEVER use `note \"text\"` — use `note right of <state> ... end note` blocks instead.\n"
    "Never invent Mermaid syntax. Use only official, documented syntax.\n"
    "Follow the mermaid with a paragraph explaining each component of the diagram.\n\n"
    "11. FLOWCHART (if applicable)\n"
    "If {topic} involves an execution flow, algorithm, or decision process, "
    "include a mermaid flowchart showing the steps. "
    "CRITICAL: `|label|` must be followed by the target node ID, never by `>`.\n"
    "Explain each step after the flowchart.\n\n"
    "12. SYNTAX\n"
    "Show the syntax of {topic} using beautiful code blocks. "
    "Use language-specific syntax: ```python / ```c / ```javascript etc.\n"
    "Explain each part of the syntax: keywords, identifiers, operators, punctuation.\n"
    "Include a syntax comparison table showing different forms or variations.\n\n"
    "13. STEP-BY-STEP EXAMPLE\n"
    "A complete, runnable example. Show the code FIRST, then a line-by-line explanation of what each line does. "
    "Every example must have: Code block → Line-by-line explanation → Expected output.\n\n"
    "14. DRY RUN\n"
    "Walk through {topic} iteration-by-iteration or step-by-step using a concrete example. "
    "Use a TABLE format showing the state at each step (variable values, conditions, etc.). "
    "Number each step. This is the most effective teaching tool — do NOT skip it.\n\n"
    "15. MEMORY VISUALIZATION\n"
    "Show how variables change in memory during execution. Use a table or diagram showing "
    "variable name, memory address (conceptual), value before, value after. "
    "Help students visualize the stack/heap changes.\n\n"
    "16. EXECUTION TRACE\n"
    "A line-by-line trace of program execution. Show the line number, the code, the state change, "
    "and any output produced. Use a table.\n\n"
    "17. COMMON VARIATIONS\n"
    "Show different ways to write or use {topic}. Compare them in a table: "
    "| Variation | Syntax | When to Use | Pros | Cons |\n\n"
    "18. ADVANCED CONCEPTS\n"
    "Deeper aspects of {topic} that go beyond the basics. "
    "Edge cases, optimizations, interactions with other features, non-obvious behaviors. "
    "This is where you challenge stronger students.\n\n"
    "19. BEST PRACTICES\n"
    "Industry-proven best practices. Use callouts: > **✅ Best Practice:** ...\n"
    "Include performance considerations, readability tips, style guide recommendations.\n\n"
    "20. COMMON MISTAKES\n"
    "The mistakes students make most often with {topic}. For each mistake:\n"
    "- The mistake\n"
    "- Why it happens\n"
    "- How to fix it\n"
    "- The correct code\n"
    "Use callout format: > **❌ Common Mistake:** ...\n\n"
    "21. DEBUGGING TIPS\n"
    "How to debug issues related to {topic}. Tools, techniques, print statements, debugger usage. "
    "What to look for when things go wrong.\n\n"
    "22. TIME COMPLEXITY (if applicable)\n"
    "Big O analysis. Best case, average case, worst case. Explanation of WHY each complexity occurs. "
    "Use LaTeX: $O(n)$, $O(\\log n)$, etc.\n\n"
    "23. SPACE COMPLEXITY (if applicable)\n"
    "Memory usage analysis. What consumes memory, how to optimize. "
    "Use LaTeX for notation.\n\n"
    "24. REAL-WORLD APPLICATIONS\n"
    "Minimum 3 concrete industry applications. For each: Company name, specific use case, "
    "why {topic} was the right choice, quantifiable impact (if known). "
    "Use a table: | Domain | Company | Use Case | Why {topic} |\n\n"
    "25. INTERVIEW PERSPECTIVE\n"
    "How {topic} appears in technical interviews. Typical questions, what interviewers look for, "
    "how to demonstrate deep understanding. Common follow-up questions.\n\n"
    "26. EXAM PERSPECTIVE\n"
    "How {topic} appears in university exams. Typical question patterns, "
    "grading criteria, time management strategies, common exam mistakes.\n\n"
    "27. SUMMARY\n"
    "A concise 5-7 bullet recap of the most important points from the entire lecture. "
    "Each bullet: 1-2 sentences maximum.\n\n"
    "28. KEY TAKEAWAYS\n"
    "5 bullet points. Each is a single powerful sentence the student should remember forever. "
    "These are the \"if you remember nothing else, remember these\" points.\n\n"
    "29. REVISION NOTES\n"
    "Compact notes formatted for quick revision. Use tables, mnemonics, one-liners. "
    "Designed to be printed and reviewed before exams.\n\n"
    "30. TRANSITION\n"
    "A brief paragraph connecting {topic} to the next natural topic in the curriculum. "
    "\"Now that you understand {topic}, you are ready to learn about [next topic]. "
    "Here's how they connect...\"\n\n"
    "---\n"
    "QUALITY RULES — Read these carefully\n"
    "---\n\n"
    "TONE:\n"
    "- Write like a brilliant professor teaching a live class. Natural, warm, authoritative.\n"
    "- Use first-person (\"I want you to notice...\", \"Let me show you...\", \"Here is the key insight...\")\n"
    "- Address the student directly (\"you\", \"your code\", \"your program\")\n"
    "- NOT like ChatGPT. NOT generic. NOT robotic. NOT Wikipedia.\n"
    "- Use handcrafted phrases, not templated AI phrases.\n"
    "- Every sentence should feel like it was written by a human expert who loves teaching.\n\n"
    "LENGTH:\n"
    "- Minimum 2500 words. Preferred: 3500-5000 words.\n"
    "- Never produce a short explanation. Short explanations mean you skipped sections.\n"
    "- Each of the 30 sections must have at least 3-5 sentences of substantial content.\n"
    "- Sections 9 (How it works internally), 13 (Step-by-step example), 14 (Dry run) "
    "must be the longest sections.\n\n"
    "MARKDOWN:\n"
    "- Use rich markdown throughout.\n"
    "- Tables for comparisons, dry runs, execution traces.\n"
    "- Code blocks with language identifiers.\n"
    "- Mermaid diagrams for architecture and flow (use official syntax only; no `|>` after labels; stateDiagram-v2: use `note right of`, never `note \"text\"`).\n"
    "- LaTeX math for formulas.\n"
    "- Blockquotes for callouts (mistakes, best practices, tips).\n"
    "- Bold for key terms. Italic for emphasis.\n"
    "- NEVER use emoji.\n\n"
    "CODE EXAMPLES:\n"
    "- Every code example must be complete and runnable (or clearly a snippet for illustration).\n"
    "- Every code example MUST be followed by: line-by-line explanation, expected output section, "
    "and common mistakes related to that code.\n\n"
    "WHAT NOT TO DO:\n"
    "- Do NOT use phrases like \"delve into\", \"let's dive into\", \"in this section, we will\", "
    "\"welcome to\", \"in conclusion\" — these are generic AI phrases.\n"
    "- Do NOT write like a textbook with dry definitions.\n"
    "- Do NOT skip any of the 30 sections.\n"
    "- Do NOT produce fewer than 2500 words.\n"
    "- Do NOT use emoji.\n\n"
    "FINAL CHECK:\n"
    "- Read your output before finalizing. Does it sound like a brilliant professor? "
    "If it sounds like ChatGPT, rewrite it.\n"
    "- Count your sections. All 30 must be present.\n"
    "- Count your words. Must exceed 2500.\n"
    "- Verify every code block has a following explanation.\n\n"
    "---\n"
    "OUTPUT FORMAT\n"
    "---\n"
    "Output valid JSON ONLY with this exact structure:\n"
    '{{"type":"explanation","title":"1. Explanation","content":"ALL 30 sections in markdown here..."}}'
)

CASE_STUDY_PROMPT = (
    "You are a senior industry consultant with 20 years of experience. Write compelling real-world case studies "
    "showing how {topic} in {subject} is applied at major technology companies.\n\n"
    "Structure (use markdown headings):\n\n"
    "## Case Study 1: [Company Name]\n"
    "- Company background and context (revenue, engineering culture, scale)\n"
    "- The specific problem they faced that {topic} helped solve\n"
    "- Technical architecture: how they implemented the solution (include a mermaid architecture diagram — official syntax only; no `|>` after labels; stateDiagram-v2: use `note right of`, never `note \"text\"`)\n"
    "- Engineering decisions and trade-offs they made\n"
    "- Measurable results: metrics, performance improvements, cost savings (use a table)\n"
    "- Key lessons for engineers\n\n"
    "## Case Study 2: [Company Name]\n"
    "(same structure as above — choose a different industry/domain)\n\n"
    "## Case Study 3: [Company Name] (bonus)\n"
    "- A shorter case study from a startup or emerging company\n\n"
    "Use real companies: Google, Amazon, Netflix, Uber, Tesla, Microsoft, Meta, Apple, Spotify, Airbnb, Stripe, GitHub, etc. "
    "Be technically accurate. Include specific technologies, frameworks, and metrics.\n\n"
    "Minimum 1000 words. Write in an engaging narrative style — like a Harvard Business Review case study.\n\n"
    "Output valid JSON ONLY:\n"
    '{{"type":"caseStudy","title":"2. Case Study","content":"...ALL case studies in markdown..."}}'
)

ANALOGY_PROMPT = (
    "You are a master educator famous for making impossibly complex topics feel simple and intuitive. "
    "Write memorable, click-making analogies for {topic} in {subject}.\n\n"
    "Each analogy must follow this structure:\n\n"
    "### Analogy 1: [Everyday Scenario Name]\n"
    "- The everyday scenario (describe vividly — 2-3 sentences)\n"
    "- The technical mapping table:\n"
    "  | Everyday Concept | {topic} Concept | Why This Maps |\n"
    "  |---|---|----|\n"
    "  | [concept] | [equivalent] | [explanation] |\n"
    "- Why this analogy works (the deep insight it reveals)\n"
    "- Where the analogy breaks down (limitations — this shows sophistication)\n\n"
    "### Analogy 2: [Different Scenario Name]\n"
    "(same structure, completely different domain)\n\n"
    "### Analogy 3: [A Surprising Analogy]\n"
    "- This one should be unexpected but surprisingly accurate\n\n"
    "Choose scenarios from: cooking recipes, sports plays, music orchestration, traffic systems, "
    "restaurant kitchens, construction architecture, gardening, flight, sailing, theater production, "
    "or any other rich everyday domain.\n\n"
    "Each analogy must create an \"aha\" moment where the reader suddenly understands {topic} intuitively.\n\n"
    "Minimum 600 words. Rich markdown formatting.\n\n"
    "Output valid JSON ONLY:\n"
    '{{"type":"analogy","title":"3. Analogy","content":"...ALL analogies in markdown..."}}'
)

EXAMPLES_PROMPT = (
    "You are a senior developer conducting a live coding workshop on {topic} in {subject}. "
    "Write 20+ diverse, complete, runnable examples that progressively build understanding.\n\n"
    "Structure:\n\n"
    "## Beginner Examples (5 examples)\n"
    "Each example:\n"
    "- Title describing what it demonstrates\n"
    "- Complete code with imports and setup\n"
    "- Line-by-line explanation of what each part does\n"
    "- Expected output shown in a code comment or block\n"
    "- Key learning point\n\n"
    "## Intermediate Examples (8 examples)\n"
    "Each example:\n"
    "- Realistic use case combining multiple concepts\n"
    "- Error handling and edge cases\n"
    "- Performance considerations\n"
    "- Expected output\n\n"
    "## Advanced Examples (5 examples)\n"
    "Each example:\n"
    "- Production-quality code following best practices\n"
    "- Integration with other technologies\n"
    "- Optimization techniques\n"
    "- Testing and debugging\n\n"
    "## Expert Patterns (2 examples)\n"
    "- Design patterns or advanced techniques\n"
    "- Industry-standard approaches\n\n"
    "All code must be syntactically correct, complete, and runnable. Use ```language code blocks.\n"
    "Include comments in the code explaining key parts.\n\n"
    "Minimum 2000 words of content plus code.\n\n"
    "Output valid JSON ONLY:\n"
    '{{"type":"examples","title":"4. Examples","content":"...ALL examples in markdown..."}}'
)

QUIZ_PROMPT = (
    "You are a professor designing a comprehensive final examination on {topic} in {subject}. "
    "This exam should thoroughly test understanding from basic recall to deep synthesis.\n\n"
    "Structure using markdown:\n\n"
    "## Section A: Multiple Choice Questions (25 questions)\n"
    "For each question:\n"
    "- Clear question statement\n"
    "- Four options labeled A, B, C, D\n"
    "- **Correct Answer:** [letter] — [full explanation of why this is correct]\n"
    "- **Why others are wrong:** brief explanation for each incorrect option\n\n"
    "Range: easy (Q1-5), medium (Q6-15), hard (Q16-20), trick (Q21-25)\n\n"
    "## Section B: Short Answer Questions (10 questions)\n"
    "Each:\n"
    "- Question requiring 2-3 sentence answer\n"
    "- **Model Answer:** with key points that must be mentioned\n"
    "- **Marking Scheme:** how points are awarded\n\n"
    "## Section C: Long Answer Questions (5 questions)\n"
    "Each:\n"
    "- Complex problem requiring synthesis of multiple concepts\n"
    "- **Expected approach:** the logical steps to solve it\n"
    "- **Complete model answer:** (3-5 paragraphs)\n"
    "- **Rubric:** detailed marking criteria\n\n"
    "All answers must include thorough explanations that teach as they assess.\n"
    "Use markdown formatting: bold for key terms, code for technical snippets, math for formulas.\n\n"
    "Minimum 3000 words.\n\n"
    "Output valid JSON ONLY. The entire quiz in the content field as markdown:\n"
    '{{"type":"quiz","title":"5. Quiz","content":"...ALL questions and answers in markdown..."}}'
)

ASSIGNMENT_PROMPT = (
    "You are a rigorous university course instructor designing a problem set on {topic} in {subject}. "
    "This should be as challenging and rewarding as a Stanford CS course problem set.\n\n"
    "Structure:\n\n"
    "## Theoretical Problems (5 problems)\n"
    "Each problem:\n"
    "- **Problem statement:** clear, precise, with any necessary context\n"
    "- **Difficulty:** (Easy/Medium/Hard/Challenge)\n"
    "- **Topics tested:** which concepts does this assess\n"
    "- **Expected solution approach:** the logical steps and key insights\n"
    "- **Complete solution:** full worked-out answer\n"
    "- **Common mistakes:** what students often get wrong\n\n"
    "## Practical Programming Tasks (5 tasks)\n"
    "Each task:\n"
    "- **Objective:** what the task teaches\n"
    "- **Problem statement:** detailed requirements and specifications\n"
    "- **Starter code** (if applicable) in ```language block\n"
    "- **Expected output** or test cases\n"
    "- **Hints** (progressive: mild → moderate → strong)\n"
    "- **Complete solution** with explanation\n"
    "- **Evaluation criteria:** how this would be graded\n\n"
    "## Challenge Problem (1 bonus)\n"
    "- An open-ended problem for advanced students\n"
    "- No single correct answer — rewards creativity\n"
    "- Evaluation rubric for subjective grading\n\n"
    "Minimum 1500 words. Rich markdown with code blocks, tables, and LaTeX math.\n\n"
    "Output valid JSON ONLY:\n"
    '{{"type":"assignment","title":"6. Assignment","content":"...ALL assignments in markdown..."}}'
)

PROJECTS_PROMPT = (
    "You are a senior engineering manager at a FAANG company designing project-based learning "
    "for {topic} in {subject}. Design four tiers of projects that build real engineering skills.\n\n"
    "Structure:\n\n"
    "## Mini Project (1-2 hours)\n"
    "- **Title:** [catchy name]\n"
    "- **Objective:** what specific skill this builds\n"
    "- **Prerequisites:** what students should know\n"
    "- **Tech Stack:** tools and libraries used\n"
    "- **Step-by-step guide:** numbered steps with code snippets\n"
    "- **Expected output:** screenshot description or sample output\n"
    "- **Extension ideas:** how to take it further\n\n"
    "## Major Project (2-3 days)\n"
    "(same structure, more complex)\n"
    "- Requires combining multiple concepts\n"
    "- Architecture design: include a mermaid diagram of the system design (official syntax only; no `|>` after labels)\n"
    "- Testing requirements: unit tests, integration tests\n"
    "- Documentation requirements\n\n"
    "## Industry Project (1 week)\n"
    "(same structure, but framed as a real business problem)\n"
    "- Based on a real problem from industry\n"
    "- Performance and scalability considerations\n"
    "- Deployment and operations\n"
    "- Team collaboration aspects\n\n"
    "## Resume Project (portfolio-worthy)\n"
    "- Production-quality application\n"
    "- Modern tech stack and best practices\n"
    "- CI/CD pipeline suggestions\n"
    "- Open source contribution opportunities\n"
    "- How to present this in interviews\n\n"
    "Each project: title, objective, tech stack, requirements, step-by-step guide, "
    "expected outcomes, evaluation criteria.\n\n"
    "Minimum 1500 words. Rich markdown with code, mermaid diagrams, and tables.\n\n"
    "Output valid JSON ONLY:\n"
    '{{"type":"projects","title":"7. Projects","content":"...ALL projects in markdown..."}}'
)

MISTAKES_PROMPT = (
    "You are a senior developer who has reviewed thousands of pull requests and interviewed hundreds of candidates. "
    "Document the 20 most common mistakes and misconceptions about {topic} in {subject}.\n\n"
    "Structure (use markdown):\n\n"
    "## Category 1: Fundamental Misconceptions (mistakes 1-7)\n"
    "For each mistake:\n"
    "### ❌ Mistake #[N]: [Name of the mistake]\n"
    "- **What students/developers think:** the flawed understanding\n"
    "- **Why it seems correct:** the plausible but wrong reasoning\n"
    "- **The reality:** what's actually happening (include a code example showing the issue)\n"
    "- **The fix:** correct code or approach\n"
    "- **Why it matters:** real consequences of this mistake\n"
    "- **Memory aid:** a simple way to remember the correct approach\n\n"
    "## Category 2: Coding Mistakes (mistakes 8-14)\n"
    "(same structure — focus on actual code errors, off-by-one, type errors, etc.)\n\n"
    "## Category 3: Design & Architecture Mistakes (mistakes 15-20)\n"
    "(same structure — focus on design patterns, scalability, maintainability errors)\n\n"
    "Each mistake must include a code example (even if pseudo-code) showing both the wrong and right way.\n"
    "Use alert-style callouts:\n"
    "> **⚠️ Common Pitfall:** [brief warning]\n\n"
    "Or for the fix:\n"
    "> **✅ Best Practice:** [brief advice]\n\n"
    "Minimum 1500 words. Rich markdown with code blocks, tables, and blockquotes.\n\n"
    "Output valid JSON ONLY:\n"
    '{{"type":"commonMistakes","title":"8. Common Mistakes","content":"...ALL mistakes in markdown..."}}'
)

INTERVIEW_PROMPT = (
    "You are a senior technical interviewer at Google with a decade of experience. "
    "Create comprehensive interview questions on {topic} in {subject} that test real understanding.\n\n"
    "Structure:\n\n"
    "## Category 1: Conceptual Questions (5 questions)\n"
    "Each:\n"
    "- **Difficulty:** (Easy/Medium/Hard)\n"
    "- **Question:** the exact wording an interviewer would use\n"
    "- **What the interviewer is looking for:** the key insight they want to hear\n"
    "- **Strong answer:** complete explanation that would impress\n"
    "- **Weak answer:** what mediocre candidates say\n"
    "- **Follow-up:** common follow-up questions\n\n"
    "## Category 2: Coding Questions (8 questions)\n"
    "Each:\n"
    "- **Difficulty:** (Easy/Medium/Hard)\n"
    "- **Problem statement:** exact LeetCode-style problem\n"
    "- **Example:** sample input and output\n"
    "- **Brute force approach:** and why it's insufficient\n"
    "- **Optimal approach:** the best solution with explanation\n"
    "- **Complexity analysis:** time and space in Big-O\n"
    "- **Code solution:** in ```language block\n"
    "- **Edge cases to consider:**\n"
    "- **Testing strategy:** how to test the solution\n\n"
    "## Category 3: System Design Questions (5 questions)\n"
    "Each:\n"
    "- **Problem:** design a system using {topic}\n"
    "- **Requirements:** functional and non-functional\n"
    "- **Architecture:** include a mermaid diagram (valid official syntax only)\n"
    "- **Trade-offs:** different approaches compared in a table\n"
    "- **Scale considerations:** how it behaves at millions of users\n\n"
    "## Category 4: Behavioral Questions (2 questions)\n"
    "Using the STAR method (Situation, Task, Action, Result)\n\n"
    "## Category 5: Advanced / Research Questions (2 questions)\n"
    "- Cutting-edge developments and open problems\n\n"
    "Minimum 2000 words. Rich markdown with code, mermaid diagrams, tables.\n\n"
    "Output valid JSON ONLY:\n"
    '{{"type":"interviewQuestions","title":"9. Interview Questions","content":"...ALL questions and answers in markdown..."}}'
)

CHEAT_SHEET_PROMPT = (
    "You are creating a one-page revision cheat sheet for {topic} in {subject}. "
    "This should be the ultimate quick-reference guide that a student would print and pin to their wall.\n\n"
    "Structure:\n\n"
    "## Core Definition\n"
    "- One-sentence definition\n"
    "- Formula (LaTeX): $$...$$\n\n"
    "## Key Concepts (10+ terms)\n"
    "| Term | Definition | Formula | Memory Aid |\n"
    "|---|---|---|---|\n"
    "| ... | ... | ... | ... |\n\n"
    "## Syntax / API Reference\n"
    "| Pattern / Function | Parameters | Returns | Example |\n"
    "|---|---|---|---|\n"
    "| ... | ... | ... | ... |\n\n"
    "## Important Formulas (5+)\n"
    "- $$formula$$ — what it represents\n"
    "- Variable legend: what each symbol means\n\n"
    "## Comparison Table\n"
    "| Approach A | Approach B | When to Use A | When to Use B |\n"
    "|---|---|---|---|\n"
    "| ... | ... | ... | ... |\n\n"
    "## Time / Space Complexity\n"
    "| Operation | Time | Space | Notes |\n"
    "|---|---|---|---|\n"
    "| ... | ... | ... | ... |\n\n"
    "## Quick Tips & Tricks (10+)\n"
    "- ⚡ **Tip:** ...\n\n"
    "## Common Mnemonics (5+)\n"
    "- 🧠 **Mnemonic:** ...\n\n"
    "## Golden Rules (The 5 Commandments)\n"
    "1. ...\n2. ...\n3. ...\n4. ...\n5. ...\n\n"
    "Use tables extensively. Every row should have content. "
    "Include LaTeX math for any formulas. Use mnemonics for memory.\n\n"
    "Minimum 800 words in tables alone. Prioritize density of information.\n\n"
    "Output valid JSON ONLY:\n"
    '{{"type":"cheatSheet","title":"10. Cheat Sheet","content":"...ALL reference material in markdown..."}}'
)

SECTION_PROMPTS: Dict[str, str] = {
    "explanation": EXPLANATION_PROMPT,
    "caseStudy": CASE_STUDY_PROMPT,
    "analogy": ANALOGY_PROMPT,
    "examples": EXAMPLES_PROMPT,
    "quiz": QUIZ_PROMPT,
    "assignment": ASSIGNMENT_PROMPT,
    "projects": PROJECTS_PROMPT,
    "commonMistakes": MISTAKES_PROMPT,
    "interviewQuestions": INTERVIEW_PROMPT,
    "cheatSheet": CHEAT_SHEET_PROMPT,
}

SYSTEM_MESSAGE_TEMPLATE = (
    "You are a Distinguished Professor of Engineering with decades of teaching experience at MIT, Stanford, and IIT. "
    "You create exceptionally clear, thorough, and engaging educational content that rivals the best university courses.\n\n"
    "Your writing style:\n"
    "- Natural and conversational, like a brilliant professor teaching a live class\n"
    "- Uses phrases like \"Here's the key insight...\", \"Think of it this way...\", \"What most textbooks miss...\"\n"
    "- Rich examples, analogies, and real-world connections\n"
    "- Rigorous but accessible — never dumbing down, always building up\n\n"
    "Formatting rules:\n"
    "- Output valid JSON ONLY. No markdown fences around the JSON. No extra text before or after.\n"
    "- Escape double quotes as \\\" and backslashes as \\\\.\n"
    "- Use LaTeX for math: $$ for display equations, $ for inline.\n"
    "- Use rich markdown WITHIN the content string:\n"
    "  - ```language for code blocks\n"
    "  - ```mermaid for diagrams (use official Mermaid syntax only, never invent)\n"
    "  - | table syntax for tables\n"
    "  - **bold**, *italic*, `inline code`\n"
    "  - > blockquotes\n"
    "  - - and 1. for lists\n"
    "  - ## and ### for sub-headings within sections\n"
    "- Mermaid rules: `|label|` must be followed by the target node ID, never by `>`.\n"
    "  CORRECT: `A -->|Addition| B`   WRONG: `A -->|Addition|> B`\n"
    "  stateDiagram-v2: NEVER use `note \"text\"` — use `note right of <state> ... end note`.\n"
    "  Validate all generated diagrams against Mermaid documentation before returning them.\n"
    "- Write at a rigorous university level. Be thorough. Don't summarize.\n"
    "- Each section must have substantial, detailed content — these are your students who paid tuition."
)

_SECTION_FALLBACKS: Dict[str, str] = {
    "explanation": (
        "## Introduction\n\n"
        "{topic} is a fundamental concept in {subject} that every computer science student must understand thoroughly. "
        "It forms the backbone of many advanced topics and appears regularly in both academic and professional settings.\n\n"
        "## Definition\n\n"
        "**{topic}** refers to the systematic approach used in {subject} to solve a specific class of problems. "
        "The formal definition encompasses several key properties and characteristics.\n\n"
        "## Key Concepts\n\n"
        "1. **Core Principle**: At its heart, {topic} is built on the idea of breaking down complex problems into manageable components.\n"
        "2. **Working Mechanism**: The process involves multiple stages, each building on the previous one.\n"
        "3. **Applications**: From simple scripts to large-scale systems, {topic} appears everywhere.\n\n"
        "## Why This Matters\n\n"
        "Understanding {topic} is crucial because it:\n"
        "- Appears in technical interviews at every major tech company\n"
        "- Is a prerequisite for advanced {subject} topics\n"
        "- Helps write more efficient and maintainable code\n"
        "- Builds problem-solving skills that transfer to any domain\n\n"
        "> **Professor's Note:** Spend extra time on the fundamentals here — everything else builds on this foundation."
    ),
    "caseStudy": (
        "## Case Study 1: Industry Application\n\n"
        "**Company:** A major technology firm\n\n"
        "**Problem:** The team needed to implement {topic} to solve a critical performance bottleneck.\n\n"
        "**Solution:** After careful analysis, the engineering team designed a solution using {topic} that "
        "reduced latency by 60% and improved resource utilization.\n\n"
        "| Metric | Before | After | Improvement |\n"
        "|---|---|---|---|\n"
        "| Response Time | 200ms | 80ms | 60% |\n"
        "| Throughput | 1000 req/s | 2500 req/s | 150% |\n"
        "| Resource Usage | 80% | 45% | 44% |\n\n"
        "**Key Lessons:** Start simple, measure everything, and iterate based on data."
    ),
    "analogy": (
        "### Analogy 1: The [Everyday Scenario]\n\n"
        "Think of {topic} like [everyday scenario]. Just as [everyday analogy description], {topic} works by [technical parallel].\n\n"
        "| Everyday Concept | {topic} Concept |\n"
        "|---|---|\n"
        "| [analogy part 1] | [technical part 1] |\n"
        "| [analogy part 2] | [technical part 2] |\n"
        "| [analogy part 3] | [technical part 3] |\n\n"
        "**Why this works:** The core insight is that both [everyday thing] and {topic} share the same underlying pattern of [shared principle].\n\n"
        "**Limitation:** This analogy breaks down when [edge case], since [reason]."
    ),
    "examples": (
        "## Beginner Examples\n\n"
        "### Example 1: Getting Started with {topic}\n\n"
        "Let's start with the simplest possible example.\n\n"
        "**Code:**\n"
        "```python\n# Simple {topic} example\n# Your code here\nprint('Hello from {topic}')\n```\n\n"
        "**Explanation:** This demonstrates the basic syntax and structure.\n\n"
        "**Output:**\n"
        "```\nHello from {topic}\n```\n\n"
        "---\n\n"
        "## Intermediate Examples\n\n"
        "### Example 6: Real-World Use Case\n\n"
        "Now let's see {topic} in a more realistic scenario.\n\n"
        "---\n\n"
        "## Advanced Examples\n\n"
        "### Example 11: Production Pattern\n\n"
        "This example demonstrates industry best practices."
    ),
    "quiz": (
        "## Section A: Multiple Choice Questions\n\n"
        "### Question 1\n\n"
        "What is the primary purpose of {topic} in {subject}?\n\n"
        "A) ...\nB) ...\nC) ...\nD) ...\n\n"
        "**Correct Answer: B**\n\n"
        "**Explanation:** ...\n\n"
        "**Why others are wrong:**\n"
        "- A: ...\n- C: ...\n- D: ...\n\n"
        "---\n\n"
        "## Section B: Short Answer Questions\n\n"
        "### Question 26\n\n"
        "Explain how {topic} works at a high level.\n\n"
        "**Model Answer:** ...\n\n"
        "**Marking Scheme:** ..."
    ),
    "assignment": (
        "## Theoretical Problems\n\n"
        "### Problem 1: Understanding the Fundamentals\n\n"
        "**Difficulty:** Easy\n\n"
        "**Problem:** ...\n\n"
        "**Solution:** ...\n\n"
        "---\n\n"
        "## Practical Programming Tasks\n\n"
        "### Task 1: Implementation Exercise\n\n"
        "**Objective:** Implement a basic version of {topic}.\n\n"
        "**Requirements:** ..."
    ),
    "projects": (
        "## Mini Project: [Title]\n\n"
        "**Objective:** ...\n\n"
        "**Tech Stack:** ...\n\n"
        "**Step-by-Step Guide:**\n\n"
        "1. ...\n2. ...\n3. ...\n\n"
        "**Expected Output:** ...\n\n"
        "---\n\n"
        "## Major Project: [Title]\n\n"
        "---\n\n"
        "## Industry Project: [Title]\n\n"
        "---\n\n"
        "## Resume Project: [Title]"
    ),
    "commonMistakes": (
        "## Category 1: Fundamental Misconceptions\n\n"
        "### ❌ Mistake 1: [Name]\n\n"
        "**What students think:** ...\n\n"
        "**The reality:** ...\n\n"
        "**The fix:** ...\n\n"
        "> **⚠️ Common Pitfall:** ...\n\n"
        "---\n\n"
        "## Category 2: Coding Mistakes\n\n"
        "---\n\n"
        "## Category 3: Design & Architecture Mistakes"
    ),
    "interviewQuestions": (
        "## Category 1: Conceptual Questions\n\n"
        "### Question 1 (Easy)\n\n"
        "**Question:** ...\n\n"
        "**What the interviewer wants:** ...\n\n"
        "**Strong answer:** ...\n\n"
        "---\n\n"
        "## Category 2: Coding Questions\n\n"
        "---\n\n"
        "## Category 3: System Design Questions\n\n"
        "---\n\n"
        "## Category 4: Behavioral Questions\n\n"
        "---\n\n"
        "## Category 5: Advanced Questions"
    ),
    "cheatSheet": (
        "## Core Definition\n\n"
        "**{topic}:** A concise one-line definition.\n\n"
        "## Key Concepts\n\n"
        "| Term | Definition |\n"
        "|---|---|\n"
        "| Concept 1 | Definition 1 |\n"
        "| Concept 2 | Definition 2 |\n\n"
        "## Quick Reference Table\n\n"
        "| Operation | Syntax | Example |\n"
        "|---|---|---|\n"
        "| Op 1 | ... | ... |\n"
        "| Op 2 | ... | ... |\n\n"
        "## Golden Rules\n\n"
        "1. Always ...\n2. Never ...\n3. Remember ...\n4. Prefer ...\n5. Test ..."
    ),
}


def _make_cache_key(subject: str, topic: str, difficulty: str, mode: str, section_type: str) -> str:
    return f"{subject.lower()}|{topic.lower()}|{difficulty.lower()}|{mode.lower()}|{section_type}"


async def _generate_section(
    provider: AIProvider,
    section_type: str,
    subject: str,
    topic: str,
    difficulty: str,
    learning_mode: str,
) -> Tuple[str, Optional[Dict[str, Any]], Optional[str]]:
    """Generate a single section. Returns (section_type, section_data, error)."""
    desc = SECTION_DESCRIPTIONS.get(section_type, {})
    prompt_template = SECTION_PROMPTS.get(section_type, "Explain {topic} in {subject}.")
    prompt = prompt_template.format(topic=topic, subject=subject)

    messages = [
        Message(role="system", content=SYSTEM_MESSAGE_TEMPLATE),
        Message(role="user", content=prompt),
    ]

    request = CompletionRequest(
        messages=messages,
        model="llama-3.1-8b-instant",
        temperature=0.7,
        max_tokens=desc.get("max_tokens", 4096),
        stream=True,
    )

    accumulated = ""
    try:
        async with _semaphore:
            async for event in provider.complete_stream(request):
                if event.error:
                    return section_type, None, event.error
                if event.content:
                    accumulated += event.content
    except Exception as e:
        logger.warning("Section %s generation error: %s", section_type, e)
        return section_type, None, str(e)

    if not accumulated.strip():
        return section_type, None, "Empty response"

    def _extract_content_from_raw(raw_text: str) -> str:
        """Extract content value from JSON-like raw text (handles truncation)."""
        raw = raw_text.strip()
        # Remove ```json fences anywhere
        raw = re.sub(r'```(?:json)?', '', raw)
        fallback = raw[:8000]
        # Find "content" key and extract its value — handles truncated JSON
        key_start = raw.find('"content"')
        if key_start < 0:
            # No JSON structure at all — raw text IS the content
            return raw[:8000]
        colon = raw.find(':', key_start)
        if colon < 0:
            return fallback
        # Find the opening quote of the value
        val_start = colon + 1
        while val_start < len(raw) and raw[val_start] in ' \t\n\r':
            val_start += 1
        if val_start >= len(raw):
            return fallback
        if raw[val_start] in ('"', "`"):
            quote = raw[val_start]
            val_start += 1  # skip opening quote
            # Try to find closing quote
            val_end = val_start
            escaped = False
            while val_end < len(raw):
                if escaped:
                    escaped = False
                    val_end += 1
                elif raw[val_end] == '\\':
                    escaped = True
                    val_end += 1
                elif raw[val_end] == quote:
                    after_quote = val_end + 1
                    while after_quote < len(raw) and raw[after_quote] in ' \t\n\r':
                        after_quote += 1
                    if after_quote < len(raw) and raw[after_quote] in ',}]':
                        break
                    val_end += 1
                else:
                    val_end += 1
            if val_end > val_start:
                content = raw[val_start:val_end]
            else:
                content = raw[val_start:]
        else:
            # No opening quote — the rest of the text IS the content
            content = raw[val_start:]
        return content[:10000]

    extracted, fmt = response_parser.extract_json(accumulated)
    data = None
    if extracted:
        repaired = response_parser.repair_json(extracted)
        try:
            data = json.loads(repaired)
        except json.JSONDecodeError as e:
            logger.warning("JSON parse failed for %s: %s at pos %d", section_type, e, e.pos)

    if isinstance(data, dict):
        if "title" not in data:
            data["title"] = desc.get("title", section_type)
        if "content" not in data or not data.get("content"):
            if "props" in data and isinstance(data["props"], dict):
                data["content"] = data["props"].get("content", "")
                if "title" not in data or not data.get("title"):
                    data["title"] = data["props"].get("title", desc.get("title", section_type))
            else:
                data["content"] = ""
        # Handle double-wrapped JSON content (model nests full JSON inside content field)
        if data.get("content"):
            content_val = data["content"]
            if isinstance(content_val, str) and content_val.strip().startswith("{"):
                try:
                    nested = json.loads(content_val)
                    if isinstance(nested, dict) and "content" in nested:
                        inner = nested["content"]
                        if isinstance(inner, str) and len(inner) > len(content_val) * 0.3:
                            data["content"] = inner
                            if "title" in nested:
                                data["title"] = nested["title"]
                except json.JSONDecodeError:
                    # Nested JSON has raw newlines — extract via raw extraction
                    logger.info("Section %s: nested JSON in content (%d chars), extracting raw", section_type, len(content_val))
                    raw_extracted = _extract_content_from_raw(content_val)
                    if raw_extracted and not raw_extracted.strip().startswith("{"):
                        data["content"] = raw_extracted
                except (TypeError, ValueError):
                    pass
        # Final safety: if content still looks JSON-wrapped, force raw extraction
        c = data.get("content", "")
        if len(c) >= 8000 and c.strip().startswith("{") and '"content"' in c[:200]:
            logger.info("Section %s: content still JSON-wrapped (%d chars), forcing raw extraction", section_type, len(c))
            raw_extracted = _extract_content_from_raw(c)
            if raw_extracted and not raw_extracted.strip().startswith("{"):
                logger.info("Section %s: raw extraction succeeded (%d chars)", section_type, len(raw_extracted))
                data["content"] = raw_extracted
            else:
                logger.warning("Section %s: raw extraction failed, raw starts with: %s", section_type, repr(raw_extracted[:100]) if raw_extracted else "None")
    else:
        # JSON parse failed — extract from raw text
        content = _extract_content_from_raw(accumulated)
        data = {
            "type": section_type,
            "title": desc.get("title", section_type),
            "content": content,
        }

    content = data.get("content", "")
    # Last-resort: if content looks JSON-wrapped, try simple substring extraction
    if isinstance(content, str) and len(content) >= 8000 and content.strip().startswith("{"):
        key_marker = '"content"'
        ki = content.find(key_marker)
        if ki >= 0:
            ci = content.find(':', ki)
            if ci >= 0:
                after_val = content[ci+1:].lstrip()
                if after_val.startswith('"') or after_val.startswith("'"):
                    # Extract from opening quote to end (or to closing quote if found)
                    q = after_val[0]
                    start = ci + 1 + (len(content[ci+1:]) - len(after_val)) + 1
                    extracted = content[start:]
                    end = start
                    esc = False
                    while end < len(content):
                        if esc:
                            esc = False
                            end += 1
                        elif content[end] == '\\':
                            esc = True
                            end += 1
                        elif content[end] == q:
                            a = end + 1
                            while a < len(content) and content[a] in ' \t\n\r':
                                a += 1
                            if a >= len(content) or content[a] in ',}]':
                                content = extracted[:end - start]
                                break
                            end += 1
                        else:
                            end += 1
                    else:
                        content = extracted
                    data["content"] = content
        if len(content) < 50:
            return section_type, None, f"Content too short ({len(content)} chars)"
    return section_type, data, None


def _generate_fallback(section_type: str, subject: str, topic: str) -> Dict[str, Any]:
    """Generate a detailed fallback when all retries fail."""
    desc = SECTION_DESCRIPTIONS.get(section_type, {})
    template = _SECTION_FALLBACKS.get(section_type, "## {topic}\n\nDetailed content about {topic} in {subject}.")
    content = template.format(topic=topic, subject=subject)
    return {
        "type": section_type,
        "title": desc.get("title", section_type),
        "content": content,
    }


async def generate_lesson(
    provider: AIProvider,
    subject: str,
    topic: str,
    difficulty: str,
    learning_mode: str,
    engine_id: str = "",
) -> AsyncGenerator[Dict[str, Any], None]:
    """Generate all 11 lesson sections in parallel. Yields each as it completes."""
    start_time = time.time()
    logger.info("Orchestrator: generating 11 sections for %s / %s", subject, topic)

    all_sections = list(SECTION_DESCRIPTIONS.keys())
    available_keys = key_manager.available_keys
    if not available_keys:
        logger.error("No available API keys!")
        yield {"type": "error", "content": "No available API keys. Please try again later."}
        return

    from app.core.config import settings
    if settings.orchestrator_mode == "adaptive":
        from app.ai.adaptive_multi_model_orchestrator import adaptive_orchestrator
        logger.info("Using ADAPTIVE orchestrator mode.")
        context = {"subject": subject, "topic": topic, "learning_mode": learning_mode}
        
        # Adaptive doesn't yield streams out of the box in our implementation yet, 
        # but we can yield a single done event or wrap it. For integration, we'll wait for it.
        # (A full implementation would make Adaptive yield section by section, but we will mock that here)
        result_data = await adaptive_orchestrator.generate_lesson(topic, context)
        for st, data in result_data.items():
            yield {
                "type": "section_done",
                "section_type": st,
                "section_data": data,
                "status": "completed",
                "engine_id": engine_id,
                "elapsed": round(time.time() - start_time, 2)
            }
        return
    else:
        # Legacy mode - trigger shadow mode execution
        import random
        from app.ai.adaptive_multi_model_orchestrator import adaptive_orchestrator
        shadow_task = None
        if random.randint(1, 100) <= settings.shadow_percentage:
            logger.info(f"Using LEGACY mode. Triggering ADAPTIVE in shadow mode ({settings.shadow_percentage}%).")
            context = {"subject": subject, "topic": topic, "learning_mode": learning_mode}
            # Run shadow mode silently without blocking
            shadow_task = asyncio.create_task(adaptive_orchestrator.generate_lesson(topic, context))
            
            # Note: We import telemetry_stats directly here to avoid circular imports if any
            try:
                from app.ai.telemetry_dashboard import telemetry_stats
                telemetry_stats["shadow_requests"] = telemetry_stats.get("shadow_requests", 0) + 1
            except ImportError:
                pass

    async def run_with_retry(section_type: str, idx: int) -> Tuple[str, Optional[Dict[str, Any]], Optional[str]]:
        await asyncio.sleep(idx * 0.3)
        for attempt in range(MAX_RETRIES + 1):
            if attempt > 0:
                logger.info("Retry %d/%d for section %s", attempt, MAX_RETRIES, section_type)
                await asyncio.sleep(2 * attempt)

            st, data, err = await _generate_section(
                provider, section_type, subject, topic, difficulty, learning_mode,
            )
            if err is None:
                content = data.get("content", "") if data else ""
                if len(content) >= 50:
                    return st, data, None
                err = f"Content too short ({len(content)} chars)"
            logger.warning("Section %s attempt %d failed: %s", section_type, attempt + 1, err)
        logger.warning("Section %s failed after %d retries, using fallback", section_type, MAX_RETRIES + 1)
        fallback = _generate_fallback(section_type, subject, topic)
        return section_type, fallback, None

    tasks = [run_with_retry(st, i) for i, st in enumerate(all_sections)]
    results = {}

    for coro in asyncio.as_completed(tasks):
        section_type, data, error = await coro
        elapsed = round(time.time() - start_time, 2)
        if error:
            logger.error("Section %s failed permanently: %s", section_type, error)
            fallback = _generate_fallback(section_type, subject, topic)
            results[section_type] = fallback
        else:
            results[section_type] = data

        yield {
            "type": "section_done",
            "section_type": section_type,
            "section_data": results[section_type],
            "status": "error" if error else "completed",
            "engine_id": engine_id,
            "elapsed": elapsed,
        }

    logger.info("Orchestrator: all 11 sections complete in %.1fs", time.time() - start_time)
    lesson = {
        "metadata": {
            "title": f"{subject}: {topic}",
            "subject": subject,
            "topic": topic,
            "difficulty": difficulty,
            "learningMode": learning_mode,
            "estimatedReadingTime": max(15, len(results) * 8),
            "prerequisites_list": [],
            "learningObjectives": [],
            "tags": [subject.lower().replace(" ", "-")],
        },
        "sections": results,
        "resources": {"keyTerms": [], "furtherReading": []},
    }

    total_elapsed = round(time.time() - start_time, 2)
    yield {"type": "done", "finish_reason": "stop", "elapsed": total_elapsed}
    yield {
        "type": "lesson",
        "data": lesson,
        "repaired": False,
        "cached": False,
        "elapsed": total_elapsed,
    }

    if shadow_task:
        async def run_comparison(legacy_res, s_task):
            try:
                adaptive_res = await s_task
                from app.ai.comparator import lesson_comparator
                score = lesson_comparator.compare(legacy_res, adaptive_res)
                
                try:
                    from app.ai.telemetry_dashboard import telemetry_stats
                    prev_score = telemetry_stats.get("average_similarity", 1.0)
                    reqs = telemetry_stats.get("shadow_requests", 1)
                    if reqs <= 1:
                        telemetry_stats["average_similarity"] = score
                    else:
                        telemetry_stats["average_similarity"] = prev_score + ((score - prev_score) / reqs)
                except ImportError:
                    pass
            except Exception as e:
                logger.error(f"Shadow comparison failed: {e}")
                
        asyncio.create_task(run_comparison(results, shadow_task))

    logger.info("Orchestrator done: %d sections in %.1fs", len(results), total_elapsed)
