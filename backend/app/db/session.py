from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.compiler import compiles
from sqlalchemy import String
from typing import Generator
import os
import logging

from app.config import settings


# ── PostgreSQL compatibility: String() without length → TEXT ──────────────────
# SQLite ignores VARCHAR length; PostgreSQL requires a length or TEXT.
# This override maps any String() without an explicit length to TEXT on PG,
# keeping all SQLAlchemy models unchanged.
@compiles(String, "postgresql")
def _compile_string_no_length(element, compiler, **kw):
    if element.length is None:
        return "TEXT"
    return compiler.visit_VARCHAR(element, **kw)

from sqlalchemy.pool import NullPool

engine_kwargs = {"echo": False}
if "6543" in settings.database_url:
    engine_kwargs["poolclass"] = NullPool

engine = create_engine(
    settings.database_url,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.db.base import Base
    import app.models  # noqa: F401

    # Create local data directory for SQLite (no-op for PostgreSQL)
    if "sqlite" in settings.database_url:
        db_path = os.path.dirname(settings.database_url.replace("sqlite:///", ""))
        if db_path:
            os.makedirs(db_path, exist_ok=True)

    Base.metadata.create_all(bind=engine)
