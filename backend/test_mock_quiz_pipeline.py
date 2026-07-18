import json
import re

def sanitize_json(raw: str) -> str:
    content = re.sub(r'<think>.*?</think>', '', raw, flags=re.DOTALL)
    match = re.search(r'\{.*\}', content, flags=re.DOTALL)
    if match:
        content = match.group(0)
    return content

def validate_json_quiz(json_obj) -> tuple:
    issues = []
    questions = json_obj.get("questions", [])
    if not isinstance(questions, list):
        issues.append("JSON root must contain a 'questions' array.")
        return issues, json_obj
        
    valid_questions = []
    for q in questions:
        q_issues = []
        if not q.get("question"):
            q_issues.append("Missing question text")
        opts = q.get("options", {})
        for opt in ['A', 'B', 'C', 'D']:
            if not opts.get(opt):
                q_issues.append(f"Missing Option {opt}")
        if not q.get("correctAnswer"):
            q_issues.append("Missing correctAnswer")
        if not q.get("explanation"):
            q_issues.append("Missing explanation")
            
        if not q_issues:
            valid_questions.append(q)
            
    if len(valid_questions) > 10:
        print("QUIZ_TRIMMED_TO_10")
        valid_questions = valid_questions[:10]
        
    json_obj["questions"] = valid_questions
    
    if len(valid_questions) < 10:
        issues.append(f"Found {len(valid_questions)} questions instead of exactly 10.")
        
    return issues, json_obj

raw = """<think>I need to generate a JSON quiz.</think>
Here is your quiz!
```json
{
  "questions": [
    {"question": "Q1", "options": {"A": "1", "B": "2", "C": "3", "D": "4"}, "correctAnswer": "A", "explanation": "E"},
    {"question": "Q2", "options": {"A": "1", "B": "2", "C": "3", "D": "4"}, "correctAnswer": "A", "explanation": "E"},
    {"question": "Q3", "options": {"A": "1", "B": "2", "C": "3", "D": "4"}, "correctAnswer": "A", "explanation": "E"},
    {"question": "Q4", "options": {"A": "1", "B": "2", "C": "3", "D": "4"}, "correctAnswer": "A", "explanation": "E"},
    {"question": "Q5", "options": {"A": "1", "B": "2", "C": "3", "D": "4"}, "correctAnswer": "A", "explanation": "E"},
    {"question": "Q6", "options": {"A": "1", "B": "2", "C": "3", "D": "4"}, "correctAnswer": "A", "explanation": "E"},
    {"question": "Q7", "options": {"A": "1", "B": "2", "C": "3", "D": "4"}, "correctAnswer": "A", "explanation": "E"},
    {"question": "Q8", "options": {"A": "1", "B": "2", "C": "3", "D": "4"}, "correctAnswer": "A", "explanation": "E"},
    {"question": "Q9", "options": {"A": "1", "B": "2", "C": "3", "D": "4"}, "correctAnswer": "A", "explanation": "E"},
    {"question": "Q10", "options": {"A": "1", "B": "2", "C": "3", "D": "4"}, "correctAnswer": "A", "explanation": "E"},
    {"question": "Q11", "options": {"A": "1", "B": "2", "C": "3", "D": "4"}, "correctAnswer": "A", "explanation": "E"}
  ]
}
```
Enjoy!"""

sanitized = sanitize_json(raw)
print("SANITIZED:")
print(sanitized)

parsed = json.loads(sanitized)
issues, valid = validate_json_quiz(parsed)
print(f"ISSUES: {issues}")
print(f"FINAL COUNT: {len(valid['questions'])}")
