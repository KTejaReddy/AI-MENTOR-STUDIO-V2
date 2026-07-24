import json

def _parse_response(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    if raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    raw = raw.strip()
    
    try:
        data = json.loads(raw)
        if isinstance(data, dict) and "content" in data:
            data = data["content"]
        
        md_output = ""
        mcqs = data.get("mcq", [])
        return md_output.strip() if md_output else raw
    except Exception as e:
        print(f"Exception: {type(e).__name__} - {e}")
        return raw

try:
    print(_parse_response('{"content": "a string"}'))
except Exception as e:
    print(f"Crashed with {type(e).__name__}: {e}")
