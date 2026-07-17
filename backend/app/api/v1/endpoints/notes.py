from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DBSession
from app.db.session import get_db
from app.schemas.note import (
    NoteCreate,
    NoteUpdate,
    NoteResponse,
    NoteListResponse,
)
from app.services.note import NoteService

from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


def get_service(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> NoteService:
    return NoteService(db, user_id=current_user.id)


@router.get("", response_model=NoteListResponse)
def list_notes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: NoteService = Depends(get_service),
):
    items, total = service.get_all(skip=skip, limit=limit, order_by="created_at", desc=True)
    return NoteListResponse(items=items, total=total)


@router.get("/{id}", response_model=NoteResponse)
def get_note(id: int, service: NoteService = Depends(get_service)):
    note = service.get(id)
    if not note:
        from app.exceptions import NotFoundException
        raise NotFoundException("Note", str(id))
    return note


@router.post("", response_model=NoteResponse, status_code=201)
def create_note(data: NoteCreate, service: NoteService = Depends(get_service)):
    return service.create(data)


@router.put("/{id}", response_model=NoteResponse)
def update_note(
    id: int,
    data: NoteUpdate,
    service: NoteService = Depends(get_service),
):
    note = service.update(id, data)
    if not note:
        from app.exceptions import NotFoundException
        raise NotFoundException("Note", str(id))
    return note


@router.delete("/{id}", status_code=204)
def delete_note(id: int, service: NoteService = Depends(get_service)):
    if not service.delete(id):
        from app.exceptions import NotFoundException
        raise NotFoundException("Note", str(id))
