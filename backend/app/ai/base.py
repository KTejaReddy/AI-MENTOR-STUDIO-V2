"""Core abstractions for the AI Gateway."""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional, Any, AsyncGenerator


@dataclass
class Message:
    role: str
    content: str


class ClientRequestError(RuntimeError):
    """Raised when the API returns a client error (400, 401, 403, 422)."""
    pass


class ContextLimitError(RuntimeError):
    """Raised when the API returns 413 or indicates context window exceeded."""
    pass


@dataclass
class CompletionRequest:
    messages: List[Message]
    model: str = ""
    temperature: float = 0.7
    max_tokens: int = 8192
    stream: bool = False
    extra: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "messages": [asdict(m) for m in self.messages],
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "stream": self.stream,
        }


@dataclass
class CompletionResponse:
    content: str
    model: str
    usage: Optional[Dict[str, int]] = None
    raw: Optional[Dict[str, Any]] = None


@dataclass
class StreamChunk:
    content: str
    finish_reason: Optional[str] = None
    usage: Optional[Dict[str, int]] = None
    error: Optional[str] = None


@dataclass
class ProviderHealth:
    name: str
    status: str  # healthy | degraded | down
    available_models: List[str]
    healthy_keys: int
    total_keys: int
    total_requests: int
    error_rate: float
    last_check: float
    avg_response_time_ms: float
    cooldown_keys: int
    failed_keys: int


class AIProvider(ABC):
    @abstractmethod
    async def complete(self, request: CompletionRequest) -> CompletionResponse:
        ...

    @abstractmethod
    async def complete_stream(
        self, request: CompletionRequest
    ) -> AsyncGenerator[StreamChunk, None]:
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @property
    @abstractmethod
    def available_models(self) -> List[str]:
        ...

    @property
    def requires_api_key(self) -> bool:
        return True

    async def close(self) -> None:
        pass
