"""Embedding service — Gemini text-embedding-004 (free tier) with pgvector storage.

Provides:
- embed_text / embed_texts: Generate embeddings via Gemini API
- embed_message / embed_crm_note: Embed a specific DB record
- embed_message_background: Fire-and-forget embedding after message save
- vector_search_messages / vector_search_crm_notes: Cosine similarity search
- backfill_embeddings: Embed all existing records without embeddings
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from sqlalchemy import text as sa_text

from app.core.config import settings
from app.core.db import async_session, db_url

logger = logging.getLogger(__name__)

# ── Constants ────────────────────────────────────────────────────────────────

_DIMENSIONS = settings.EMBEDDING_DIMENSIONS  # 768
_MODEL = settings.EMBEDDING_MODEL  # text-embedding-004
_BATCH_SIZE = 100  # Gemini allows up to 2048 texts per request; 100 is safe

# Cache the Gemini client (module-level singleton, created lazily)
_client: object | None = None


def _is_pgvector_available() -> bool:
    """True when the database is PostgreSQL (pgvector requires it)."""
    return "postgresql" in db_url


def _get_client():
    """Lazily create the Gemini genai client."""
    global _client
    if _client is None:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is required for embeddings")
        from google import genai

        _client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options={"timeout": 30_000},
        )
    return _client


# ── Core embedding functions ─────────────────────────────────────────────────


async def embed_text(text: str) -> list[float]:
    """Embed a single text string, returning a 768-dim float vector."""
    result = await embed_texts([text])
    return result[0]


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts, returning a list of 768-dim float vectors.

    Empty/whitespace-only strings are returned as zero vectors.
    """
    if not texts:
        return []

    client = _get_client()

    # Filter out empty strings — Gemini rejects them
    indexed_valid: list[tuple[int, str]] = []
    for i, t in enumerate(texts):
        stripped = t.strip() if t else ""
        if stripped:
            indexed_valid.append((i, stripped))

    # Pre-allocate result with zero vectors for empty inputs
    result: list[list[float]] = [[0.0] * _DIMENSIONS for _ in texts]

    if not indexed_valid:
        return result

    # Process in batches
    for batch_start in range(0, len(indexed_valid), _BATCH_SIZE):
        batch = indexed_valid[batch_start : batch_start + _BATCH_SIZE]
        batch_texts = [t for _, t in batch]

        try:
            response = await client.aio.models.embed_content(
                model=_MODEL,
                contents=batch_texts,
            )
            for (orig_idx, _), embedding in zip(batch, response.embeddings):
                result[orig_idx] = list(embedding.values)
        except Exception:
            logger.exception("Gemini embedding API call failed for batch starting at %d", batch_start)
            # Leave zero vectors for failed batches

    return result


# ── Record-level embedding helpers ───────────────────────────────────────────


async def embed_message(message_id: str) -> bool:
    """Embed a single message by ID. Returns True on success."""
    if not _is_pgvector_available():
        return False

    async with async_session() as session:
        row = (
            await session.execute(
                sa_text("SELECT content FROM messages WHERE id = :id"),
                {"id": message_id},
            )
        ).first()

        if not row or not row[0]:
            return False

        try:
            vec = await embed_text(row[0])
        except Exception:
            logger.exception("Failed to embed message %s", message_id)
            return False

        await session.execute(
            sa_text("UPDATE messages SET embedding = :vec WHERE id = :id"),
            {"vec": str(vec), "id": message_id},
        )
        await session.commit()
        return True


async def embed_crm_note(note_id: str) -> bool:
    """Embed a single CRM note by ID. Returns True on success."""
    if not _is_pgvector_available():
        return False

    async with async_session() as session:
        row = (
            await session.execute(
                sa_text("SELECT content FROM crm_notes WHERE id = :id"),
                {"id": note_id},
            )
        ).first()

        if not row or not row[0]:
            return False

        try:
            vec = await embed_text(row[0])
        except Exception:
            logger.exception("Failed to embed CRM note %s", note_id)
            return False

        await session.execute(
            sa_text("UPDATE crm_notes SET embedding = :vec WHERE id = :id"),
            {"vec": str(vec), "id": note_id},
        )
        await session.commit()
        return True


