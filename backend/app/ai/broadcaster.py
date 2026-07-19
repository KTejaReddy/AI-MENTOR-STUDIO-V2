import asyncio
import logging
from typing import Set, Dict, Any

logger = logging.getLogger(__name__)

class OpsBroadcaster:
    """Thread-safe, simple in-memory broadcaster to relay live lesson generation telemetry to admin clients."""
    
    def __init__(self):
        self._listeners: Set[asyncio.Queue] = set()

    def register(self, queue: asyncio.Queue) -> None:
        """Register a new SSE stream queue listener."""
        self._listeners.add(queue)
        logger.debug(f"OpsBroadcaster: Registered listener. Total: {len(self._listeners)}")

    def unregister(self, queue: asyncio.Queue) -> None:
        """Unregister an SSE stream queue listener when client disconnects."""
        self._listeners.discard(queue)
        logger.debug(f"OpsBroadcaster: Unregistered listener. Total: {len(self._listeners)}")

    def broadcast(self, event: Dict[str, Any]) -> None:
        """Push an operational update event to all active listener queues."""
        if not self._listeners:
            return
        
        logger.debug(f"OpsBroadcaster: Broadcasting event '{event.get('type')}' to {len(self._listeners)} listeners.")
        for q in list(self._listeners):
            try:
                q.put_nowait(event)
            except Exception as e:
                logger.error(f"OpsBroadcaster: Failed pushing event to queue: {e}")

# Global singleton instance
ops_broadcaster = OpsBroadcaster()
