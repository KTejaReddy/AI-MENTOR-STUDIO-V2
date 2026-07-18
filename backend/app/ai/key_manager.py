"""
Key Manager — Thread-safe, round-robin, LRU key pool with async event-based waiting.
No busy-loops. All 10 keys used concurrently across parallel agents.
"""
import os
import time
import asyncio
import threading
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Set, Dict

logger = logging.getLogger(__name__)


class KeyStatus(Enum):
    HEALTHY = "healthy"
    FAILED = "failed"
    COOLDOWN = "cooldown"
    DISABLED = "disabled"


@dataclass
class ApiKey:
    key: str
    status: KeyStatus = KeyStatus.HEALTHY
    last_used: float = 0.0
    last_failure: float = 0.0
    requests: int = 0
    errors: int = 0
    in_flight: int = 0              # Concurrent requests using this key
    failed_at: Optional[float] = None
    cooldown_until: Optional[float] = None
    model_whitelist: List[str] = field(default_factory=list)

    @property
    def is_available(self) -> bool:
        now = time.time()
        if self.status == KeyStatus.DISABLED:
            return False
        if self.status == KeyStatus.HEALTHY:
            return True
        if self.status == KeyStatus.COOLDOWN:
            if self.cooldown_until and now >= self.cooldown_until:
                self.status = KeyStatus.HEALTHY
                self.cooldown_until = None
                return True
            return False
        if self.status == KeyStatus.FAILED:
            # Auto-recovery after 10 minutes
            if self.failed_at and (now - self.failed_at > 600):
                self.status = KeyStatus.HEALTHY
                self.failed_at = None
                self.errors = 0
                logger.info("Key auto-recovered from FAILED: %s...", self.key[:12])
                return True
            return False
        return False

    def record_use(self) -> None:
        self.last_used = time.time()
        self.requests += 1
        # in_flight is managed separately by acquire/release

    def mark_failed(self, cooldown_seconds: int = 300) -> None:
        self.status = KeyStatus.FAILED
        self.failed_at = time.time()
        self.errors += 1
        self.last_failure = time.time()

    def mark_cooldown(self, cooldown_seconds: int = 60) -> None:
        self.status = KeyStatus.COOLDOWN
        self.cooldown_until = time.time() + cooldown_seconds
        self.errors += 1
        self.last_failure = time.time()
        logger.info("Key COOLDOWN %ds: %s...", cooldown_seconds, self.key[:12])

    def reset(self) -> None:
        self.status = KeyStatus.HEALTHY
        self.failed_at = None
        self.cooldown_until = None


