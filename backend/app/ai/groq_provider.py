"""
Groq Provider — Persistent shared connection pool, HTTP keep-alive, fast streaming.
Uses a module-level client shared across all agents to eliminate per-request TLS overhead.
"""
import json
import logging
import time
from typing import List, AsyncGenerator, Optional, Dict, Any

import asyncio
import httpx

from app.ai.base import AIProvider, CompletionRequest, CompletionResponse, StreamChunk
from app.ai.key_manager import KeyManager, key_manager as default_key_manager

logger = logging.getLogger(__name__)

import threading

class ModelTracker:
    def __init__(self):
        self._lock = threading.Lock()
        self.active_requests = {}
        self.completed_requests = {}
        self.total_latency = {}
        self.total_tokens = {}
        self.total_time = {}

    def start_request(self, model_id: str):
        with self._lock:
            self.active_requests[model_id] = self.active_requests.get(model_id, 0) + 1

    def end_request(self, model_id: str, latency: float, tokens: int):
        with self._lock:
            if model_id in self.active_requests:
                self.active_requests[model_id] = max(0, self.active_requests[model_id] - 1)
            self.completed_requests[model_id] = self.completed_requests.get(model_id, 0) + 1
            self.total_latency[model_id] = self.total_latency.get(model_id, 0.0) + latency
            self.total_tokens[model_id] = self.total_tokens.get(model_id, 0) + tokens
            self.total_time[model_id] = self.total_time.get(model_id, 0.0) + latency

    def get_active_models(self) -> list:
        with self._lock:
            models = set(self.active_requests.keys()) | set(self.completed_requests.keys())
            return sorted(list(models))

    def get_avg_latency(self, model_id: str) -> float:
        with self._lock:
            completed = self.completed_requests.get(model_id, 0)
            if completed > 0:
                return self.total_latency.get(model_id, 0.0) / completed
            return 0.0

    def get_tokens_per_second(self, model_id: str) -> float:
        with self._lock:
            total_time = self.total_time.get(model_id, 0.0)
            if total_time > 0:
                return self.total_tokens.get(model_id, 0) / total_time
            return 0.0

model_tracker = ModelTracker()

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Module-level shared HTTP client — persistent connection pool, HTTP keep-alive
# Eliminates TLS handshake overhead across parallel agents
_SHARED_CLIENT: Optional[httpx.AsyncClient] = None


def get_shared_client() -> httpx.AsyncClient:
    """Return module-level shared httpx client, creating if needed."""
    global _SHARED_CLIENT
    if _SHARED_CLIENT is None or _SHARED_CLIENT.is_closed:
        _SHARED_CLIENT = httpx.AsyncClient(
            timeout=httpx.Timeout(
                connect=5.0,
                read=120.0,  # Increased for long section generation
                write=15.0,
                pool=5.0,
            ),
            limits=httpx.Limits(
                max_keepalive_connections=100,  # Increased for parallel agents
                max_connections=200,             # Increased for parallel agents
                keepalive_expiry=60.0,
            ),
            headers={
                "Connection": "keep-alive",
                "Content-Type": "application/json",
            },
            http2=True,
        )
        logger.info("Created shared Groq HTTP client (pool: 50 keepalive, 100 max, HTTP/2 enabled)")
    return _SHARED_CLIENT


async def close_shared_client() -> None:
    """Close the shared client (called on shutdown)."""
    global _SHARED_CLIENT
    if _SHARED_CLIENT and not _SHARED_CLIENT.is_closed:
        try:
            await _SHARED_CLIENT.aclose()
        except Exception as e:
            logger.debug(f"Ignored exception during client close: {e}")
        _SHARED_CLIENT = None


