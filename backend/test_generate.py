import asyncio
import traceback
from app.ai.gateway import gateway
from app.ai.key_manager import key_manager

async def test():
    key_manager.reset_failed_keys()
    try:
        async for event in gateway.generate(
            subject="Python",
            topic="Variables",
        ):
            print(f"Event: {event.get('type')}")
            if event.get('type') == 'error':
                print(f"Error: {event.get('content')}")
    except Exception:
        traceback.print_exc()

asyncio.run(test())