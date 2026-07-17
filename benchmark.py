"""
Benchmark Script -- Measures lesson generation performance before/after optimization.
Run: python benchmark.py
"""
import asyncio
import time
import json
import statistics
import sys
import httpx
from dataclasses import dataclass, field
from typing import List, Dict, Any

# Force UTF-8 output on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


BACKEND_URL = "http://localhost:8000"

# 50 diverse lessons covering programming, networking, databases, operating systems, system design, calculus
TEST_LESSONS = [
    # Programming
    {"subject": "Python Programming", "topic": "Functions", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Python Programming", "topic": "Decorators", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "Python Programming", "topic": "Generators", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Java Programming", "topic": "Inheritance", "difficulty": "beginner", "learning_mode": "default"},
    {"subject": "Java Programming", "topic": "Garbage Collection", "difficulty": "expert", "learning_mode": "default"},
    {"subject": "C++ Programming", "topic": "Pointers", "difficulty": "beginner", "learning_mode": "default"},
    {"subject": "C++ Programming", "topic": "Templates", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "JavaScript", "topic": "Promises", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "JavaScript", "topic": "Event Loop", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "TypeScript", "topic": "Generics", "difficulty": "intermediate", "learning_mode": "default"},
    # Data Structures & Algorithms
    {"subject": "Data Structures", "topic": "Binary Search Tree", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Data Structures", "topic": "Red-Black Tree", "difficulty": "expert", "learning_mode": "default"},
    {"subject": "Data Structures", "topic": "Hash Tables", "difficulty": "beginner", "learning_mode": "default"},
    {"subject": "Data Structures", "topic": "Trie", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "Algorithms", "topic": "Merge Sort", "difficulty": "beginner", "learning_mode": "default"},
    {"subject": "Algorithms", "topic": "Quick Sort", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Algorithms", "topic": "Dijkstra Algorithm", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "Algorithms", "topic": "A* Search", "difficulty": "expert", "learning_mode": "default"},
    {"subject": "Algorithms", "topic": "Kruskal Algorithm", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Algorithms", "topic": "Bellman-Ford Algorithm", "difficulty": "advanced", "learning_mode": "default"},
    # Databases
    {"subject": "Database Systems", "topic": "SQL Joins", "difficulty": "beginner", "learning_mode": "default"},
    {"subject": "Database Systems", "topic": "Indexing", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Database Systems", "topic": "ACID Transactions", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "Database Systems", "topic": "NoSQL Databases", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Database Systems", "topic": "Database Normalization", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Database Systems", "topic": "Query Optimization", "difficulty": "expert", "learning_mode": "default"},
    # Networking
    {"subject": "Computer Networks", "topic": "TCP Three-way Handshake", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Computer Networks", "topic": "DNS Resolution", "difficulty": "beginner", "learning_mode": "default"},
    {"subject": "Computer Networks", "topic": "IP Routing Protocols", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "Computer Networks", "topic": "OSI Model Layers", "difficulty": "beginner", "learning_mode": "default"},
    {"subject": "Computer Networks", "topic": "HTTP vs HTTP/2", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Computer Networks", "topic": "SSL/TLS Handshake", "difficulty": "expert", "learning_mode": "default"},
    # Operating Systems
    {"subject": "Operating Systems", "topic": "Process Synchronization", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "Operating Systems", "topic": "Virtual Memory", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Operating Systems", "topic": "Deadlocks", "difficulty": "beginner", "learning_mode": "default"},
    {"subject": "Operating Systems", "topic": "CPU Scheduling", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Operating Systems", "topic": "File Systems Layout", "difficulty": "intermediate", "learning_mode": "default"},
    # System Design
    {"subject": "System Design", "topic": "Load Balancing", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "System Design", "topic": "Consistent Hashing", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "System Design", "topic": "Microservices Architecture", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "System Design", "topic": "Caching Strategies", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "System Design", "topic": "Message Queues", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "System Design", "topic": "Sharding Databases", "difficulty": "expert", "learning_mode": "default"},
    # Mathematics
    {"subject": "Linear Algebra", "topic": "Matrix Multiplication", "difficulty": "beginner", "learning_mode": "default"},
    {"subject": "Linear Algebra", "topic": "Eigenvalues", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "Calculus", "topic": "Derivatives", "difficulty": "beginner", "learning_mode": "default"},
    {"subject": "Calculus", "topic": "Integrals", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Probability", "topic": "Bayes Theorem", "difficulty": "intermediate", "learning_mode": "default"},
    {"subject": "Statistics", "topic": "Hypothesis Testing", "difficulty": "advanced", "learning_mode": "default"},
    {"subject": "Discrete Mathematics", "topic": "Graph Theory Intro", "difficulty": "intermediate", "learning_mode": "default"},
]


@dataclass
class LessonMetrics:
    subject: str
    topic: str
    planner_time: float = 0.0
    first_token_time: float = 0.0      # Time to first section chunk
    explanation_visible_time: float = 0.0 # Time to first token of explanation section
    explanation_time: float = 0.0      # Time to complete explanation section
    first_section_time: float = 0.0   # Time to first section status generating
    first_done_time: float = 0.0      # Time to first section_done
    total_time: float = 0.0
    sections_completed: int = 0
    sections_total: int = 0
    key_errors: int = 0
    models_used: List[str] = field(default_factory=list)
    section_times: Dict[str, float] = field(default_factory=dict)
    error: str = ""


async def benchmark_lesson(client: httpx.AsyncClient, lesson: dict, sem: asyncio.Semaphore) -> LessonMetrics:
    """Benchmark a single lesson generation."""
    async with sem:
        metrics = LessonMetrics(subject=lesson["subject"], topic=lesson["topic"])
        start = time.time()
        plan_received = False
        first_generating = False
        first_done = False
        first_token = False
        explanation_token = False
        section_start_times: Dict[str, float] = {}

        try:
            async with client.stream(
                "POST",
                f"{BACKEND_URL}/api/v1/ai/generate",
                json={
                    "subject": lesson["subject"],
                    "topic": lesson["topic"],
                    "difficulty": lesson["difficulty"],
                    "learning_mode": lesson["learning_mode"],
                },
                timeout=180.0,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:].strip()
                    if not data_str or data_str == "[DONE]":
                        continue
                    try:
                        event = json.loads(data_str)
                    except Exception:
                        continue

                    t = time.time() - start
                    etype = event.get("type", "")

                    if etype == "section_chunk":
                        if not first_token:
                            metrics.first_token_time = round(t, 2)
                            first_token = True
                        if event.get("section_type") == "explanation" and not explanation_token:
                            metrics.explanation_visible_time = round(t, 2)
                            explanation_token = True

                    elif etype == "plan" and not plan_received:
                        metrics.planner_time = round(t, 2)
                        metrics.sections_total = len(event.get("sections", []))
                        plan_received = True

                    elif etype == "section_status" and event.get("status") == "generating":
                        st = event.get("section_type", "")
                        section_start_times[st] = time.time()
                        if not first_generating:
                            metrics.first_section_time = round(t, 2)
                            first_generating = True

                    elif etype == "section_done":
                        st = event.get("section_type", "")
                        if event.get("status") != "failed":
                            metrics.sections_completed += 1
                        model = event.get("model", "")
                        if model and model not in metrics.models_used:
                            metrics.models_used.append(model)

                        section_elapsed = round(time.time() - start, 2)
                        if st in section_start_times:
                            section_dur = round(time.time() - section_start_times[st], 2)
                            metrics.section_times[st] = section_dur
                        if st == "explanation":
                            metrics.explanation_time = section_elapsed
                        if not first_done:
                            metrics.first_done_time = round(t, 2)
                            first_done = True

                    elif etype == "done":
                        metrics.total_time = round(t, 2)
                        break

                    elif etype == "error":
                        metrics.error = event.get("content", "unknown error")
                        metrics.total_time = round(t, 2)
                        break

        except Exception as e:
            metrics.total_time = round(time.time() - start, 2)
            metrics.error = str(e)

        return metrics


async def run_benchmark():
    print("=" * 70)
    print("MENTOR AI STUDIO — PERFORMANCE BENCHMARK (50 LESSONS)")
    print("=" * 70)
    print(f"Backend: {BACKEND_URL}")
    print(f"Test lessons: {len(TEST_LESSONS)}")
    print()

    # Check backend health
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            r = await client.get(f"{BACKEND_URL}/api/v1/ai/health")
            r.raise_for_status()
            print("Backend healthy ✓")
        except Exception as e:
            print(f"Backend NOT reachable: {e}")
            print("Start backend first: uvicorn app.main:app --host 0.0.0.0 --port 8000")
            return

    # Track active API keys
    key_in_flights = []
    benchmark_done = asyncio.Event()

    async def poll_key_utilization():
        async with httpx.AsyncClient(timeout=5.0) as client:
            while not benchmark_done.is_set():
                try:
                    r = await client.get(f"{BACKEND_URL}/api/v1/ai/health")
                    if r.status_code == 200:
                        h = r.json()
                        keys = h.get("keys", {})
                        in_flight = keys.get("in_flight", 0)
                        key_in_flights.append(in_flight)
                except Exception:
                    pass
                await asyncio.sleep(0.5)

    poll_task = asyncio.create_task(poll_key_utilization())

    # Concurrency limit of 5 concurrent lessons to saturate the keys without over-queuing
    sem = asyncio.Semaphore(5)
    
    start_bench = time.time()
    
    all_metrics: List[LessonMetrics] = []
    
    # Run all 50 lessons concurrently using the semaphore
    async with httpx.AsyncClient(timeout=180.0) as client:
        tasks = [
            benchmark_lesson(client, lesson, sem)
            for lesson in TEST_LESSONS
        ]
        
        # Gather with incremental printing as they complete
        for fut in asyncio.as_completed(tasks):
            m = await fut
            all_metrics.append(m)
            status = "✓ DONE" if not m.error else "✗ FAIL"
            print(f"[{len(all_metrics)}/50] {m.subject} → {m.topic:<28} | {status} | Time: {m.total_time:.1f}s | Planner: {m.planner_time:.2f}s | Explanation Complete: {m.explanation_time:.1f}s")
            sys.stdout.flush()

    benchmark_done.set()
    await poll_task
    
    total_bench_duration = time.time() - start_bench

    # ── Summary Report ─────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("BENCHMARK SUMMARY RESULTS")
    print("=" * 70)

    successful = [m for m in all_metrics if not m.error]
    failed = [m for m in all_metrics if m.error]

    print(f"\nTests run:     {len(all_metrics)}")
    print(f"Successful:    {len(successful)}")
    print(f"Failed:        {len(failed)}")
    print(f"Benchmark Time: {total_bench_duration:.1f}s")

    if successful:
        planner_times = [m.planner_time for m in successful]
        first_token_times = [m.first_token_time for m in successful]
        explanation_visible_times = [m.explanation_visible_time for m in successful]
        explanation_times = [m.explanation_time for m in successful]
        first_done_times = [m.first_done_time for m in successful]
        total_times = [m.total_time for m in successful]
        sections_completed = [m.sections_completed for m in successful]

        print(f"\n{'Metric':<30} {'Min':>8} {'Avg':>8} {'Max':>8}")
        print("-" * 60)

        def fmt_row(label, values):
            if not values:
                return f"{label:<30} N/A"
            return f"{label:<30} {min(values):>7.1f}s {statistics.mean(values):>7.1f}s {max(values):>7.1f}s"

        print(fmt_row("Planner time", planner_times))
        print(fmt_row("First token visible", first_token_times))
        print(fmt_row("Explanation visible", explanation_visible_times))
        print(fmt_row("Explanation completed", explanation_times))
        print(fmt_row("First completed section", first_done_times))
        print(fmt_row("Total lesson time", total_times))

        avg_sections = statistics.mean(sections_completed)
        print(f"\nAvg sections completed: {avg_sections:.1f}/10")

        # Models used
        all_models = set()
        for m in successful:
            all_models.update(m.models_used)
        print(f"Models used: {', '.join(sorted(all_models)) or 'none'}")

        # Model and Key utilization
        # 10 keys total
        avg_active_keys = statistics.mean(key_in_flights) if key_in_flights else 0.0
        api_key_util_pct = (avg_active_keys / 10.0) * 100.0
        idle_pct = 100.0 - api_key_util_pct

        print(f"API Key Utilization:   {api_key_util_pct:.1f}%  (Avg active: {avg_active_keys:.1f}/10 keys)")
        print(f"Idle Resource Pct:     {idle_pct:.1f}%")

        # Parallel efficiency calculation
        # Parallel efficiency = Work duration / (Wall-clock time * number of workers)
        # Sum of all sections duration / sum of lesson durations
        all_section_latencies = []
        for m in successful:
            all_section_latencies.extend(list(m.section_times.values()))
        
        sum_section_times = sum(all_section_latencies)
        sum_lesson_times = sum(total_times)
        
        # Parallel efficiency relative to maximum keys
        parallel_efficiency = (sum_section_times / (sum_lesson_times * 10)) * 100 if sum_lesson_times > 0 else 0.0
        print(f"Parallel Efficiency:   {parallel_efficiency:.1f}%")

        print(f"\n{'Section':<25} {'Avg Time':>10}")
        print("-" * 40)
        all_section_times: Dict[str, List[float]] = {}
        for m in successful:
            for st, t in m.section_times.items():
                all_section_times.setdefault(st, []).append(t)
        for st, times in sorted(all_section_times.items()):
            print(f"  {st:<23} {statistics.mean(times):>8.1f}s")

    if failed:
        print(f"\nFailed lessons:")
        for m in failed:
            print(f"  {m.subject}/{m.topic}: {m.error}")

    print("\n" + "=" * 70)
    print("PERFORMANCE TARGETS VS ACTUALS")
    print("=" * 70)
    
    def check_target(label, avg_val, target_val):
        status = "[PASS]" if avg_val <= target_val else "[FAIL]"
        print(f"  {status:<7} {label:<35} Target: <{target_val:.1f}s | Actual: {avg_val:.1f}s")

    if successful:
        check_target("Planner time", statistics.mean(planner_times), 0.2)
        check_target("First token visible", statistics.mean(first_token_times), 1.0)
        check_target("Explanation visible", statistics.mean(explanation_visible_times), 2.0)
        check_target("First completed section", statistics.mean(first_done_times), 6.0)
        check_target("Entire lesson time", statistics.mean(total_times), 25.0)


if __name__ == "__main__":
    asyncio.run(run_benchmark())
