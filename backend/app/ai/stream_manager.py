"""SSE streaming management with active engine registry, cancellation, and reconnect."""
import asyncio
import json
import logging
import time
import uuid
from typing import Dict, Optional, AsyncGenerator, Any, Callable, Awaitable

from app.ai.base import AIProvider, CompletionRequest, StreamChunk

logger = logging.getLogger(__name__)


class StreamEvent:
    """Represents a single SSE event sent to the client."""

    def __init__(self, event_type: str, data: dict):
        self.event_type = event_type
        self.data = data

    def serialize(self) -> str:
        return f"data: {json.dumps(self.data)}\n\n"


class ActiveStream:
    """Tracks a single active generation stream."""

    def __init__(self, engine_id: str, subject: str, topic: str):
        self.id = engine_id
        self.subject = subject
        self.topic = topic
        self.created_at = time.time()
        self._cancel_event = asyncio.Event()
        self._accumulated = ""
        self._total_tokens = 0
        self._start_time = time.time()
        self._model = ""

    @property
    def is_cancelled(self) -> bool:
        return self._cancel_event.is_set()

    @property
    def elapsed(self) -> float:
        return time.time() - self._start_time

    @property
    def accumulated(self) -> str:
        return self._accumulated

    def cancel(self) -> None:
        self._cancel_event.set()

    def append_chunk(self, content: str) -> None:
        self._accumulated += content
        self._total_tokens += len(content.split())

    def set_model(self, model: str) -> None:
        self._model = model

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "subject": self.subject,
            "topic": self.topic,
            "elapsed": round(self.elapsed, 2),
            "total_tokens": self._total_tokens,
            "model": self._model,
            "created_at": self.created_at,
            "cancelled": self.is_cancelled,
        }


class StreamManager:
    """Manages all active generation streams with cancellation support."""

    def __init__(self):
        self._streams: Dict[str, ActiveStream] = {}
        self._lock = asyncio.Lock()

    async def create(
        self, subject: str, topic: str
    ) -> ActiveStream:
        engine_id = f"gen-{uuid.uuid4().hex[:12]}"
        stream = ActiveStream(engine_id, subject, topic)
        async with self._lock:
            self._streams[engine_id] = stream
        return stream

    async def get(self, engine_id: str) -> Optional[ActiveStream]:
        async with self._lock:
            return self._streams.get(engine_id)

    async def cancel(self, engine_id: str) -> bool:
        async with self._lock:
            stream = self._streams.get(engine_id)
            if stream:
                stream.cancel()
                return True
            return False

    async def remove(self, engine_id: str) -> None:
        async with self._lock:
            self._streams.pop(engine_id, None)

    async def list_active(self) -> list:
        async with self._lock:
            now = time.time()
            active = []
            for sid, s in list(self._streams.items()):
                if now - s.created_at > 300:
                    self._streams.pop(sid, None)
                else:
                    active.append(s.to_dict())
            return active

    async def stream_generate(
        self,
        provider: AIProvider,
        request: CompletionRequest,
        stream: ActiveStream,
        on_chunk: Optional[Callable[[str], Awaitable[None]]] = None,
        on_complete: Optional[Callable[[str], Awaitable[None]]] = None,
        on_error: Optional[Callable[[str], Awaitable[None]]] = None,
        max_retries: int = 2,
        timeout: float = 120.0,
    ) -> AsyncGenerator[str, None]:
        stream.set_model(request.model)
        retries = 0
        while retries <= max_retries:
            try:
                async for chunk in self._stream_with_timeout(
                    provider, request, stream, timeout
                ):
                    if stream.is_cancelled:
                        yield StreamEvent(
                            "cancelled",
                            {
                                "type": "cancelled",
                                "engine_id": stream.id,
                                "elapsed": stream.elapsed,
                            },
                        ).serialize()
                        return

                    if chunk.error:
                        yield StreamEvent(
                            "error",
                            {
                                "type": "error",
                                "content": chunk.error,
                                "engine_id": stream.id,
                            },
                        ).serialize()
                        if on_error:
                            await on_error(chunk.error)
                        return

                    if chunk.content:
                        stream.append_chunk(chunk.content)
                        yield StreamEvent(
                            "chunk",
                            {
                                "type": "chunk",
                                "content": chunk.content,
                                "engine_id": stream.id,
                            },
                        ).serialize()
                        if on_chunk:
                            await on_chunk(chunk.content)

                    if chunk.finish_reason:
                        done_data = {
                            "type": "done",
                            "engine_id": stream.id,
                            "finish_reason": chunk.finish_reason,
                            "elapsed": stream.elapsed,
                            "usage": chunk.usage or {},
                        }
                        yield StreamEvent("done", done_data).serialize()
                        if on_complete:
                            await on_complete(stream.accumulated)
                        return
                return

            except asyncio.TimeoutError:
                retries += 1
                if retries > max_retries:
                    yield StreamEvent(
                        "error",
                        {
                            "type": "error",
                            "content": "Request timed out after retries",
                            "engine_id": stream.id,
                        },
                    ).serialize()
                    if on_error:
                        await on_error("Request timed out after retries")
                    return
                yield StreamEvent(
                    "retry",
                    {
                        "type": "retry",
                        "attempt": retries,
                        "engine_id": stream.id,
                    },
                ).serialize()
                await asyncio.sleep(1 * retries)

            except Exception as e:
                retries += 1
                if retries > max_retries:
                    yield StreamEvent(
                        "error",
                        {
                            "type": "error",
                            "content": f"Failed after retries: {str(e)}",
                            "engine_id": stream.id,
                        },
                    ).serialize()
                    if on_error:
                        await on_error(f"Failed after retries: {str(e)}")
                    return
                yield StreamEvent(
                    "retry",
                    {
                        "type": "retry",
                        "attempt": retries,
                        "engine_id": stream.id,
                    },
                ).serialize()
                await asyncio.sleep(1 * retries)

    async def _stream_with_timeout(
        self,
        provider: AIProvider,
        request: CompletionRequest,
        stream: ActiveStream,
        timeout: float,
    ) -> AsyncGenerator[StreamChunk, None]:
        async for chunk in provider.complete_stream(request):
            yield chunk


stream_manager = StreamManager()
