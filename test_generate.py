import asyncio
from app.ai.gateway import gateway
from app.ai.groq_provider import GroqProvider
from app.ai.key_manager import key_manager

async def test():
    provider = GroqProvider(key_manager=key_manager)
    gateway.set_provider(provider)
    
    count = 0
    async for event in gateway.generate('Python', 'Functions', 'beginner', 'quick'):
        count += 1
        print(f'Event {count}: {event.get("type", "unknown")}')
        if count > 5:
            break
    
    print(f'Total events: {count}')

asyncio.run(test())