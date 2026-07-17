"""
QA Test Suite - AI Mentor Studio v2
Tests all 5 required lessons + stress tests + API key rotation.
"""
import asyncio
import time
import json
import sys
import io
import httpx
from datetime import datetime

# Force UTF-8 output to avoid Windows cp1252 issues
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://localhost:8000/api/v1"

LESSONS = [
    {"branch": "Computer Science Engineering", "subject": "Python Programming",    "topic": "Functions"},
    {"branch": "Computer Science Engineering", "subject": "Data Structures",       "topic": "Binary Search Tree"},
    {"branch": "Computer Science Engineering", "subject": "Operating Systems",     "topic": "Deadlock"},
    {"branch": "ECE",                          "subject": "Digital Electronics",   "topic": "Flip Flops"},
    {"branch": "Mechanical Engineering",       "subject": "Thermodynamics",        "topic": "Carnot Cycle"},
]

REQUIRED_SECTIONS = [
    "explanation", "caseStudy", "analogy", "examples",
    "quiz", "assignment", "projects", "commonMistakes",
    "interviewQuestions", "cheatSheet"
]

log_lines = []

def log(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    line = f"[{ts}] {msg}"
    print(line, flush=True)
    log_lines.append(line)

def save_report(results):
    report_path = r"T:\ai mentor studio v2\qa_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    log(f"Report saved: {report_path}")


async def check_health():
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(f"{BASE_URL}/health")
        return r.json()


async def get_key_health():
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(f"{BASE_URL}/ai/key-health")
            if r.status_code == 200:
                return r.json()
        except:
            pass
        # fallback - try branches endpoint
        try:
            r = await client.get(f"{BASE_URL}/curriculum/branches")
            return {"branches_check": r.status_code, "data": r.json()[:3] if r.status_code == 200 else None}
        except Exception as e:
            return {"error": str(e)}


async def generate_lesson_sse(subject: str, topic: str, difficulty: str = "intermediate") -> dict:
    """Call the SSE generate endpoint and collect all events."""
    url = f"{BASE_URL}/ai/generate"
    payload = {
        "subject": subject,
        "topic": topic,
        "difficulty": difficulty,
        "learning_mode": "default",
        "output_language": "english"
    }

    sections_received = {}
    section_timings = {}
    model_routing = []
    errors = []
    start_time = time.time()
    ttfb = None
    last_event_type = None

    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0)) as client:
        try:
            async with client.stream("POST", url, json=payload, headers={"Accept": "text/event-stream"}) as resp:
                if resp.status_code != 200:
                    return {"error": f"HTTP {resp.status_code}", "sections": {}}

                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    if line.startswith("data: "):
                        if ttfb is None:
                            ttfb = round(time.time() - start_time, 3)

                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            event = json.loads(data_str)
                            etype = event.get("type", "")
                            last_event_type = etype

                            if etype == "plan":
                                log(f"  [PLAN] sections planned: {str(event.get('sections', [])).replace(chr(8594), '->')}")

                            elif etype == "section_status":
                                st = event.get("section_type", "")
                                status = event.get("status", "")
                                if status == "generating":
                                    section_timings[st] = {"start": time.time() - start_time}
                                    log(f"  [GEN ] {st} → generating...")

                            elif etype == "section_done":
                                st = event.get("section_type", "")
                                sd = event.get("section_data", {})
                                content = sd.get("content", "") or ""
                                elapsed = event.get("elapsed", 0)
                                model = event.get("model", "unknown")
                                status = event.get("status", "unknown")

                                if st in section_timings:
                                    section_timings[st]["end"] = time.time() - start_time
                                    section_timings[st]["duration"] = round(section_timings[st]["end"] - section_timings[st]["start"], 2)

                                sections_received[st] = {
                                    "content_length": len(content),
                                    "content_preview": content[:200] if content else "",
                                    "content_empty": len(content.strip()) < 20,
                                    "has_raw_json": content.strip().startswith("{") or content.strip().startswith("["),
                                    "model": model,
                                    "elapsed": elapsed,
                                    "status": status,
                                    "quality_score": event.get("quality_score"),
                                }

                                model_routing.append({
                                    "section": st,
                                    "model": model,
                                    "elapsed": elapsed,
                                    "status": status,
                                })

                                icon = "[OK]" if status == "completed" else "[FAIL]"
                                log(f"  [{icon}] {st} done | model={model} | {len(content)} chars | {elapsed}s")

                            elif etype == "error":
                                errors.append(event.get("content", "unknown error"))
                                log(f"  [ERR] {event.get('content', '')}")

                            elif etype == "lesson":
                                total = round(time.time() - start_time, 2)
                                log(f"  [DONE] Final lesson received | total={total}s")

                        except json.JSONDecodeError:
                            continue

        except Exception as e:
            errors.append(str(e))
            log(f"  [EXCEPTION] {e}")

    total_time = round(time.time() - start_time, 2)

    return {
        "ttfb": ttfb,
        "total_time": total_time,
        "sections": sections_received,
        "section_timings": section_timings,
        "model_routing": model_routing,
        "errors": errors,
    }


