"""Timezone utilities — centralised IST helpers for the app.

Usage:
    from app.core.timezone import now_ist, IST

    created_at = now_ist()          # timezone-aware datetime in IST
    naive_ist = now_ist_naive()     # naive datetime in IST (for DB columns)
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta

from app.core.config import settings

# Build timezone from IANA string — Python 3.9+ zoneinfo could be used,
# but a fixed UTC+5:30 offset is simpler and avoids zoneinfo dependency.
_IST_OFFSET = timedelta(hours=5, minutes=30)
IST = timezone(_IST_OFFSET, name="IST")


def now_ist() -> datetime:
    """Return the current time as a timezone-aware datetime in IST."""
    return datetime.now(tz=IST)


def now_ist_naive() -> datetime:
    """Return the current IST time as a naive datetime (no tzinfo).

    Use this for DB columns that store naive datetimes — the value
    represents IST wall-clock time, not UTC.
    """
    return datetime.now(tz=IST).replace(tzinfo=None)


def to_ist(dt: datetime) -> datetime:
    """Convert any datetime to IST.

    - If *dt* is naive, it is assumed to be UTC and converted.
    - If *dt* is aware, it is converted to IST directly.
    """
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST)


def to_ist_naive(dt: datetime) -> datetime:
    """Convert any datetime to a naive IST datetime (for DB storage)."""
    return to_ist(dt).replace(tzinfo=None)
