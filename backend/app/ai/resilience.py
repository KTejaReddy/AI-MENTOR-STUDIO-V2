import logging
import time
from typing import AsyncGenerator, Callable, Any
from app.ai.base import CompletionRequest, CompletionResponse, StreamChunk
from app.ai.model_pool import model_pool
from app.ai.model_router import model_router
from app.ai.base import AIProvider

logger = logging.getLogger(__name__)

async def execute_with_failover(
    provider: AIProvider,
    section_type: str,
    learning_mode: str,
    request_builder: Callable[[str], CompletionRequest]
) -> CompletionResponse:
    """Executes a complete() call with automatic failover across the ModelPool."""
    fallback_chain = model_router.get_fallback_chain(section_type, learning_mode)
    if not fallback_chain:
        fallback_chain = ["llama-3.3-70b-versatile"]
        
    last_error = None
    
    for model_id in fallback_chain:
        request = request_builder(model_id)
        start_time = time.time()
        
        try:
            response = await provider.complete(request)
            latency = (time.time() - start_time) * 1000
            
            req_rem, tok_rem = _extract_limits(getattr(response, 'raw', {}))
            
            model_pool.report_success(
                model_id=model_id, 
                latency_ms=latency,
                rate_limit_remaining=req_rem,
                token_limit_remaining=tok_rem
            )
            return response
            
        except Exception as e:
            logger.warning(f"Model {model_id} failed during execute_with_failover: {e}")
            model_pool.report_failure(model_id, str(e))
            last_error = e
            continue
            
    raise RuntimeError(f"All models in fallback chain failed for {section_type}. Last error: {last_error}")


async def stream_with_failover(
    provider: AIProvider,
    section_type: str,
    learning_mode: str,
    request_builder: Callable[[str], CompletionRequest]
) -> AsyncGenerator[StreamChunk, None]:
    """
    Executes a stream with automatic failover.
    If the stream fails mid-way, it yields a FAILOVER_CLEAR event and restarts with the next model.
    """
    fallback_chain = model_router.get_fallback_chain(section_type, learning_mode)
    if not fallback_chain:
        fallback_chain = ["llama-3.3-70b-versatile"]
        
    for attempt, model_id in enumerate(fallback_chain):
        request = request_builder(model_id)
        failed_mid_stream = False
        chunks_yielded = 0
        
        start_time = time.time()
        
        try:
            async for chunk in provider.complete_stream(request):
                chunks_yielded += 1
                
                if chunk.error:
                    raise RuntimeError(f"Stream error: {chunk.error}")
                    
                yield chunk
                
            latency = (time.time() - start_time) * 1000
            model_pool.report_success(model_id, latency_ms=latency)
            return 
            
        except Exception as e:
            logger.warning(f"Model {model_id} failed during stream_with_failover: {e}")
            model_pool.report_failure(model_id, str(e))
            failed_mid_stream = chunks_yielded > 0
            
            if failed_mid_stream and attempt < len(fallback_chain) - 1:
                # Tell orchestrator to clear the buffer on frontend
                yield StreamChunk(content="", error="FAILOVER_CLEAR")
            continue
            
    raise RuntimeError(f"All models in fallback chain failed for {section_type}.")
    

def _extract_limits(raw_response: dict):
    headers = raw_response.get("headers", {})
    req = headers.get("x-ratelimit-remaining-requests")
    tok = headers.get("x-ratelimit-remaining-tokens")
    
    req_val = int(req) if req else None
    tok_val = int(tok) if tok else None
    return req_val, tok_val
