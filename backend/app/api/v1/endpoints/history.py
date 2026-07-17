from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DBSession
from app.db.session import get_db
from app.schemas.history import (
    HistoryEntryCreate,
    HistoryEntryUpdate,
    HistoryEntryResponse,
    HistoryListResponse,
)
from app.services.history import HistoryService

from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


def get_service(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> HistoryService:
    return HistoryService(db, user_id=current_user.id)


@router.get("", response_model=HistoryListResponse)
def list_history(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: HistoryService = Depends(get_service),
):
    items, total = service.get_all(skip=skip, limit=limit, order_by="created_at", desc=True)
    return HistoryListResponse(items=items, total=total)


@router.get("/{id}", response_model=HistoryEntryResponse)
def get_history_entry(id: int, service: HistoryService = Depends(get_service)):
    entry = service.get(id)
    if not entry:
        from app.exceptions import NotFoundException
        raise NotFoundException("History entry", str(id))
    return entry


@router.post("", response_model=HistoryEntryResponse, status_code=201)
def create_history_entry(
    data: HistoryEntryCreate,
    service: HistoryService = Depends(get_service),
):
    return service.create(data)


@router.put("/{id}", response_model=HistoryEntryResponse)
def update_history_entry(
    id: int,
    data: HistoryEntryUpdate,
    service: HistoryService = Depends(get_service),
):
    entry = service.update(id, data)
    if not entry:
        from app.exceptions import NotFoundException
        raise NotFoundException("History entry", str(id))
    return entry


@router.delete("/{id}", status_code=204)
def delete_history_entry(id: int, service: HistoryService = Depends(get_service)):
    if not service.delete(id):
        from app.exceptions import NotFoundException
        raise NotFoundException("History entry", str(id))
