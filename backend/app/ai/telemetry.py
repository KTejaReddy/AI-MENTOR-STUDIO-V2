import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

try:
    import tiktoken
except ImportError:
    tiktoken = None
    logger.warning("tiktoken module not found. Tokenizer counting will be disabled.")

def count_tokens_tiktoken(text: str, model_name: str) -> int | None:
    """Accurately count tokens in text using tiktoken BPE tokenizer."""
    if tiktoken is None:
        return None
    if not text:
        return 0
    try:
        # Standard tiktoken mappings for openai models
        # For Llama and Qwen models, cl100k_base serves as a highly accurate BPE estimator.
        if "llama-3" in model_name or "llama3" in model_name:
            encoding = tiktoken.get_encoding("cl100k_base")
        elif "qwen" in model_name:
            encoding = tiktoken.get_encoding("cl100k_base")
        else:
            encoding = tiktoken.encoding_for_model(model_name)
    except Exception:
        # Graceful fallback to default cl100k_base
        encoding = tiktoken.get_encoding("cl100k_base")
    
    return len(encoding.encode(text))

def count_prompt_tokens(messages: List[Any], model_name: str) -> int | None:
    """Calculate total prompt tokens from a list of Messages/dicts."""
    if tiktoken is None:
        return None
    total_tokens = 0
    for msg in messages:
        # Accept both Message dataclass objects and dict payloads
        content = msg.content if hasattr(msg, 'content') else msg.get('content', '')
        role = msg.role if hasattr(msg, 'role') else msg.get('role', '')
        
        # Structure the message markers for exact BPE count
        msg_text = f"<|im_start|>{role}\n{content}<|im_end|>\n"
        total_tokens += count_tokens_tiktoken(msg_text, model_name) or 0
    total_tokens += 3  # Assistant response priming offset
    return total_tokens

def save_analytics_sync(data: dict):
    """Synchronous session write to SQLite/PostgreSQL."""
    from app.db.session import SessionLocal
    from app.models.ai_request_analytics import AiRequestAnalytics

    db = SessionLocal()
    try:
        now_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        
        # Ensure UTC timezone awareness/naive database consistency and defaults
        if "start_time" in data:
            if isinstance(data["start_time"], datetime):
                data["start_time"] = data["start_time"].astimezone(timezone.utc).replace(tzinfo=None) if data["start_time"].tzinfo else data["start_time"]
            else:
                data["start_time"] = now_utc
        else:
            data["start_time"] = now_utc
            
        if "end_time" in data:
            if isinstance(data["end_time"], datetime):
                data["end_time"] = data["end_time"].astimezone(timezone.utc).replace(tzinfo=None) if data["end_time"].tzinfo else data["end_time"]
            else:
                data["end_time"] = now_utc
        else:
            data["end_time"] = now_utc
            
        if "request_timestamp" in data:
            if isinstance(data["request_timestamp"], datetime):
                data["request_timestamp"] = data["request_timestamp"].astimezone(timezone.utc).replace(tzinfo=None) if data["request_timestamp"].tzinfo else data["request_timestamp"]
            else:
                data["request_timestamp"] = now_utc
        else:
            data["request_timestamp"] = now_utc

        record = AiRequestAnalytics(**data)
        db.add(record)
        db.commit()
    except Exception as e:
        logger.error(f"Error saving AI request analytics in background thread: {e}", exc_info=True)
    finally:
        db.close()

def log_ai_request_analytics(data: dict):
    """Offloads DB insert asynchronously to thread pool to prevent blocking main process thread."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(asyncio.to_thread(save_analytics_sync, data))
    except RuntimeError:
        # Fallback if event loop is not yet running (e.g. startup / standalone tests)
        import threading
        t = threading.Thread(target=save_analytics_sync, args=(data,))
        t.daemon = True
        t.start()

def save_section_telemetry_db(data: dict):
    """Saves section-level telemetry to the SQLite database."""
    from app.db.session import SessionLocal
    from app.models.ai_request_analytics import AiRequestAnalytics
    db = SessionLocal()
    try:
        record = AiRequestAnalytics(
            lesson_id=data.get("lesson_id"),
            section_name=data.get("section"),
            subject=data.get("subject"),
            topic=data.get("topic"),
            model_used=data.get("selected_model"),
            api_key_identifier=data.get("api_key_used"),
            latency_ms=(data.get("latency") or 0.0) * 1000.0,
            prompt_tokens=data.get("prompt_tokens", 0),
            completion_tokens=data.get("completion_tokens", 0),
            total_tokens=data.get("total_tokens", 0),
            retry_count=data.get("retries", 0),
            fallback_used=data.get("fallback_count", 0) > 0,
            success=data.get("success", True),
            quality_score=data.get("quality_score", 1.0)
        )
        db.add(record)
        db.commit()
    except Exception as e:
        logger.error(f"Error saving section telemetry to DB: {e}")
    finally:
        db.close()

def log_section_telemetry(data: dict):
    """Logs section-level telemetry to JSONL and SQLite DB."""
    import os
    import json
    try:
        log_dir = "backend/logs"
        os.makedirs(log_dir, exist_ok=True)
        log_file = os.path.join(log_dir, "section_telemetry.jsonl")
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(data) + "\n")
    except Exception as e:
        logger.error(f"Error saving section telemetry JSONL: {e}")

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(asyncio.to_thread(save_section_telemetry_db, data))
    except RuntimeError:
        import threading
        t = threading.Thread(target=save_section_telemetry_db, args=(data,))
        t.daemon = True
        t.start()

    # Trigger threshold alerts
    try:
        from app.ai.alerts import check_and_trigger_alerts
        check_and_trigger_alerts(data)
    except Exception as e:
        logger.error(f"Error checking alerts: {e}")