async def test_lesson(idx: int, lesson: dict) -> dict:
    subject = lesson["subject"]
    topic = lesson["topic"]
    branch = lesson["branch"]

    log(f"\n{'='*60}")
    log(f"LESSON {idx+1}: {branch} / {subject} / {topic}")
    log(f"{'='*60}")

    result = await generate_lesson_sse(subject, topic)

    # Verify each required section
    section_results = {}
    for sec in REQUIRED_SECTIONS:
        data = result["sections"].get(sec, None)
        if data is None:
            section_results[sec] = {"status": "MISSING", "content_length": 0}
        elif data["content_empty"]:
            section_results[sec] = {"status": "EMPTY", "content_length": data["content_length"]}
        elif data["has_raw_json"]:
            section_results[sec] = {"status": "RAW_JSON", "content_length": data["content_length"]}
        else:
            section_results[sec] = {
                "status": "OK",
                "content_length": data["content_length"],
                "model": data["model"],
                "elapsed": data["elapsed"],
                "preview": data["content_preview"][:100],
            }

    # Summary
    ok_count = sum(1 for v in section_results.values() if v["status"] == "OK")
    missing = [k for k, v in section_results.items() if v["status"] == "MISSING"]
    empty = [k for k, v in section_results.items() if v["status"] == "EMPTY"]
    raw = [k for k, v in section_results.items() if v["status"] == "RAW_JSON"]

    log(f"\n  RESULT: {ok_count}/10 sections generated")
    if missing: log(f"  MISSING: {missing}")
    if empty:   log(f"  EMPTY: {empty}")
    if raw:     log(f"  RAW_JSON: {raw}")
    log(f"  TTFB: {result['ttfb']}s | TOTAL: {result['total_time']}s")

    return {
        "lesson": lesson,
        "sections": section_results,
        "model_routing": result["model_routing"],
        "ttfb": result["ttfb"],
        "total_time": result["total_time"],
        "errors": result["errors"],
        "ok_count": ok_count,
        "passed": ok_count == 10 and len(result["errors"]) == 0,
    }


async def test_key_rotation_stress():
    """Generate 10 quick lessons rapidly to test key rotation."""
    log(f"\n{'='*60}")
    log("STRESS TEST: API Key Rotation (10 rapid requests)")
    log(f"{'='*60}")

    stress_subjects = [
        ("Python Programming", "Variables"),
        ("Data Structures", "Arrays"),
        ("Operating Systems", "Process"),
        ("Digital Electronics", "Logic Gates"),
        ("Thermodynamics", "Heat Transfer"),
        ("Python Programming", "Loops"),
        ("Data Structures", "Linked Lists"),
        ("Operating Systems", "Memory Management"),
        ("Digital Electronics", "Boolean Algebra"),
        ("Thermodynamics", "First Law"),
    ]

    key_usage = {}
    results = []

    for i, (subject, topic) in enumerate(stress_subjects):
        log(f"\n  Stress #{i+1}: {subject} / {topic}")
        result = await generate_lesson_sse(subject, topic)

        # Collect key usage via model routing
        for mr in result.get("model_routing", []):
            model = mr.get("model", "unknown")
            key_usage[model] = key_usage.get(model, 0) + 1

        ok = len([s for s in result["sections"].values() if not s.get("content_empty", True) and not s.get("has_raw_json", False)])
        results.append({
            "subject": subject,
            "topic": topic,
            "sections_ok": ok,
            "total_time": result["total_time"],
            "errors": result["errors"],
        })

        log(f"  → {ok} sections OK | {result['total_time']}s | errors: {result['errors']}")

    log(f"\n  STRESS SUMMARY:")
    log(f"  Total requests: {len(results)}")
    log(f"  All passed: {all(r['sections_ok'] > 5 for r in results)}")
    log(f"  Models used: {key_usage}")

    return {
        "results": results,
        "model_usage": key_usage,
        "all_passed": all(r["sections_ok"] > 5 for r in results),
    }


async def main():
    log("="*60)
    log("AI MENTOR STUDIO v2 — PRODUCTION QA SUITE")
    log(f"Start time: {datetime.now().isoformat()}")
    log("="*60)

    # 1. Health check
    try:
        health = await check_health()
        log(f"\n[HEALTH] Backend: {health}")
    except Exception as e:
        log(f"\n[HEALTH] Backend unreachable: {e}")
        sys.exit(1)

    # 2. Key health
    key_health = await get_key_health()
    log(f"[KEYS] {key_health}")

    # 3. Test all 5 required lessons
    lesson_results = []
    for i, lesson in enumerate(LESSONS):
        res = await test_lesson(i, lesson)
        lesson_results.append(res)
        # Brief pause between lessons
        await asyncio.sleep(2)

    # 4. Stress test key rotation
    stress_result = await test_key_rotation_stress()

    # 5. Final report
    log(f"\n{'='*60}")
    log("FINAL QA REPORT")
    log(f"{'='*60}")

    all_pass = all(r["passed"] for r in lesson_results)

    for i, r in enumerate(lesson_results):
        l = r["lesson"]
        status = "[PASS]" if r["passed"] else "[FAIL]"
        log(f"\n  Lesson {i+1} {status}: {l['subject']} / {l['topic']}")
        log(f"    Sections: {r['ok_count']}/10 OK")
        log(f"    TTFB: {r['ttfb']}s | Total: {r['total_time']}s")
        if r["errors"]:
            log(f"    Errors: {r['errors']}")
        for sec, sd in r["sections"].items():
            icon = "[OK]" if sd["status"] == "OK" else "[--]"
            log(f"    {icon} {sec}: {sd['status']} ({sd.get('content_length',0)} chars)")

    verdict = "[PASS] PRODUCTION READY" if all_pass else "[FAIL] NOT PRODUCTION READY"
    log(f"\n{'='*60}")
    log(f"VERDICT: {verdict}")
    log(f"{'='*60}")

    # Save report
    full_report = {
        "timestamp": datetime.now().isoformat(),
        "verdict": verdict,
        "all_pass": all_pass,
        "lessons": lesson_results,
        "stress": stress_result,
        "log": log_lines,
    }
    save_report(full_report)

    return all_pass


if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