async def embed_crm_contact(contact_id: str) -> bool:
    """Embed a CRM contact by combining name, email, company, title, notes, and AI summary."""
    if not _is_pgvector_available():
        return False

    async with async_session() as session:
        row = (
            await session.execute(
                sa_text(
                    "SELECT name, email, company, title, notes, ai_summary "
                    "FROM crm_contacts WHERE id = :id"
                ),
                {"id": contact_id},
            )
        ).first()

        if not row:
            return False

        # Combine searchable fields into one text
        parts = [p for p in row if p]
        text = " | ".join(parts)
        if not text.strip():
            return False

        try:
            vec = await embed_text(text)
        except Exception:
            logger.exception("Failed to embed CRM contact %s", contact_id)
            return False

        await session.execute(
            sa_text("UPDATE crm_contacts SET embedding = :vec WHERE id = :id"),
            {"vec": str(vec), "id": contact_id},
        )
        await session.commit()
        return True


async def embed_crm_company(company_id: str) -> bool:
    """Embed a CRM company by combining name, domain, industry, description."""
    if not _is_pgvector_available():
        return False

    async with async_session() as session:
        row = (
            await session.execute(
                sa_text(
                    "SELECT name, domain, industry, description "
                    "FROM crm_companies WHERE id = :id"
                ),
                {"id": company_id},
            )
        ).first()

        if not row:
            return False

        parts = [p for p in row if p]
        text = " | ".join(parts)
        if not text.strip():
            return False

        try:
            vec = await embed_text(text)
        except Exception:
            logger.exception("Failed to embed CRM company %s", company_id)
            return False

        await session.execute(
            sa_text("UPDATE crm_companies SET embedding = :vec WHERE id = :id"),
            {"vec": str(vec), "id": company_id},
        )
        await session.commit()
        return True


# ── Fire-and-forget background embedding ─────────────────────────────────────


def embed_message_background(message_id: str) -> None:
    """Schedule message embedding as a background asyncio task.

    Call this after saving a message to DB — it won't block the caller.
    Silently does nothing if pgvector is not available or GEMINI_API_KEY is missing.
    """
    if not _is_pgvector_available() or not settings.GEMINI_API_KEY:
        return

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_safe_embed_message(message_id))
    except RuntimeError:
        pass  # No running loop — skip


def embed_crm_note_background(note_id: str) -> None:
    """Schedule CRM note embedding as a background asyncio task."""
    if not _is_pgvector_available() or not settings.GEMINI_API_KEY:
        return

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_safe_embed_crm_note(note_id))
    except RuntimeError:
        pass


def embed_crm_contact_background(contact_id: str) -> None:
    """Schedule CRM contact embedding as a background asyncio task."""
    if not _is_pgvector_available() or not settings.GEMINI_API_KEY:
        return

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_safe_embed_crm_contact(contact_id))
    except RuntimeError:
        pass


def embed_crm_company_background(company_id: str) -> None:
    """Schedule CRM company embedding as a background asyncio task."""
    if not _is_pgvector_available() or not settings.GEMINI_API_KEY:
        return

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(_safe_embed_crm_company(company_id))
    except RuntimeError:
        pass


async def _safe_embed_message(message_id: str) -> None:
    """Wrapper that catches all exceptions to prevent unhandled task errors."""
    try:
        await embed_message(message_id)
    except Exception:
        logger.debug("Background embed_message failed for %s", message_id, exc_info=True)


async def _safe_embed_crm_note(note_id: str) -> None:
    """Wrapper that catches all exceptions to prevent unhandled task errors."""
    try:
        await embed_crm_note(note_id)
    except Exception:
        logger.debug("Background embed_crm_note failed for %s", note_id, exc_info=True)


async def _safe_embed_crm_contact(contact_id: str) -> None:
    try:
        await embed_crm_contact(contact_id)
    except Exception:
        logger.debug("Background embed_crm_contact failed for %s", contact_id, exc_info=True)


async def _safe_embed_crm_company(company_id: str) -> None:
    try:
        await embed_crm_company(company_id)
    except Exception:
        logger.debug("Background embed_crm_company failed for %s", company_id, exc_info=True)


# ── Vector similarity search ─────────────────────────────────────────────────


