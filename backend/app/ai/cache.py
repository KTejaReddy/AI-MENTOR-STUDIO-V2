import time
import hashlib
import json
from typing import Dict, Any, Optional, Tuple


class LessonCache:
    def __init__(self, ttl_seconds: int = 3600, max_entries: int = 500):
        self._cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
        self._ttl = ttl_seconds
        self._max_entries = max_entries

    def _make_key(self, subject: str, topic: str, difficulty: str, mode: str) -> str:
        raw = f"{subject.lower().strip()}|{topic.lower().strip()}|{difficulty.lower().strip()}|{mode.lower().strip()}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, subject: str, topic: str, difficulty: str, mode: str) -> Optional[Dict[str, Any]]:
        key = self._make_key(subject, topic, difficulty, mode)
        entry = self._cache.get(key)
        if not entry:
            return None
        timestamp, data = entry
        if time.time() - timestamp > self._ttl:
            del self._cache[key]
            return None
        return data

    def set(self, subject: str, topic: str, difficulty: str, mode: str, data: Dict[str, Any]) -> None:
        key = self._make_key(subject, topic, difficulty, mode)
        if len(self._cache) >= self._max_entries:
            oldest = min(self._cache.items(), key=lambda x: x[1][0])
            del self._cache[oldest[0]]
        self._cache[key] = (time.time(), data)

    def invalidate(self, subject: str, topic: str, difficulty: str, mode: str) -> bool:
        key = self._make_key(subject, topic, difficulty, mode)
        if key in self._cache:
            del self._cache[key]
            return True
        return False

    def clear(self) -> int:
        count = len(self._cache)
        self._cache.clear()
        return count

    def size(self) -> int:
        return len(self._cache)

    def stats(self) -> dict:
        return {
            "size": len(self._cache),
            "max_entries": self._max_entries,
            "ttl_seconds": self._ttl,
        }


lesson_cache = LessonCache()
