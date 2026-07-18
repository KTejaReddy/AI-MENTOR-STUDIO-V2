import asyncio
import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.ai.base import CompletionRequest, Message
from app.ai.providers import get_provider
from app.ai.full_lesson_orchestrator import _generate_quiz_json, validate_json_quiz

async def run_regression_test():
    # Attempt to load provider, expecting GROQ_API_KEY in environment
    try:
        provider = get_provider()
    except Exception as e:
        print(f"Error initializing provider: {e}")
        print("Make sure GROQ_API_KEY is set in your environment.")
        return

    subjects = [
        ("Programming", "Binary Search Trees"),
        ("Mathematics", "Calculus - Integration by Parts"),
        ("Operating Systems", "Virtual Memory"),
        ("DBMS", "ACID Properties"),
        ("Digital Electronics", "Logic Gates"),
        ("Surveying", "Theodolite Traverse"),
        ("Computer Networks", "TCP/IP Model"),
        ("Python", "Decorators"),
        ("Java", "Polymorphism"),
        ("Data Structures", "Hash Tables")
    ]
    
    print("===========================================================")
    print("Starting Quiz Pipeline Regression Test (10 Subjects)")
    print("===========================================================")
    
    results = []
    
    for subject, topic in subjects:
        print(f"\nTesting: {subject} - {topic}")
        # Note: we bypass the key_manager in the script or assume the key is passed directly
        try:
            # Generate initial JSON
            json_obj = await _generate_quiz_json(provider, subject, topic, "intermediate", 10, [])
            issues, valid_json = validate_json_quiz(json_obj)
            
            # Simulated Orchestrator Logic
            attempts = 1
            while issues and attempts < 2:
                needed = 10 - len(valid_json.get("questions", []))
                if needed > 0:
                    new_json_obj = await _generate_quiz_json(
                        provider, subject, topic, "intermediate", needed, valid_json.get("questions", [])
                    )
                    if new_json_obj and isinstance(new_json_obj.get("questions"), list):
                        valid_json.setdefault("questions", []).extend(new_json_obj["questions"])
                issues, valid_json = validate_json_quiz(valid_json)
                attempts += 1
            
            num_questions = len(valid_json.get("questions", []))
            passed = num_questions == 10 and not issues
            
            result = {
                "subject": subject,
                "passed": passed,
                "questions": num_questions,
                "issues": issues,
                "attempts": attempts
            }
            results.append(result)
            
            print(f"  Result: {'PASS' if passed else 'FAIL'}")
            print(f"  Questions: {num_questions}")
            print(f"  Attempts: {attempts}")
            if issues:
                print(f"  Issues: {issues}")
                
        except Exception as e:
            print(f"  Exception occurred: {e}")
            results.append({"subject": subject, "passed": False, "error": str(e)})

    print("\n===========================================================")
    print("Regression Test Summary")
    print("===========================================================")
    total = len(subjects)
    passed_count = sum(1 for r in results if r.get("passed"))
    print(f"Total Subjects: {total}")
    print(f"Passed: {passed_count}")
    print(f"Failed: {total - passed_count}")
    
    if passed_count == total:
        print("\nAll 10 quiz generations passed! You can now commit.")
    else:
        print("\nSome tests failed. Do not commit yet.")

if __name__ == "__main__":
    # To run this, you need GROQ_API_KEY set:
    # Windows PowerShell: $env:GROQ_API_KEY="your_key" ; python test_live_quiz_pipeline.py
    asyncio.run(run_regression_test())
