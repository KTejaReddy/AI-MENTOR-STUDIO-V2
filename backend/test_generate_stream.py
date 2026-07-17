import asyncio
import httpx
import json
import sys

async def main():
    url = "http://localhost:8000/api/v1/ai/generate"
    payload = {
        "branch": "Computer Science",
        "subject": "Data Structures",
        "topic": "Hash Tables",
        "difficulty": "intermediate",
        "learning_mode": "default"
    }
    
    print("Sending request to:", url)
    try:
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", url, json=payload, timeout=60.0) as response:
                if response.status_code != 200:
                    print(f"Error: {response.status_code}")
                    content = await response.aread()
                    print(content.decode())
                    return
                
                print("Streaming response:")
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[len("data: "):]
                        if data_str == "[DONE]":
                            print("\n[DONE]")
                            break
                        try:
                            data = json.loads(data_str)
                            print(f"\n--- Section: {data.get('type')} ---")
                            print(data.get('content', '')[:100] + "...") # truncate for console
                        except json.JSONDecodeError:
                            print(f"Raw data: {data_str}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(main())