async def vector_search_messages(
    query: str,
    *,
    channel_id: Optional[str] = None,
    limit: int = 20,
    similarity_threshold: float = 0.3,
) -> list[dict]:
    """Search messages by semantic similarity.

    Returns list of dicts with keys: id, channel_id, sender_id, content,
    created_at, similarity.
    """
    if not _is_pgvector_available() or not settings.GEMINI_API_KEY:
        return []

    try:
        query_vec = await embed_text(query)
    except Exception:
        logger.exception("Failed to embed search query")
        return []

    # Build SQL with optional channel filter
    where_clauses = [
        "embedding IS NOT NULL",
        f"1 - (embedding <=> :vec) >= {similarity_threshold}",
    ]
    params: dict = {"vec": str(query_vec), "lim": limit}

    if channel_id:
        where_clauses.append("channel_id = :channel_id")
        params["channel_id"] = channel_id

    where_sql = " AND ".join(where_clauses)

    sql = sa_text(f"""
        SELECT id, channel_id, sender_id, content, created_at,
               1 - (embedding <=> :vec) AS similarity
        FROM messages
        WHERE {where_sql}
        ORDER BY similarity DESC
        LIMIT :lim
    """)

    async with async_session() as session:
        rows = (await session.execute(sql, params)).fetchall()

    return [
        {
            "id": r[0],
            "channel_id": r[1],
            "sender_id": r[2],
            "content": r[3],
            "created_at": r[4].isoformat() if r[4] else None,
            "similarity": round(float(r[5]), 4),
        }
        for r in rows
    ]


async def vector_search_crm_notes(
    query: str,
    *,
    contact_id: Optional[str] = None,
    limit: int = 15,
    similarity_threshold: float = 0.3,
) -> list[dict]:
    """Search CRM notes by semantic similarity.

    Returns list of dicts with keys: id, contact_id, content, created_at,
    similarity.
    """
    if not _is_pgvector_available() or not settings.GEMINI_API_KEY:
        return []

    try:
        query_vec = await embed_text(query)
    except Exception:
        logger.exception("Failed to embed search query")
        return []

    where_clauses = [
        "embedding IS NOT NULL",
        f"1 - (embedding <=> :vec) >= {similarity_threshold}",
    ]
    params: dict = {"vec": str(query_vec), "lim": limit}

    if contact_id:
        where_clauses.append("contact_id = :contact_id")
        params["contact_id"] = contact_id

    where_sql = " AND ".join(where_clauses)

    sql = sa_text(f"""
        SELECT id, contact_id, content, created_by, created_at,
               1 - (embedding <=> :vec) AS similarity
        FROM crm_notes
        WHERE {where_sql}
        ORDER BY similarity DESC
        LIMIT :lim
    """)

    async with async_session() as session:
        rows = (await session.execute(sql, params)).fetchall()

    return [
        {
            "id": r[0],
            "contact_id": r[1],
            "content": r[2],
            "created_by": r[3],
            "created_at": r[4].isoformat() if r[4] else None,
            "similarity": round(float(r[5]), 4),
        }
        for r in rows
    ]


async def vector_search_crm_contacts(
    query: str,
    *,
    limit: int = 15,
    similarity_threshold: float = 0.3,
) -> list[dict]:
    """Search CRM contacts by semantic similarity.

    Returns list of dicts with keys: id, name, email, company, title, stage,
    similarity.
    """
    if not _is_pgvector_available() or not settings.GEMINI_API_KEY:
        return []

    try:
        query_vec = await embed_text(query)
    except Exception:
        logger.exception("Failed to embed contact search query")
        return []

    sql = sa_text(f"""
        SELECT id, name, email, company, title, stage,
               1 - (embedding <=> :vec) AS similarity
        FROM crm_contacts
        WHERE embedding IS NOT NULL
          AND is_archived = false
          AND 1 - (embedding <=> :vec) >= {similarity_threshold}
        ORDER BY similarity DESC
        LIMIT :lim
    """)

    async with async_session() as session:
        rows = (await session.execute(sql, {"vec": str(query_vec), "lim": limit})).fetchall()

    return [
        {
            "id": r[0],
            "name": r[1],
            "email": r[2],
            "company": r[3],
            "title": r[4],
            "stage": r[5],
            "similarity": round(float(r[6]), 4),
        }
        for r in rows
    ]