class KeyManager:
    """
    Manages a pool of API keys with:
    - LRU round-robin selection (least recently used first)
    - In-flight request tracking (avoid overloading one key)
    - Async event notification when keys become available
    - Automatic cooldown recovery
    - Thread-safe via threading.Lock
    """

    def __init__(self):
        self._keys: List[ApiKey] = []
        self._lock = threading.Lock()
        self._available_event = asyncio.Event()
        self._recovery_task: Optional[asyncio.Task] = None
        self._load_keys()

    def _load_keys(self) -> None:
        for i in range(1, 21):
            key_val = os.environ.get(f"GROQ_API_KEY_{i}")
            if key_val:
                self._keys.append(ApiKey(key=key_val))
        # Also check bare GROQ_API_KEY
        key_val = os.environ.get("GROQ_API_KEY")
        if key_val and not any(k.key == key_val for k in self._keys):
            self._keys.append(ApiKey(key=key_val))
        logger.info("KeyManager: loaded %d API keys", len(self._keys))

    @property
    def keys(self) -> List[ApiKey]:
        return list(self._keys)

    @property
    def healthy_keys(self) -> List[ApiKey]:
        return [k for k in self._keys if k.status == KeyStatus.HEALTHY]

    @property
    def available_keys(self) -> List[ApiKey]:
        return [k for k in self._keys if k.is_available]

    def get_available_key(
        self,
        preferred_model: str = "",
        exclude_keys: Optional[Set[str]] = None,
    ) -> Optional[ApiKey]:
        """
        Synchronous key acquisition — returns immediately.
        Selects the key with the fewest in-flight requests (LRU tiebreak).
        """
        exclude = exclude_keys or set()
        with self._lock:
            candidates = [
                k for k in self._keys
                if k.is_available
                and k.key not in exclude
                and (
                    not preferred_model
                    or not k.model_whitelist
                    or preferred_model in k.model_whitelist
                )
            ]
            if not candidates:
                return None
            # Sort: fewest in-flight first, then least recently used
            candidates.sort(key=lambda k: (k.in_flight, k.last_used))
            key = candidates[0]
            key.in_flight += 1
            return key

    async def acquire_key_async(
        self,
        model_id: str = "",
        exclude_keys: Optional[Set[str]] = None,
        timeout: float = 30.0,
    ) -> Optional["ApiKey"]:
        """
        Async key acquisition with event-based waiting.
        Waits up to `timeout` seconds for a key to become available.
        No busy-loop — uses asyncio.Event.
        """
        deadline = time.time() + timeout
        while time.time() < deadline:
            key = self.get_available_key(model_id, exclude_keys)
            if key:
                return key
            # Wait for notification that a key was released
            try:
                remaining = deadline - time.time()
                await asyncio.wait_for(self._wait_for_available(), timeout=min(5.0, remaining))
            except asyncio.TimeoutError:
                pass
        logger.warning("acquire_key_async: timed out after %.0fs (model=%s)", timeout, model_id)
        return None

    async def _wait_for_available(self) -> None:
        """Wait until a key becomes available using the shared event."""
        if not self._available_event.is_set():
            try:
                await asyncio.wait_for(self._available_event.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                pass
        self._available_event.clear()

    def release_key(self, key: "ApiKey", success: bool = True, latency: float = 0.0, error_type: str = "") -> None:
        """Release a key — decrement in-flight counter."""
        with self._lock:
            if key.in_flight > 0:
                key.in_flight -= 1
        # Notify waiting coroutines
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.call_soon_threadsafe(self._notify_available)
        except RuntimeError:
            pass

    def _notify_available(self) -> None:
        """Signal that a key has been released."""
        if not self._available_event.is_set():
            self._available_event.set()

    def add_key(self, key: str, model_whitelist: Optional[List[str]] = None) -> Optional[ApiKey]:
        existing = next((k for k in self._keys if k.key == key), None)
        if existing:
            return existing
        k = ApiKey(key=key, model_whitelist=model_whitelist or [])
        with self._lock:
            self._keys.append(k)
        return k

    def remove_key(self, key: str) -> bool:
        with self._lock:
            for i, k in enumerate(self._keys):
                if k.key == key:
                    self._keys.pop(i)
                    return True
        return False

    def get_healthy_count(self) -> int:
        return len(self.healthy_keys)

    def get_failed_count(self) -> int:
        return sum(1 for k in self._keys if k.status == KeyStatus.FAILED)

    def get_cooldown_count(self) -> int:
        return sum(1 for k in self._keys if k.status == KeyStatus.COOLDOWN)

    def get_total_requests(self) -> int:
        return sum(k.requests for k in self._keys)

    def get_total_errors(self) -> int:
        return sum(k.errors for k in self._keys)

    def health_summary(self) -> dict:
        return {
            "total": len(self._keys),
            "healthy": self.get_healthy_count(),
            "failed": self.get_failed_count(),
            "cooldown": self.get_cooldown_count(),
            "in_flight": sum(k.in_flight for k in self._keys),
            "total_requests": self.get_total_requests(),
            "total_errors": self.get_total_errors(),
            "keys": [
                {
                    "key_prefix": k.key[:12] + "...",
                    "status": k.status.value,
                    "requests": k.requests,
                    "errors": k.errors,
                    "in_flight": k.in_flight,
                    "last_used": round(time.time() - k.last_used, 1) if k.last_used else None,
                }
                for k in self._keys
            ],
        }

    def reset_failed_keys(self) -> int:
        count = 0
        with self._lock:
            for k in self._keys:
                if k.status in (KeyStatus.FAILED, KeyStatus.COOLDOWN):
                    k.reset()
                    count += 1
        return count

    async def start_recovery_task(self) -> None:
        """Start background task that recovers keys from cooldown."""
        if self._recovery_task and not self._recovery_task.done():
            return
        self._recovery_task = asyncio.create_task(self._cooldown_recovery_loop())
        logger.info("KeyManager: started cooldown recovery background task")

    async def _cooldown_recovery_loop(self) -> None:
        """Every 10s, recover any keys whose cooldown has expired."""
        while True:
            try:
                await asyncio.sleep(10)
                recovered = 0
                with self._lock:
                    for k in self._keys:
                        if k.status == KeyStatus.COOLDOWN:
                            # is_available does auto-recovery
                            if k.is_available:
                                recovered += 1
                        elif k.status == KeyStatus.FAILED:
                            if k.is_available:
                                recovered += 1
                if recovered:
                    logger.info("KeyManager: recovered %d keys from cooldown/failed", recovered)
                    self._notify_available()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("KeyManager recovery loop error: %s", e)


key_manager = KeyManager()
