"""Structured logging configuration for SquareUp Comms."""

import logging
import sys
from datetime import datetime, timezone

from app.core.config import settings


class StructuredFormatter(logging.Formatter):
    """JSON-like structured log formatter for production readability."""

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.now(timezone.utc).isoformat()
        level = record.levelname
        module = record.name
        message = record.getMessage()

        # Attach extras if present
        request_id = getattr(record, "request_id", "-")
        user_id = getattr(record, "user_id", "-")

        return (
            f'{{"ts":"{timestamp}","level":"{level}","module":"{module}",'
            f'"request_id":"{request_id}","user_id":"{user_id}",'
            f'"msg":"{message}"}}'
        )


def setup_logging() -> None:
    """Configure root logger with structured output."""
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())

    root = logging.getLogger()
    root.setLevel(level)

    # Clear existing handlers to avoid duplicates
    root.handlers.clear()
    root.addHandler(handler)

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Get a named logger."""
    return logging.getLogger(name)
