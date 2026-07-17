from fastapi import APIRouter
from app.config import settings
from app.schemas.health import HealthResponse, ComponentStatus
from app.db.session import engine
from app.core.rate_limit import limiter
from app.ai.key_manager import key_manager as km
from sqlalchemy import inspect

router = APIRouter()


def _check_db() -> ComponentStatus:
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        return ComponentStatus(
            status="ok",
            detail=f"{len(tables)} tables ({', '.join(tables[:6])}{'...' if len(tables) > 6 else ''})",
        )
    except Exception as e:
        return ComponentStatus(status="error", detail=str(e))


def _check_google_oauth() -> ComponentStatus:
    if settings.google_client_id and settings.google_client_secret:
        return ComponentStatus(status="ok", detail="Google OAuth configured")
    return ComponentStatus(status="warning", detail="Not configured — email/password auth only")


def _check_jwt() -> ComponentStatus:
    if settings.jwt_secret and "development" not in settings.jwt_secret:
        return ComponentStatus(status="ok", detail="Custom JWT secret configured")
    return ComponentStatus(status="warning", detail="Using development fallback secret — replace for production")


def _check_cors() -> ComponentStatus:
    origins = settings.cors_origin_list
    return ComponentStatus(status="ok", detail=f"{len(origins)} origins: {', '.join(origins)}")


def _check_rate_limiter() -> ComponentStatus:
    return ComponentStatus(status="ok", detail="slowapi active")


def _check_ai_backend() -> ComponentStatus:
    total = len(km.keys)
    healthy = km.get_healthy_count()
    if healthy == 0 and total == 0:
        return ComponentStatus(status="warning", detail="No API keys configured — AI generation unavailable")
    if healthy == 0:
        return ComponentStatus(status="warning", detail=f"{total} key(s) configured, 0 healthy — check key validity")
    if healthy < total:
        return ComponentStatus(status="ok", detail=f"{healthy}/{total} keys healthy")
    return ComponentStatus(status="ok", detail=f"{healthy} keys healthy")


@router.get("/health", response_model=HealthResponse)
def health_check():
    db_status = _check_db()
    all_ok = all(
        s.status == "ok"
        for s in [db_status, _check_google_oauth(), _check_jwt(), _check_cors(), _check_rate_limiter(), _check_ai_backend()]
    )

    return HealthResponse(
        status="ok" if all_ok else "degraded",
        version=settings.app_version,
        app_name=settings.app_name,
        database=db_status,
        google_oauth=_check_google_oauth(),
        jwt=_check_jwt(),
        cors=_check_cors(),
        rate_limiter=_check_rate_limiter(),
        ai_backend=_check_ai_backend(),
    )