class GroqProvider(AIProvider):
    def __init__(
        self,
        key_manager: Optional[KeyManager] = None,
        base_url: str = GROQ_BASE_URL,
        timeout: float = 120.0,
    ):
        self._key_manager = key_manager or default_key_manager
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout
        self._api_key: Optional[str] = None
        
        # Sticky routing: model_id -> key
        self._last_successful_key: Dict[str, str] = {}

    def set_api_key(self, api_key: str) -> None:
        """Set a pinned API key to override key manager."""
        self._api_key = api_key

    @property
    def name(self) -> str:
        return "groq"

    @property
    def available_models(self) -> List[str]:
        from app.ai.model_router_config import MODEL_REGISTRY
        return [m for m, cfg in MODEL_REGISTRY.items() if cfg.category not in ("safety",)]

    def _get_client(self) -> httpx.AsyncClient:
        return get_shared_client()

    async def complete(self, request: CompletionRequest) -> CompletionResponse:
        if self._api_key:
            api_key = next((k for k in self._key_manager.keys if k.key == self._api_key), None)
            if not api_key:
                from app.ai.key_manager import ApiKey
                api_key = ApiKey(key=self._api_key)
        else:
            from app.ai.health_cache import health_cache
            last_key = self._last_successful_key.get(request.model)
            api_key = None
            if last_key and health_cache.is_fully_healthy(last_key[:12], request.model):
                api_key = next((k for k in self._key_manager.keys if k.key == last_key), None)
            
            if not api_key:
                api_key = self._key_manager.get_available_key(request.model)

        if not api_key:
            raise RuntimeError("No available API keys for Groq")

        payload = self._build_payload(request)
        headers = self._build_headers(api_key.key)
        client = self._get_client()

        model_tracker.start_request(request.model)
        start_time = time.time()
        try:
            response = await client.post(
                f"{self._base_url}/chat/completions",
                json=payload,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            data["headers"] = dict(response.headers)
            api_key.record_use()
            elapsed = time.time() - start_time
            tokens = 0
            if data.get("usage"):
                tokens = data["usage"].get("completion_tokens", 0)
            model_tracker.end_request(request.model, elapsed, tokens)
            
            # Sticky routing: save successful key
            self._last_successful_key[request.model] = api_key.key
            
            return CompletionResponse(
                content=data["choices"][0]["message"]["content"],
                model=data["model"],
                usage=data.get("usage"),
                raw=data,
            )
        except httpx.HTTPStatusError as e:
            status = e.response.status_code
            if status in (429, 503):
                api_key.mark_cooldown(60, model_id=request.model)
            elif status in (401, 403):
                api_key.mark_failed(300, model_id=request.model)
            error_detail = f"Groq API error {status}"
            try:
                error_detail = f"Groq API error {status}: {e.response.text[:500]}"
            except Exception:
                pass
            elapsed = time.time() - start_time
            model_tracker.end_request(request.model, elapsed, 0)
            raise RuntimeError(error_detail)
        except httpx.TimeoutException:
            api_key.mark_cooldown(60, model_id=request.model)
            elapsed = time.time() - start_time
            model_tracker.end_request(request.model, elapsed, 0)
            raise RuntimeError("Groq API request timed out")
        except Exception as e:
            api_key.mark_failed(60, model_id=request.model)
            elapsed = time.time() - start_time
            model_tracker.end_request(request.model, elapsed, 0)
            raise RuntimeError(f"Groq API request failed: {str(e)}")

    async def complete_stream(
        self, request: CompletionRequest
    ) -> AsyncGenerator[StreamChunk, None]:
        client = self._get_client()
        model_tracker.start_request(request.model)
        start_time = time.time()
        completion_tokens = 0
        try:
            excluded_keys: set = set()
            max_attempts = 15
            backoff = 2.0
            
            # If using a specific pinned key, we only have one attempt
            if self._api_key:
                max_attempts = 1

            for attempt in range(max_attempts):
                api_key = None
                
                if self._api_key:
                    api_key = next((k for k in self._key_manager.keys if k.key == self._api_key), None)
                    if not api_key:
                        from app.ai.key_manager import ApiKey
                        api_key = ApiKey(key=self._api_key)
                else:
                    # Sticky routing check
                    from app.ai.health_cache import health_cache
                    last_key = self._last_successful_key.get(request.model)
                    if last_key and last_key not in excluded_keys and health_cache.is_fully_healthy(last_key[:12], request.model):
                        api_key = next((k for k in self._key_manager.keys if k.key == last_key), None)
                        
                    if not api_key:
                        api_key = self._key_manager.get_available_key(request.model, excluded_keys)
                        
                if not api_key:
                    if len(excluded_keys) >= len(self._key_manager.keys):
                        yield StreamChunk(content="", error="All API keys exhausted")
                        return
                        
                    logger.warning("All keys in cooldown for model=%s. Backing off %.1fs", request.model, backoff)
                    await asyncio.sleep(backoff)
                    backoff = min(backoff * 2, 60.0)
                    continue
                    
                payload = self._build_payload(request, stream=True)
                headers = self._build_headers(api_key.key)
                success = False

                try:
                    async with client.stream(
                        "POST",
                        f"{self._base_url}/chat/completions",
                        json=payload,
                        headers=headers,
                    ) as response:
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            chunk = self._parse_sse_line(line)
                            if chunk is not None:
                                if chunk.content:
                                    completion_tokens += len(chunk.content.split())
                                if chunk.usage and "completion_tokens" in chunk.usage:
                                    completion_tokens = chunk.usage["completion_tokens"]
                                yield chunk
                                if chunk.finish_reason == "stop":
                                    success = True
                                    self._last_successful_key[request.model] = api_key.key
                                    break
                                    
                    if not success:
                        success = True
                        
                    api_key.record_use()
                    self._last_successful_key[request.model] = api_key.key
                    return

                except httpx.HTTPStatusError as e:
                    status = e.response.status_code
                    if status in (429, 503):
                        api_key.mark_cooldown(60, model_id=request.model)
                    else:
                        api_key.mark_failed(300, model_id=request.model)
                        excluded_keys.add(api_key.key)
                        
                    if self._api_key:
                        yield StreamChunk(content="", error=f"HTTP {status}")
                        return
                    continue

                except httpx.TimeoutException:
                    api_key.mark_cooldown(30, model_id=request.model)
                    if self._api_key:
                        yield StreamChunk(content="", error="Request timed out")
                        return
                    continue

                except Exception as e:
                    api_key.mark_failed(60, model_id=request.model)
                    excluded_keys.add(api_key.key)
                    if self._api_key:
                        yield StreamChunk(content="", error=f"Request failed: {str(e)}")
                        return
                    continue
                    
        finally:
            elapsed = time.time() - start_time
            model_tracker.end_request(request.model, elapsed, completion_tokens)

    def _parse_sse_line(self, line: str) -> Optional[StreamChunk]:
        """Parse a single SSE line, return StreamChunk or None."""
        if not line.strip():
            return None
        if not line.startswith("data: "):
            return None
        data_str = line[6:]
        if data_str.strip() == "[DONE]":
            return StreamChunk(content="", finish_reason="stop")
        try:
            data = json.loads(data_str)
            delta = data["choices"][0]["delta"]
            content = delta.get("content", "") or ""
            finish_reason = data["choices"][0].get("finish_reason")
            usage = data.get("usage")
            return StreamChunk(
                content=content,
                finish_reason=finish_reason,
                usage=usage,
            )
        except (json.JSONDecodeError, KeyError, IndexError):
            return None

    def _build_payload(self, request: CompletionRequest, stream: bool = False) -> Dict[str, Any]:
        payload = request.to_dict()
        payload["stream"] = stream
        return payload

    def _build_headers(self, api_key: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    async def close(self) -> None:
        # Don't close shared client here — it's shared across agents
        pass
