import time
import logging
from datetime import datetime
from typing import List, Optional, Tuple

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.api_key import StoredApiKey
from app.schemas.api_key import ApiKeyResponse, ApiKeyUpdate, ApiKeyImportResult, ApiKeyTestResult
from app.repositories.api_key import ApiKeyRepository
from app.services.base import BaseService
from app.ai.key_manager import key_manager

logger = logging.getLogger(__name__)


def _mask_key(key: str) -> str:
    if len(key) <= 8:
        return key[:3] + "****" + key[-4:] if len(key) > 4 else "****"
    return key[:3] + "****" + key[-4:]


class ApiKeyService(BaseService[StoredApiKey, dict, ApiKeyUpdate, ApiKeyResponse]):
    def __init__(self, db: Session, user_id: str | None = None):
        super().__init__(ApiKeyRepository(db, user_id=user_id), ApiKeyResponse)

    def get_repo(self) -> ApiKeyRepository:
        return self.repository

    def list_keys(self) -> Tuple[List[ApiKeyResponse], int]:
        return self.get_all(order_by="created_at", desc=True)

    def update_key(self, key_id: int, data: ApiKeyUpdate) -> Optional[ApiKeyResponse]:
        record = self.repository.get(key_id)
        if not record:
            return None
        if data.is_enabled is not None:
            record.is_enabled = data.is_enabled
            record.status = "healthy" if data.is_enabled else "disabled"
            if not data.is_enabled:
                key_manager.remove_key(record.key_value)
            else:
                key_manager.add_key(record.key_value)
        if data.label is not None:
            record.label = data.label
        record.updated_at = datetime.utcnow()
        self.repository.db.commit()
        self.repository.db.refresh(record)
        return ApiKeyResponse.model_validate(record)

    def delete_key(self, key_id: int) -> bool:
        record = self.repository.get(key_id)
        if not record:
            return False
        key_manager.remove_key(record.key_value)
        return self.repository.delete(key_id)

    def import_keys(self, raw: str, provider: str = "groq") -> ApiKeyImportResult:
        lines = [line.strip() for line in raw.split("\n") if line.strip()]
        imported = 0
        failed = 0
        skipped = 0
        results = []

        for key_val in lines:
            existing = self.get_repo().get_by_key_value(key_val)
            if existing:
                skipped += 1
                results.append({"key": _mask_key(key_val), "status": "skipped", "message": "Already exists"})
                continue
            try:
                record = StoredApiKey(
                    key_value=key_val,
                    masked_key=_mask_key(key_val),
                    label=f"{provider.upper()} Key",
                    status="validating",
                    provider=provider,
                    is_enabled=True,
                    user_id=self.repository.user_id,
                )
                self.repository.db.add(record)
                self.repository.db.commit()
                self.repository.db.refresh(record)

                valid, msg, models = self._validate_key(key_val, provider)
                record.status = "healthy" if valid else "invalid"
                if not valid:
                    record.is_enabled = False
                    record.last_error_message = msg
                    failed += 1
                else:
                    imported += 1
                    key_manager.add_key(key_val)
                record.masked_key = _mask_key(key_val)
                self.repository.db.commit()
                results.append({"key": record.masked_key, "status": record.status, "message": msg})
            except Exception as e:
                failed += 1
                results.append({"key": _mask_key(key_val), "status": "error", "message": str(e)})
                logger.error(f"Failed to import key: {e}")

        return ApiKeyImportResult(imported=imported, failed=failed, skipped=skipped, results=results)

    def test_key(self, key_id: int) -> ApiKeyTestResult:
        record = self.repository.get(key_id)
        if not record:
            raise HTTPException(status_code=404, detail="Key not found")
        start = time.time()
        valid, msg, models = self._validate_key(record.key_value, record.provider)
        elapsed = (time.time() - start) * 1000
        if valid:
            record.status = "healthy"
            record.is_enabled = True
        else:
            record.status = "invalid"
            record.is_enabled = False
            record.last_error_message = msg
            record.last_error_at = datetime.utcnow()
        record.updated_at = datetime.utcnow()
        self.repository.db.commit()
        return ApiKeyTestResult(
            key_id=key_id,
            status=record.status,
            message=msg,
            models_accessible=models if models else [],
            latency_ms=round(elapsed, 1),
        )

    def _validate_key(self, key_value: str, provider: str = "groq") -> tuple:
        try:
            with httpx.Client(timeout=10.0) as client:
                headers = {
                    "Authorization": f"Bearer {key_value}",
                    "Content-Type": "application/json",
                }
                response = client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers=headers,
                )
                if response.status_code == 200:
                    data = response.json()
                    models = [m["id"] for m in data.get("data", [])]
                    accessible = [m for m in models if any(
                        ref in m for ref in [
                            "llama", "mixtral", "gemma", "deepseek",
                            "qwen", "nemotron",
                        ]
                    )]
                    return True, "Connected successfully", accessible[:5]
                elif response.status_code == 401:
                    return False, "Invalid API key (401 Unauthorized)", []
                elif response.status_code == 403:
                    return False, "API key lacks permission (403 Forbidden)", []
                else:
                    return False, f"Unexpected response: HTTP {response.status_code}", []
        except httpx.TimeoutException:
            return False, "Connection timed out", []
        except httpx.ConnectError:
            return False, "Could not connect to Groq API", []
        except Exception as e:
            return False, str(e), []

    def load_keys_to_manager(self) -> int:
        records = self.get_repo().get_enabled_keys()
        count = 0
        for r in records:
            if r.status == "healthy":
                key_manager.add_key(r.key_value)
                count += 1
        logger.info(f"Loaded {count} API keys from database into KeyManager")
        return count

    def sync_status_from_manager(self):
        from datetime import datetime
        for km_key in key_manager.keys:
            record = self.get_repo().get_by_key_value(km_key.key)
            if record:
                record.total_requests = km_key.requests
                record.total_errors = km_key.errors
                record.last_used_at = datetime.fromtimestamp(km_key.last_used) if km_key.last_used else None
                record.last_error_at = datetime.fromtimestamp(km_key.last_failure) if km_key.last_failure else None
        self.repository.db.commit()
