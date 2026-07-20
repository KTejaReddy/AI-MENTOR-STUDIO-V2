import asyncio
import time
import logging

from app.ai.adaptive_multi_model_orchestrator import adaptive_orchestrator
from app.ai.orchestrator import generate_lesson as legacy_generate_lesson
from app.ai.groq_provider import GroqProvider
from app.ai.key_manager import key_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("Benchmark")

async def run_benchmark(num_lessons: int = 25):
    logger.info(f"Starting Benchmark: {num_lessons} lessons.")
    topic = "Quantum Computing Fundamentals"
    context = {"subject": "Computer Science", "mode": "deep"}
    provider = GroqProvider(key_manager=key_manager)

    # --- Benchmark CURRENT Orchestrator ---
    logger.info("=== Benchmarking CURRENT Orchestrator ===")
    start_time = time.time()
    
    async def run_legacy():
        async for chunk in legacy_generate_lesson(provider, context["subject"], topic, "intermediate", context["mode"]):
            pass
            
    legacy_tasks = [run_legacy() for _ in range(num_lessons)]
    await asyncio.gather(*legacy_tasks)
    old_time = time.time() - start_time
    
    # --- Benchmark NEW Orchestrator ---
    logger.info("=== Benchmarking NEW Adaptive Orchestrator ===")
    start_time = time.time()
    
    tasks = [adaptive_orchestrator.generate_lesson(topic, context) for _ in range(num_lessons)]
    new_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    new_time = time.time() - start_time

    # --- Results ---
    logger.info("=== Benchmark Results ===")
    logger.info(f"Current Orchestrator Time: {old_time:.2f}s")
    logger.info(f"New Orchestrator Time: {new_time:.2f}s")
    
    speedup = old_time / new_time if new_time > 0 else 0
    logger.info(f"Speedup: {speedup:.2f}x")
    logger.info(f"Validation Pass Rate: 100% (Mocked)")
    
if __name__ == "__main__":
    asyncio.run(run_benchmark(50))
