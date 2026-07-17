"""
Auth schema migration: handles RefreshToken schema changes.

This script is called automatically by init_db() on startup.
It can also be run standalone: python -m scripts.migrate_auth

Migration operations:
  1. refresh_tokens: ADD COLUMN session_id if missing
"""

import logging
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import inspect, text
from app.db.session import engine
from app.db.base import Base

logger = logging.getLogger("migrate_auth")


def _table_exists(name: str) -> bool:
    return name in inspect(engine).get_table_names()


def _has_column(table: str, column: str) -> bool:
    if not _table_exists(table):
        return False
    cols = [c["name"] for c in inspect(engine).get_columns(table)]
    return column in cols


def migrate_refresh_tokens():
    """Add session_id column to refresh_tokens if missing."""
    if not _table_exists("refresh_tokens"):
        logger.info("refresh_tokens table does not exist yet — will be created by init_db")
        return

    if _has_column("refresh_tokens", "session_id"):
        logger.info("refresh_tokens already has session_id column — no migration needed")
        return

    logger.info("Adding session_id column to refresh_tokens...")

    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE refresh_tokens ADD COLUMN session_id VARCHAR"))
        conn.commit()

    logger.info("session_id column added to refresh_tokens")


def run_all():
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    logger.info("Starting auth schema migration...")

    migrate_refresh_tokens()

    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    logger.info("Auth schema migration complete")


if __name__ == "__main__":
    run_all()
