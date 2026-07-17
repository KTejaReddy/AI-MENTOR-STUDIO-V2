import asyncio
import time
import httpx
import os

API_BASE = "http://127.0.0.1:8000/api/v1"

async def main():
    print("--- Benchmark Document Tutor Pipeline ---")
    
    # 1. Create a dummy document
    dummy_text = "This is a benchmark document. " * 500
    with open("benchmark_doc.txt", "w", encoding="utf-8") as f:
        f.write(dummy_text)
        
    # 2. Upload
    print("\n[1] Uploading document...")
    start_upload = time.time()
    async with httpx.AsyncClient() as client:
        with open("benchmark_doc.txt", "rb") as f:
            files = {"file": ("benchmark_doc.txt", f, "text/plain")}
            response = await client.post(f"{API_BASE}/document/upload", files=files)
            
    if response.status_code != 200:
        print(f"Upload failed: {response.text}")
        return
        
    doc_id = response.json()["document_id"]
    upload_time = time.time() - start_upload
    print(f"Upload completed in {upload_time:.2f}s")
    
    # 3. Analyze
    print("\n[2] Analyzing document (parsing, metadata, indexing)...")
    start_analyze = time.time()
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(f"{API_BASE}/document/{doc_id}/analyze", json={"document_id": doc_id})
        
    if response.status_code != 200:
        print(f"Analyze failed: {response.text}")
        return
        
    analyze_time = time.time() - start_analyze
    print(f"Analysis completed in {analyze_time:.2f}s")
    
    chapters = response.json().get("outline", {}).get("chapters", [])
    if not chapters:
        chapter_title = "Benchmark Chapter"
    else:
        chapter_title = chapters[0].get("title", "Benchmark Chapter")
        
    # 4. Generate Lesson (SSE)
    print(f"\n[3] Generating lesson for chapter: {chapter_title}...")
    start_gen = time.time()
    first_token_time = None
    first_section_time = None
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", f"{API_BASE}/document/{doc_id}/generate", json={"chapter_id": chapter_title, "difficulty": "intermediate"}) as r:
            async for line in r.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:]
                    import json
                    try:
                        event = json.loads(data_str)
                        if event["type"] == "section_chunk" and first_token_time is None:
                            first_token_time = time.time() - start_gen
                            print(f"  -> First token latency: {first_token_time:.2f}s")
                        elif event["type"] == "section_done" and first_section_time is None:
                            first_section_time = time.time() - start_gen
                            print(f"  -> First section completed: {first_section_time:.2f}s")
                        elif event["type"] == "done":
                            break
                    except:
                        pass
                        
    total_gen_time = time.time() - start_gen
    
    print("\n--- BENCHMARK RESULTS ---")
    print(f"Upload Time:             {upload_time:.2f}s")
    print(f"Analysis Time:           {analyze_time:.2f}s")
    print(f"First Token Latency:     {first_token_time:.2f}s" if first_token_time else "First Token Latency: N/A")
    print(f"First Section Latency:   {first_section_time:.2f}s" if first_section_time else "First Section Latency: N/A")
    print(f"Total Generation Time:   {total_gen_time:.2f}s")
    
    os.remove("benchmark_doc.txt")

if __name__ == "__main__":
    asyncio.run(main())
