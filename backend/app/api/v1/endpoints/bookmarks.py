from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session as DBSession
from app.db.session import get_db
from app.schemas.bookmark import (
    BookmarkCreate,
    BookmarkUpdate,
    BookmarkResponse,
    BookmarkListResponse,
)
from app.services.bookmark import BookmarkService

from app.core.dependencies import get_current_user
from app.models.user import User

router = APIRouter()


def get_service(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> BookmarkService:
    return BookmarkService(db, user_id=current_user.id)


@router.get("", response_model=BookmarkListResponse)
def list_bookmarks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    service: BookmarkService = Depends(get_service),
):
    items, total = service.get_all(skip=skip, limit=limit, order_by="created_at", desc=True)
    return BookmarkListResponse(items=items, total=total)


@router.get("/{id}", response_model=BookmarkResponse)
def get_bookmark(id: int, service: BookmarkService = Depends(get_service)):
    bookmark = service.get(id)
    if not bookmark:
        from app.exceptions import NotFoundException
        raise NotFoundException("Bookmark", str(id))
    return bookmark


@router.post("", response_model=BookmarkResponse, status_code=201)
def create_bookmark(data: BookmarkCreate, service: BookmarkService = Depends(get_service)):
    return service.create(data)


@router.put("/{id}", response_model=BookmarkResponse)
def update_bookmark(
    id: int,
    data: BookmarkUpdate,
    service: BookmarkService = Depends(get_service),
):
    bookmark = service.update(id, data)
    if not bookmark:
        from app.exceptions import NotFoundException
        raise NotFoundException("Bookmark", str(id))
    return bookmark


@router.delete("/{id}", status_code=204)
def delete_bookmark(id: int, service: BookmarkService = Depends(get_service)):
    if not service.delete(id):
        from app.exceptions import NotFoundException
        raise NotFoundException("Bookmark", str(id))
