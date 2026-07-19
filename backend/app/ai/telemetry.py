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
        # Ensure UTC timezone awareness/naive database consistency
        if "start_time" in data and isinstance(data["start_time"], datetime) and data["start_time"].tzinfo is not None:
            data["start_time"] = data["start_time"].astimezone(timezone.utc).replace(tzinfo=None)
        if "end_time" in data and isinstance(data["end_time"], datetime) and data["end_time"].tzinfo is not None:
            data["end_time"] = data["end_time"].astimezone(timezone.utc).replace(tzinfo=None)
        if "request_timestamp" in data and isinstance(data["request_timestamp"], datetime) and data["request_timestamp"].tzinfo is not None:
            data["request_timestamp"] = data["request_timestamp"].astimezone(timezone.utc).replace(tzinfo=None)

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
