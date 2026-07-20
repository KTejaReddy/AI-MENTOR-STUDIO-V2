import logging
import time
from typing import AsyncGenerator, Callable, Set
from app.ai.base import CompletionRequest, CompletionResponse, StreamChunk, ClientRequestError, ContextLimitError
from app.ai.model_pool import model_pool
from app.ai.model_router import model_router
from app.ai.base import AIProvider

logger = logging.getLogger(__name__)


def _reduce_prompt_size(request: CompletionRequest) -> CompletionRequest:
    """Attempts to automatically reduce prompt size if a context limit error occurred."""
    for msg in request.messages:
        if "Source Material Context:" in msg.content:
            parts = msg.content.split("Source Material Context:")
            header = parts[0]
            context = parts[1]
            truncated_context = context[:len(context)//2]
            msg.content = f"{header}Source Material Context (Truncated due to context limit):\n{truncated_context}"
            logger.info("Automatically reduced source material context size by 50% due to ContextLimitError")
            return request
    return request


async def execute_with_failover(
    provider: AIProvider,
    section_type: str,
    request_builder: Callable[[str], CompletionRequest],
) -> CompletionResponse:
    """
    Executes a complete() call with automatic failover across ALL compatible models.

    ContextLimitError:
      - Prompt is reduced once and stays reduced for all subsequent models.
      - The model is NOT marked unhealthy (context size is a request issue, not model health).
      - Loop continues to the next model immediately.
      - Chain is only exhausted when EVERY compatible model has been tried.

    Other errors:
      - Model is reported unhealthy to model_pool.
      - Loop continues to the next model.
    """
    fallback_chain = model_router.get_fallback_chain(section_type)
    if not fallback_chain:
        fallback_chain = ["llama-3.3-70b-versatile"]

    last_error = None
    prompt_reduced = False
    context_limited: Set[str] = set()

    for model_id in fallback_chain:
        request = request_builder(model_id)
        if prompt_reduced:
            request = _reduce_prompt_size(request)

        start_time = time.time()

        try:
            response = await provider.complete(request)
            latency = (time.time() - start_time) * 1000

            req_rem, tok_rem = _extract_limits(getattr(response, "raw", {}))
            model_pool.report_success(
                model_id=model_id,
                latency_ms=latency,
                rate_limit_remaining=req_rem,
                token_limit_remaining=tok_rem,
            )
            return response

        except ContextLimitError as e:
            context_limited.add(model_id)
            prompt_reduced = True
            last_error = e
            remaining = len(fallback_chain) - fallback_chain.index(model_id) - 1
            logger.warning(
                "CONTEXT_LIMIT | model=%s section=%s | prompt reduced, "
                "%d models remaining in chain",
                model_id, section_type, remaining,
            )
            # Do NOT call model_pool.report_failure — not a health issue.
            continue

        except Exception as e:
            logger.warning(
                "MODEL_FAIL | model=%s section=%s | error=%s",
                model_id, section_type, e,
            )
            if not isinstance(e, ClientRequestError):
                model_pool.report_failure(model_id, str(e))
            last_error = e
            continue

    raise RuntimeError(
        f"All {len(fallback_chain)} models exhausted for section '{section_type}'. "
        f"Context-limited: {context_limited}. Last error: {last_error}"
    )


async def stream_with_failover(
    provider: AIProvider,
    section_type: str,
    request_builder: Callable[[str], CompletionRequest],
) -> AsyncGenerator[StreamChunk, None]:
    """
    Streams with automatic failover across ALL compatible models.

    ContextLimitError:
      - Prompt is reduced once and stays reduced for all subsequent models.
      - The model is NOT marked unhealthy.
      - If content was partially sent, FAILOVER_CLEAR is yielded so the frontend resets.
      - Loop continues to the NEXT model — NOT to section regeneration.
      - Chain is only exhausted when every model has been tried.

    Other errors:
      - Model is marked unhealthy.
      - FAILOVER_CLEAR is sent if content was partially streamed.
      - Loop continues.
    """
    fallback_chain = model_router.get_fallback_chain(section_type)
    if not fallback_chain:
        fallback_chain = ["llama-3.3-70b-versatile"]

    prompt_reduced = False
    context_limited: Set[str] = set()

    for attempt, model_id in enumerate(fallback_chain):
        remaining = len(fallback_chain) - attempt - 1

        request = request_builder(model_id)
        if prompt_reduced:
            request = _reduce_prompt_size(request)

        chunks_yielded = 0
        start_time = time.time()

        try:
            async for chunk in provider.complete_stream(request):
                chunks_yielded += 1

                if chunk.error:
                    if chunk.finish_reason == "client_error":
                        raise ClientRequestError(f"Stream error: {chunk.error}")
                    raise RuntimeError(f"Stream error: {chunk.error}")

                yield chunk

            latency = (time.time() - start_time) * 1000
            model_pool.report_success(model_id, latency_ms=latency)
            return  # Stream completed successfully

        except ContextLimitError as e:
            context_limited.add(model_id)
            prompt_reduced = True
            logger.warning(
                "CONTEXT_LIMIT | model=%s section=%s chunks_sent=%d | "
                "prompt reduced, %d models remaining in chain",
                model_id, section_type, chunks_yielded, remaining,
            )
            # Do NOT mark model unhealthy.
            if chunks_yielded > 0 and remaining > 0:
                yield StreamChunk(content="", error="FAILOVER_CLEAR")
            continue

        except Exception as e:
            logger.warning(
                "MODEL_FAIL | model=%s section=%s chunks_sent=%d | error=%s",
                model_id, section_type, chunks_yielded, e,
            )
            if not isinstance(e, ClientRequestError):
                model_pool.report_failure(model_id, str(e))
            if chunks_yielded > 0 and remaining > 0:
                yield StreamChunk(content="", error="FAILOVER_CLEAR")
            continue

    raise RuntimeError(
        f"All {len(fallback_chain)} models exhausted for section '{section_type}'. "
        f"Context-limited: {context_limited}."
    )


def _extract_limits(raw_response: dict):
    headers = raw_response.get("headers", {})
    req = headers.get("x-ratelimit-remaining-requests")
    tok = headers.get("x-ratelimit-remaining-tokens")
    
    req_val = int(req) if req else None
    tok_val = int(tok) if tok else None
    return req_val, tok_val
