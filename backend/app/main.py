from dotenv import load_dotenv
from pathlib import Path
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import JSONResponse
import logging
import asyncio

import sys
import io

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from app.config import settings
from app.logging_config import setup_logging
from app.db.session import init_db, SessionLocal
from app.api.v1.router import router as v1_router
from app.exceptions import AppException
from app.ai.groq_provider import GroqProvider, get_shared_client, close_shared_client
from app.ai.key_manager import key_manager
from app.ai.gateway import gateway

logger = logging.getLogger(__name__)


def load_keys_from_db():
    try:
        from app.services.api_key import ApiKeyService
        db = SessionLocal()
        try:
            service = ApiKeyService(db)
            count = service.load_keys_to_manager()
            total = len(key_manager.keys)
            healthy = key_manager.get_healthy_count()
            logger.info(
                f"DB key loading: {count} new, {total} total, {healthy} healthy, "
                f"{key_manager.get_failed_count()} failed, {key_manager.get_cooldown_count()} cooldown"
            )
            return total
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Could not load keys from database: {e}")
        return 0


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Async lifespan: startup → yield → shutdown."""
    # ── Startup ──────────────────────────────────────────────────────────────
    setup_logging(settings.log_level)
    async def init_services():
        # Yield to event loop to allow server to start accepting connections
        await asyncio.sleep(0.1)
        
        try:
            # Run blocking DB init in thread
            await asyncio.to_thread(init_db)

            # Initialize provider and gateway
            provider = GroqProvider(key_manager=key_manager)
            gateway.set_provider(provider)

            # Warm up shared HTTP connection pool
            _ = get_shared_client()
            logger.info("Shared HTTP client pool warmed up")

            env_count = len(key_manager.keys)
            db_count = await asyncio.to_thread(load_keys_from_db)
            total = len(key_manager.keys)
            healthy = key_manager.get_healthy_count()
            logger.info(
                f"AI Gateway initialized: {env_count} from env, {db_count} from DB, "
                f"{total} total, {healthy} healthy"
            )
            if healthy == 0:
                logger.warning("No healthy API keys available — AI generation will fail")

            # Start background key recovery task
            await key_manager.start_recovery_task()
            logger.info("Key recovery background task started")
        except Exception as e:
            logger.error(f"Error during background initialization: {e}")

    # Start initialization in background so health check responds immediately
    asyncio.create_task(init_services())

    yield

    # ── Shutdown ─────────────────────────────────────────────────────────────
    await close_shared_client()
    logger.info("Shared HTTP client closed")


from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.rate_limit import limiter

def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS must be outermost middleware ────────────────────────────────────
    # This ensures preflight OPTIONS requests are handled before any other
    # middleware (SlowAPI rate-limiting, security headers) can interfere.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With", "X-Request-ID"],
        expose_headers=["Content-Type", "Authorization", "X-Requested-With", "X-Request-ID"],
        max_age=600,
    )

    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(SessionMiddleware, secret_key=settings.jwt_secret)

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    app.include_router(v1_router)

    # Google OAuth callback at the exact path registered in Google Cloud Console
    from app.api.v1.endpoints.auth import google_callback
    app.add_api_route("/auth/google/callback", google_callback, methods=["GET"])

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.get("/")
    def root():
        return {"status": "ok", "service": "Mentor AI Studio", "version": "2"}

    @app.get("/health")
    def health():
        return {"status": "healthy"}

    @app.get("/metrics")
    def prometheus_metrics():
        from fastapi.responses import Response
        from app.ai.telemetry_dashboard import load_all_telemetry_records
        records = load_all_telemetry_records()
        
        requests_total = {}
        tokens_total = {}
        latency_total = {}
        failures_total = {}
        fallback_total = {}
        
        lesson_groups = {}
        
        for rec in records:
            mid = rec.get("selected_model", "unknown")
            if mid != "unknown":
                requests_total[mid] = requests_total.get(mid, 0) + 1
                tokens_total[mid] = tokens_total.get(mid, 0) + rec.get("total_tokens", 0)
                latency_total[mid] = latency_total.get(mid, 0.0) + rec.get("latency", 0.0)
                if not rec.get("success", True):
                    failures_total[mid] = failures_total.get(mid, 0) + 1
                if rec.get("fallback_count", 0) > 0:
                    fallback_total[mid] = fallback_total.get(mid, 0) + 1
            
            lid = rec.get("lesson_id")
            if lid:
                if lid not in lesson_groups:
                    lesson_groups[lid] = {
                        "start": rec.get("timestamp", 0),
                        "end": rec.get("timestamp", 0),
                        "editor_time": 0.0,
                        "reviewer_time": 0.0
                    }
                lg = lesson_groups[lid]
                lg["start"] = min(lg["start"], rec.get("timestamp", 9999999999))
                lg["end"] = max(lg["end"], rec.get("timestamp", 0))
                if rec.get("section") == "editor":
                    lg["editor_time"] = rec.get("editor_time", 0.0)
                if rec.get("section") == "reviewer":
                    lg["reviewer_time"] = rec.get("reviewer_time", 0.0)

        lines = []
        
        lines.append("# HELP model_requests_total Total requests sent per model.")
        lines.append("# TYPE model_requests_total counter")
        for mid, count in requests_total.items():
            lines.append(f'model_requests_total{{model="{mid}"}} {count}')
            
        lines.append("# HELP model_tokens_total Total tokens consumed per model.")
        lines.append("# TYPE model_tokens_total counter")
        for mid, tokens in tokens_total.items():
            lines.append(f'model_tokens_total{{model="{mid}"}} {tokens}')
            
        lines.append("# HELP model_latency_seconds Cumulative latency in seconds per model.")
        lines.append("# TYPE model_latency_seconds counter")
        for mid, latency in latency_total.items():
            lines.append(f'model_latency_seconds{{model="{mid}"}} {latency:.4f}')
            
        lines.append("# HELP model_failures_total Total generation failures per model.")
        lines.append("# TYPE model_failures_total counter")
        for mid, failures in failures_total.items():
            lines.append(f'model_failures_total{{model="{mid}"}} {failures}')
            
        lines.append("# HELP model_fallback_total Total fallbacks triggered per model.")
        lines.append("# TYPE model_fallback_total counter")
        for mid, fb in fallback_total.items():
            lines.append(f'model_fallback_total{{model="{mid}"}} {fb}')
            
        lines.append("# HELP lessons_generated_total Total engineering lessons generated.")
        lines.append("# TYPE lessons_generated_total counter")
        lines.append(f"lessons_generated_total {len(lesson_groups)}")
        
        lesson_latencies = []
        editor_latencies = []
        reviewer_latencies = []
        for lid, lg in lesson_groups.items():
            duration = lg["end"] - lg["start"]
            if duration > 0:
                lesson_latencies.append(duration)
            if lg["editor_time"] > 0:
                editor_latencies.append(lg["editor_time"])
            if lg["reviewer_time"] > 0:
                reviewer_latencies.append(lg["reviewer_time"])
                
        lines.append("# HELP lesson_generation_seconds Cumulative time spent generating lessons.")
        lines.append("# TYPE lesson_generation_seconds counter")
        lines.append(f"lesson_generation_seconds {sum(lesson_latencies):.4f}")
        
        lines.append("# HELP editor_duration_seconds Cumulative time spent on editorial polishing.")
        lines.append("# TYPE editor_duration_seconds counter")
        lines.append(f"editor_duration_seconds {sum(editor_latencies):.4f}")
        
        lines.append("# HELP reviewer_duration_seconds Cumulative time spent on content review.")
        lines.append("# TYPE reviewer_duration_seconds counter")
        lines.append(f"reviewer_duration_seconds {sum(reviewer_latencies):.4f}")
        
        return Response(content="\n".join(lines) + "\n", media_type="text/plain")

    return app


app = create_app()