async def vector_search_crm_companies(
    query: str,
    *,
    limit: int = 15,
    similarity_threshold: float = 0.3,
) -> list[dict]:
    """Search CRM companies by semantic similarity.

    Returns list of dicts with keys: id, name, domain, industry, description,
    similarity.
    """
    if not _is_pgvector_available() or not settings.GEMINI_API_KEY:
        return []

    try:
        query_vec = await embed_text(query)
    except Exception:
        logger.exception("Failed to embed company search query")
        return []

    sql = sa_text(f"""
        SELECT id, name, domain, industry, description,
               1 - (embedding <=> :vec) AS similarity
        FROM crm_companies
        WHERE embedding IS NOT NULL
          AND is_archived = false
          AND 1 - (embedding <=> :vec) >= {similarity_threshold}
        ORDER BY similarity DESC
        LIMIT :lim
    """)

    async with async_session() as session:
        rows = (await session.execute(sql, {"vec": str(query_vec), "lim": limit})).fetchall()

    return [
        {
            "id": r[0],
            "name": r[1],
            "domain": r[2],
            "industry": r[3],
            "description": (r[4] or "")[:200],
            "similarity": round(float(r[5]), 4),
        }
        for r in rows
    ]


# ── Backfill ─────────────────────────────────────────────────────────────────


async def backfill_embeddings(
    table: str = "messages",
    batch_size: int = 50,
    max_records: int = 5000,
) -> int:
    """Embed all records without embeddings in the given table.

    Args:
        table: 'messages' or 'crm_notes'
        batch_size: records per embedding API call
        max_records: safety cap to avoid runaway costs

    Returns:
        Number of records embedded.
    """
    if not _is_pgvector_available() or not settings.GEMINI_API_KEY:
        return 0

    if table not in ("messages", "crm_notes", "crm_contacts", "crm_companies"):
        raise ValueError(f"Unsupported table: {table}")

    # contacts/companies need composite text, not a single content column
    _COMPOSITE_TEXT_SQL = {
        "crm_contacts": (
            "SELECT id, CONCAT_WS(' | ', name, email, company, title, notes, ai_summary) AS content "
            "FROM crm_contacts WHERE embedding IS NULL "
            "AND name IS NOT NULL ORDER BY created_at DESC LIMIT :lim"
        ),
        "crm_companies": (
            "SELECT id, CONCAT_WS(' | ', name, domain, industry, description) AS content "
            "FROM crm_companies WHERE embedding IS NULL "
            "AND name IS NOT NULL ORDER BY created_at DESC LIMIT :lim"
        ),
    }

    total_embedded = 0

    while total_embedded < max_records:
        remaining = min(batch_size, max_records - total_embedded)

        async with async_session() as session:
            if table in _COMPOSITE_TEXT_SQL:
                fetch_sql = _COMPOSITE_TEXT_SQL[table]
            else:
                fetch_sql = (
                    f"SELECT id, content FROM {table} "
                    f"WHERE embedding IS NULL AND content IS NOT NULL "
                    f"AND content != '' "
                    f"ORDER BY created_at DESC "
                    f"LIMIT :lim"
                )
            rows = (
                await session.execute(sa_text(fetch_sql), {"lim": remaining})
            ).fetchall()

        if not rows:
            break

        ids = [r[0] for r in rows]
        contents = [r[1] for r in rows]

        try:
            vectors = await embed_texts(contents)
        except Exception:
            logger.exception("Backfill embedding batch failed for %s", table)
            break

        # Write embeddings back
        async with async_session() as session:
            for record_id, vec in zip(ids, vectors):
                # Skip zero vectors (empty content)
                if any(v != 0.0 for v in vec):
                    await session.execute(
                        sa_text(
                            f"UPDATE {table} SET embedding = :vec WHERE id = :id"
                        ),
                        {"vec": str(vec), "id": record_id},
                    )
            await session.commit()

        total_embedded += len(rows)
        logger.info("Backfilled %d/%d embeddings for %s", total_embedded, max_records, table)

        # Small delay to respect rate limits
        await asyncio.sleep(0.5)

    return total_embedded
