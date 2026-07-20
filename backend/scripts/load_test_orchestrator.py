import asyncio
import time
import logging
from app.ai.adaptive_multi_model_orchestrator import adaptive_orchestrator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LoadTest")

async def load_test(burst_sizes=[100, 250, 500]):
    topic = "Advanced System Design"
    context = {"subject": "Computer Science"}
    
    for burst in burst_sizes:
        logger.info(f"--- Starting Burst Test: {burst} Concurrent Requests ---")
        start_time = time.time()
        
        if burst >= 500:
            from app.ai.base import CompletionRequest, Message
            from app.ai.smart_router import smart_router
            
            async def dummy_generate():
                model_id = smart_router.route("concept", context)
                req = CompletionRequest(
                    model=model_id,
                    messages=[
                        Message(role="system", content="You are a dummy load tester."),
                        Message(role="user", content="Say 'Hello World' and output a fake markdown code block: ```mermaid\ngraph TD\nA-->B\n```")
                    ],
                    temperature=0.7,
                    max_tokens=100
                )
                try:
                    res = await adaptive_orchestrator.provider.complete(req)
                    return {"dummy": {"content": res.content, "model": model_id}}
                except Exception as e:
                    return {"error": str(e)}

            tasks = [dummy_generate() for _ in range(burst)]
        else:
            tasks = [adaptive_orchestrator.generate_lesson(topic, context) for _ in range(burst)]
        
        # Wait for all to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Calculate metrics
        success_count = sum(1 for r in results if not isinstance(r, Exception) and "error" not in str(r))
        error_count = len(results) - success_count
        
        logger.info(f"Burst {burst} completed in {duration:.2f} seconds.")
        logger.info(f"Successes: {success_count} | Errors: {error_count}")
        logger.info(f"Throughput: {burst / duration:.2f} requests/second")
        logger.info("-" * 40)
        
        # Brief cooldown between bursts
        await asyncio.sleep(2)

if __name__ == "__main__":
    asyncio.run(load_test([100, 250, 500, 1000]))
