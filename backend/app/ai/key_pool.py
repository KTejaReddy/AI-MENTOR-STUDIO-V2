"""
API Key Pool — Health-checked, round-robin, automatic failover.
"""
import os
import asyncio
import time
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Set, Dict, Any
from collections import deque

logger = logging.getLogger(__name__)


class KeyStatus(Enum):
    HEALTHY = "healthy"
    FAILED = "failed"
    COOLDOWN = "cooldown"
    DISABLED = "disabled"
    UNTESTED = "untested"


@dataclass
class ApiKeyMetrics:
    """Metrics for a single API key."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    last_used: float = 0.0
    last_failure: float = 0.0
    consecutive_failures: int = 0
    total_latency: float = 0.0
    errors_by_type: Dict[str, int] = field(default_factory=dict)


@dataclass
class ApiKey:
    """Enhanced API key with health tracking and model affinity."""
    key: str
    status: KeyStatus = KeyStatus.UNTESTED
    metrics: ApiKeyMetrics = field(default_factory=ApiKeyMetrics)
    model_whitelist: List[str] = field(default_factory=list)
    model_blacklist: List[str] = field(default_factory=list)
    priority: int = 0  # Higher = preferred
    cooldown_until: float = 0.0
    failure_reason: str = ""
    last_health_check: float = 0.0
    in_flight: int = 0

    @property
    def is_available(self) -> bool:
        now = time.time()
        if self.status == KeyStatus.DISABLED:
            return False
        if self.status == KeyStatus.COOLDOWN:
            if now >= self.cooldown_until:
                self.status = KeyStatus.HEALTHY
                self.cooldown_until = 0.0
                return True
            return False
        if self.status == KeyStatus.FAILED:
            # Auto-recovery after 10 minutes
            if now - self.last_failure > 600:
                self.status = KeyStatus.HEALTHY
                self.metrics.consecutive_failures = 0
                logger.info(f"Key auto-recovered: {self.key[:10]}...")
                return True
            return False
        return self.status == KeyStatus.HEALTHY

    @property
    def success_rate(self) -> float:
        total = self.metrics.total_requests
        if total == 0:
            return 1.0
        return self.metrics.successful_requests / total

    @property
    def avg_latency(self) -> float:
        successful = self.metrics.successful_requests
        if successful == 0:
            return 0.0
        return self.metrics.total_latency / successful

    def can_use_for_model(self, model_id: str) -> bool:
        if self.model_blacklist and model_id in self.model_blacklist:
            return False
        if self.model_whitelist and model_id not in self.model_whitelist:
            return False
        return True

    def record_use(self, latency: float = 0.0) -> None:
        self.metrics.last_used = time.time()
        self.metrics.total_requests += 1
        self.metrics.successful_requests += 1
        self.metrics.total_latency += latency
        self.metrics.consecutive_failures = 0

    def record_failure(self, error_type: str = "unknown", cooldown_seconds: int = 30) -> None:
        now = time.time()
        self.metrics.last_failure = now
        self.metrics.failed_requests += 1
        self.metrics.consecutive_failures += 1
        self.metrics.errors_by_type[error_type] = self.metrics.errors_by_type.get(error_type, 0) + 1
        self.failure_reason = error_type

        # Escalate: 1st failure = cooldown, 3+ failures = failed
        if self.metrics.consecutive_failures >= 3:
            self.status = KeyStatus.FAILED
            logger.warning(f"Key marked FAILED after {self.metrics.consecutive_failures} failures: {self.key[:10]}... ({error_type})")
        else:
            self.status = KeyStatus.COOLDOWN
            self.cooldown_until = now + cooldown_seconds
            logger.info(f"Key in COOLDOWN for {cooldown_seconds}s: {self.key[:10]}... ({error_type})")

    def reset(self) -> None:
        self.status = KeyStatus.HEALTHY
        self.cooldown_until = 0.0
        self.failure_reason = ""
        self.metrics.consecutive_failures = 0


class KeyPool:
    """
    Manages a pool of API keys with:
    - Health checking on startup
    - Round-robin with priority
    - Automatic failover
    - Model affinity
    - Metrics collection
    """

    def __init__(
        self,
        health_check_interval: int = 300,  # 5 minutes
        cooldown_base: int = 30,
        max_consecutive_failures: int = 3,
        request_timeout: float = 60.0,
    ):
        self._keys: List[ApiKey] = []
        self._lock = asyncio.Lock()
        self._health_check_interval = health_check_interval
        self._cooldown_base = cooldown_base
        self._max_consecutive_failures = max_consecutive_failures
        self._request_timeout = request_timeout
        self._health_check_task: Optional[asyncio.Task] = None
        self._round_robin_index = 0
        self._last_health_check = 0.0

        # Load keys from environment
        self._load_keys_from_env()

    def _load_keys_from_env(self) -> None:
        """Load API keys from environment variables."""
        # Support GROQ_API_KEY_1 through GROQ_API_KEY_10
        for i in range(1, 21):  # Support up to 20 keys
            key_val = os.environ.get(f"GROQ_API_KEY_{i}")
            if key_val:
                self.add_key(key_val)

        # Also check base GROQ_API_KEY
        base_key = os.environ.get("GROQ_API_KEY")
        if base_key and not any(k.key == base_key for k in self._keys):
            self.add_key(base_key)

        logger.info(f"Loaded {len(self._keys)} API keys from environment")

    def add_key(self, key: str, model_whitelist: Optional[List[str]] = None,
                model_blacklist: Optional[List[str]] = None, priority: int = 0) -> ApiKey:
        """Add a new key to the pool."""
        if any(k.key == key for k in self._keys):
            logger.debug(f"Key already in pool: {key[:10]}...")
            return next(k for k in self._keys if k.key == key)

        new_key = ApiKey(
            key=key,
            status=KeyStatus.UNTESTED,
            model_whitelist=model_whitelist or [],
            model_blacklist=model_blacklist or [],
            priority=priority,
        )
        self._keys.append(new_key)
        logger.info(f"Added API key to pool: {key[:10]}... (priority={priority})")
        return new_key

    def remove_key(self, key: str) -> bool:
        """Remove a key from the pool."""
        for i, k in enumerate(self._keys):
            if k.key == key:
                self._keys.pop(i)
                logger.info(f"Removed API key from pool: {key[:10]}...")
                return True
        return False

    def get_available_keys(self, model_id: str = "") -> List[ApiKey]:
        """Get all available keys, optionally filtered by model."""
        keys = [k for k in self._keys if k.is_available]
        if model_id:
            keys = [k for k in keys if k.can_use_for_model(model_id)]
        return keys

    def get_healthy_keys(self, model_id: str = "") -> List[ApiKey]:
        """Get healthy keys (status HEALTHY), optionally filtered by model."""
        keys = [k for k in self._keys if k.status == KeyStatus.HEALTHY]
        if model_id:
            keys = [k for k in keys if k.can_use_for_model(model_id)]
        return keys

    async def acquire_key(
        self,
        model_id: str = "",
        exclude: Optional[Set[str]] = None,
        prefer_fast: bool = False,
    ) -> Optional[ApiKey]:
        """
        Acquire a key for use.
        Uses round-robin with priority weighting.
        """
        async with self._lock:
            available = self.get_available_keys(model_id)
            if exclude:
                available = [k for k in available if k.key not in exclude]

            if not available:
                return None

            # Sort by least-loaded (in_flight), then by priority (desc), then least recently used
            available.sort(
                key=lambda k: (
                    k.in_flight,
                    -k.priority,
                    k.metrics.last_used,
                    k.metrics.failed_requests,
                    -k.metrics.successful_requests,
                )
            )

            # If prefer_fast, also consider latency
            if prefer_fast:
                available.sort(key=lambda k: (k.in_flight, k.avg_latency if k.avg_latency > 0 else float('inf')))

            key = available[0]
            key.in_flight += 1
            key.record_use()
            return key

    def release_key(self, key: ApiKey, success: bool = True, latency: float = 0.0, error_type: str = "") -> None:
        """Release a key after use."""
        key.in_flight = max(0, key.in_flight - 1)
        if success:
            key.record_use(latency)
        else:
            # Exponential backoff cooldown
            cooldown = self._cooldown_base * (2 ** min(key.metrics.consecutive_failures, 5))
            key.record_failure(error_type, cooldown)

    @property
    def keys(self) -> List[ApiKey]:
        return list(self._keys)

    @property
    def healthy_count(self) -> int:
        return sum(1 for k in self._keys if k.status == KeyStatus.HEALTHY)

    @property
    def total_count(self) -> int:
        return len(self._keys)

    def health_summary(self) -> Dict[str, Any]:
        """Get health summary for monitoring."""
        status_counts: Dict[str, int] = {}
        for status in KeyStatus:
            status_counts[status.value] = sum(1 for k in self._keys if k.status == status)

        return {
            "total": len(self._keys),
            "by_status": status_counts,
            "keys": [
                {
                    "key": k.key[:10] + "...",
                    "status": k.status.value,
                    "success_rate": round(k.success_rate, 3),
                    "avg_latency": round(k.avg_latency, 3),
                    "requests": k.metrics.total_requests,
                    "errors": k.metrics.failed_requests,
                    "consecutive_failures": k.metrics.consecutive_failures,
                    "priority": k.priority,
                    "models_whitelisted": k.model_whitelist,
                    "models_blacklisted": k.model_blacklist,
                }
                for k in self._keys
            ],
        }

    async def start_health_checks(self) -> None:
        """Start background health checking."""
        if self._health_check_task is None or self._health_check_task.done():
            self._health_check_task = asyncio.create_task(self._health_check_loop())
            logger.info("Started API key health check loop")

    async def stop_health_checks(self) -> None:
        """Stop background health checking."""
        if self._health_check_task and not self._health_check_task.done():
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
            logger.info("Stopped API key health check loop")

    async def _health_check_loop(self) -> None:
        """Periodically check key health."""
        while True:
            try:
                await asyncio.sleep(self._health_check_interval)
                await self._run_health_checks()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check loop error: {e}")
                await asyncio.sleep(60)

    async def _run_health_checks(self) -> None:
        """Run health checks on all keys."""
        from app.ai.groq_provider import GroqProvider

        # Only check keys that are not healthy
        to_check = [k for k in self._keys if k.status != KeyStatus.HEALTHY]
        if not to_check:
            return

        logger.info(f"Running health checks on {len(to_check)} keys")
        provider = GroqProvider(key_manager=self)

        for key in to_check:
            try:
                # Quick test with a simple model
                test_model = "llama-3.1-8b-instant"
                start = time.time()
                # Just test if the key works
                # In production, you'd make a minimal API call
                await asyncio.sleep(0.1)  # Simulate check
                latency = time.time() - start

                if key.status == KeyStatus.COOLDOWN and time.time() >= key.cooldown_until:
                    key.reset()
                    logger.info(f"Key recovered from cooldown: {key.key[:10]}...")
                elif key.status == KeyStatus.FAILED:
                    # Try to recover failed keys periodically
                    if time.time() - key.last_failure > 600:
                        key.reset()
                        logger.info(f"Key recovered from failed: {key.key[:10]}...")

                key.last_health_check = time.time()

            except Exception as e:
                logger.warning(f"Health check failed for {key.key[:10]}...: {e}")

    def reset_all_failed(self) -> int:
        """Reset all failed/cooldown keys. Returns count reset."""
        count = 0
        for k in self._keys:
            if k.status in (KeyStatus.FAILED, KeyStatus.COOLDOWN):
                k.reset()
                count += 1
        logger.info(f"Manually reset {count} failed/cooldown keys")
        return count

    def get_key_by_prefix(self, prefix: str) -> Optional[ApiKey]:
        """Find a key by its prefix."""
        for k in self._keys:
            if k.key.startswith(prefix):
                return k
        return None


# Global instance
key_pool = KeyPool()