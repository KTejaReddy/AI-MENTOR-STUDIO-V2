import json
import re

def _parse_response(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    
    if "**Correct Answer:" in cleaned and not cleaned.startswith("{"):
        return cleaned
        
    def _build_md(data: dict) -> str:
        md = ""
        mcqs = data.get("mcq", [])
        if not mcqs and "questions" in data:
            mcqs = data.get("questions", [])
            
        for i, q in enumerate(mcqs, 1):
            md += f"{i}. {q.get('question', '')}\n"
            opts = q.get("options", {})
            if isinstance(opts, dict):
                for k, v in opts.items():
                    md += f"{k}) {v}\n"
            elif isinstance(opts, list):
                for j, v in enumerate(opts):
                    md += f"{chr(65 + j)}) {v}\n"
            ans = q.get('correct_answer', q.get('correctAnswer', ''))
            md += f"**Correct Answer: {ans}**\n"
            md += f"**Explanation:** {q.get('explanation', '')}\n\n"
        return md.strip()

    try:
        data = json.loads(cleaned)
        if isinstance(data, dict) and "content" in data:
            if isinstance(data["content"], str):
                try:
                    data = json.loads(data["content"])
                except:
                    pass
            elif isinstance(data["content"], dict):
                data = data["content"]
        
        md_output = _build_md(data)
        if md_output:
            return md_output
    except Exception as e:
        pass

    match = re.search(r'```json\s*(\{.*?\})\s*```', raw, re.DOTALL)
    if not match:
        match = re.search(r'(\{.*"mcq".*?\})', raw, re.DOTALL)
        
    if match:
        try:
            data = json.loads(match.group(1))
            if isinstance(data, dict) and "content" in data:
                if isinstance(data["content"], str):
                    try:
                        data = json.loads(data["content"])
                    except:
                        pass
                elif isinstance(data["content"], dict):
                    data = data["content"]
            md_output = _build_md(data)
            if md_output:
                return md_output
        except Exception:
            pass

    return raw

# Test 1: JSON quiz
json_raw = """
{
  "content": {
    "mcq": [
      {
        "question": "What is Python?",
        "options": {"A": "A snake", "B": "A programming language"},
        "correct_answer": "B",
        "explanation": "Because it is."
      }
    ]
  }
}
"""

# Test 2: Markdown quiz
md_raw = """
## Quiz
1. What is Python?
A) A snake
B) A language
**Correct Answer: B**
**Explanation:** Yes.
"""

# Test 3: Mixed output
mixed_raw = """
Here is the quiz you requested:
```json
{
  "mcq": [
    {
      "question": "Mixed test?",
      "options": ["Yes", "No"],
      "correct_answer": "A",
      "explanation": "Yes it is."
    }
  ]
}
```
Enjoy!
"""

print("--- JSON ---")
print(_parse_response(json_raw))
print("\n--- MARKDOWN ---")
print(_parse_response(md_raw))
print("\n--- MIXED ---")
print(_parse_response(mixed_raw))
