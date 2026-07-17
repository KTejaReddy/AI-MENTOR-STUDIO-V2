from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session as DBSession

from app.db.session import get_db
from app.schemas.api_key import (
    ApiKeyResponse,
    ApiKeyListResponse,
    ApiKeyUpdate,
    ApiKeyImportRequest,
    ApiKeyImportResult,
    ApiKeyTestResult,
)
from app.services.api_key import ApiKeyService

from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


def get_service(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> ApiKeyService:
    return ApiKeyService(db, user_id=current_user.id)


@router.get("/api-keys", response_model=ApiKeyListResponse)
def list_api_keys(
    service: ApiKeyService = Depends(get_service),
):
    items, total = service.list_keys()
    return ApiKeyListResponse(items=items, total=total)


@router.post("/api-keys/import", response_model=ApiKeyImportResult)
def import_api_keys(
    data: ApiKeyImportRequest,
    service: ApiKeyService = Depends(get_service),
):
    return service.import_keys(data.keys, data.provider)


@router.put("/api-keys/{key_id}", response_model=ApiKeyResponse)
def update_api_key(
    key_id: int,
    data: ApiKeyUpdate,
    service: ApiKeyService = Depends(get_service),
):
    result = service.update_key(key_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="API key not found")
    return result


@router.delete("/api-keys/{key_id}", status_code=204)
def delete_api_key(
    key_id: int,
    service: ApiKeyService = Depends(get_service),
):
    if not service.delete_key(key_id):
        raise HTTPException(status_code=404, detail="API key not found")


@router.post("/api-keys/test/{key_id}", response_model=ApiKeyTestResult)
def test_api_key(
    key_id: int,
    service: ApiKeyService = Depends(get_service),
):
    return service.test_key(key_id)


@router.post("/api-keys/sync")
def sync_key_status(
    service: ApiKeyService = Depends(get_service),
):
    service.sync_status_from_manager()
    return {"status": "synced"}
