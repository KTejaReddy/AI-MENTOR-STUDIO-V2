import time
import threading
import logging
from typing import Dict, Tuple, Optional

logger = logging.getLogger(__name__)

class HealthCache:
    """
    Unified in-memory health cache for API Keys, Models, and Key+Model pairs.
    Tracks rate limit cooldowns and latencies to prevent unnecessary probing of failed endpoints.
    """
    def __init__(self):
        self._lock = threading.Lock()
        
        # key_prefix -> cooldown_until
        self._key_cooldowns: Dict[str, float] = {}
        
        # model_id -> cooldown_until
        self._model_cooldowns: Dict[str, float] = {}
        
        # (key_prefix, model_id) -> cooldown_until
        self._pair_cooldowns: Dict[Tuple[str, str], float] = {}
        
        # Telemetry
        self.cooldown_skips: int = 0
        self.cache_hits: int = 0

    def mark_key_cooldown(self, key_prefix: str, duration_sec: int = 60):
        with self._lock:
            self._key_cooldowns[key_prefix] = time.time() + duration_sec
            logger.info(f"[HealthCache] Key {key_prefix} on cooldown for {duration_sec}s")

    def mark_model_cooldown(self, model_id: str, duration_sec: int = 60):
        with self._lock:
            self._model_cooldowns[model_id] = time.time() + duration_sec
            logger.warning(f"[HealthCache] Model {model_id} on cooldown for {duration_sec}s")

    def mark_pair_cooldown(self, key_prefix: str, model_id: str, duration_sec: int = 60):
        with self._lock:
            self._pair_cooldowns[(key_prefix, model_id)] = time.time() + duration_sec
            logger.info(f"[HealthCache] Pair ({key_prefix}, {model_id}) on cooldown for {duration_sec}s")

    def is_key_healthy(self, key_prefix: str) -> bool:
        with self._lock:
            cooldown_until = self._key_cooldowns.get(key_prefix, 0)
            if time.time() < cooldown_until:
                self.cooldown_skips += 1
                return False
            return True

    def is_model_healthy(self, model_id: str) -> bool:
        with self._lock:
            cooldown_until = self._model_cooldowns.get(model_id, 0)
            if time.time() < cooldown_until:
                self.cooldown_skips += 1
                return False
            return True

    def is_pair_healthy(self, key_prefix: str, model_id: str) -> bool:
        with self._lock:
            cooldown_until = self._pair_cooldowns.get((key_prefix, model_id), 0)
            if time.time() < cooldown_until:
                self.cooldown_skips += 1
                return False
            return True

    def is_fully_healthy(self, key_prefix: str, model_id: str) -> bool:
        """Checks Key, Model, and Pair health instantly."""
        return self.is_key_healthy(key_prefix) and \
               self.is_model_healthy(model_id) and \
               self.is_pair_healthy(key_prefix, model_id)

    def recover_expired(self) -> int:
        """Background maintenance: clean up expired cooldowns."""
        recovered = 0
        now = time.time()
        with self._lock:
            for k in list(self._key_cooldowns.keys()):
                if now >= self._key_cooldowns[k]:
                    del self._key_cooldowns[k]
                    recovered += 1
            for m in list(self._model_cooldowns.keys()):
                if now >= self._model_cooldowns[m]:
                    del self._model_cooldowns[m]
                    recovered += 1
            for p in list(self._pair_cooldowns.keys()):
                if now >= self._pair_cooldowns[p]:
                    del self._pair_cooldowns[p]
                    recovered += 1
        return recovered

    def get_skips(self) -> int:
        with self._lock:
            return self.cooldown_skips

health_cache = HealthCache()
