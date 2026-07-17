import asyncio
import httpx
import json

async def test_lesson(subject, topic):
    print(f"Generating lesson: {subject} -> {topic}")
    async with httpx.AsyncClient(timeout=300) as client:
        req = {
            "subject": subject,
            "topic": topic,
            "difficulty": "intermediate",
            "learning_mode": "default"
        }
        async with client.stream("POST", "http://localhost:8000/api/v1/ai/generate", json=req) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    try:
                        data = json.loads(line[6:])
                        if data.get("type") in ("section_queued", "section_running", "section_done", "section_retry", "section_fallback"):
                            print(f"[{subject} -> {topic}] {data['type']}: {data.get('section_type')}")
                        if data.get("type") == "done":
                            print(f"[{subject} -> {topic}] FINISHED!")
                    except Exception:
                        pass

async def main():
    await asyncio.gather(
        test_lesson("Computer Science", "Sorting Algorithms"),
        test_lesson("Mathematics", "Calculus Integration")
    )
    print("Done generating. Check qa_report.json")

if __name__ == "__main__":
    asyncio.run(main())
