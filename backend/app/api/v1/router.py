from fastapi import APIRouter
from app.api.v1.endpoints import health, history, bookmarks, notes, settings, ai, api_keys, curriculum, document, compiler, auth, ops

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(health.router, tags=["health"])
router.include_router(history.router, prefix="/history", tags=["history"])
router.include_router(bookmarks.router, prefix="/bookmarks", tags=["bookmarks"])
router.include_router(notes.router, prefix="/notes", tags=["notes"])
router.include_router(api_keys.router, prefix="/settings", tags=["settings"])
router.include_router(settings.router, prefix="/settings", tags=["settings"])
router.include_router(ai.router, prefix="/ai", tags=["ai"])
router.include_router(curriculum.router, tags=["curriculum"])
router.include_router(document.router, prefix="/document", tags=["document"])
router.include_router(compiler.router, prefix="/compiler", tags=["compiler"])
router.include_router(ops.router, prefix="/ops", tags=["ops"])
