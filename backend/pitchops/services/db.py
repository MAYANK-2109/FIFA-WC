"""Database repository — all MongoDB operations isolated in one module.

Design rules:
- Functions accept a Motor *collection* (not the full client) as their first
  argument. This makes it trivial to pass an ``AsyncMock`` in unit tests.
- No business logic here — only data access patterns.
- All functions have strict type annotations and docstrings so callers know
  exactly what they send and receive.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger("pitchops.db")


# ─────────────────────────────────────────────────────────────
# Incident repository
# ─────────────────────────────────────────────────────────────


async def insert_incident(collection: Any, doc: dict) -> None:
    """Insert a new incident document.

    Args:
        collection: Motor incidents collection.
        doc: Incident dict (from ``Incident.model_dump()``).
    """
    await collection.insert_one(doc)


async def list_incidents(
    collection: Any,
    venue_id: str | None,
    limit: int,
) -> list[dict]:
    """Fetch incidents sorted newest-first, optionally filtered by venue.

    Args:
        collection: Motor incidents collection.
        venue_id: If provided, filter to this venue only.
        limit: Maximum number of results.

    Returns:
        List of incident dicts (``_id`` field excluded).
    """
    query: dict = {"venue_id": venue_id} if venue_id else {}
    return (
        await collection.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    )


async def update_incident_status(
    collection: Any,
    incident_id: str,
    status: str,
) -> bool:
    """Set the ``status`` field on a single incident.

    Args:
        collection: Motor incidents collection.
        incident_id: UUID string of the incident to update.
        status: New status value (``"OPEN"``, ``"IN_PROGRESS"``, ``"RESOLVED"``).

    Returns:
        ``True`` if a document was matched and updated, ``False`` otherwise.
    """
    result = await collection.update_one(
        {"id": incident_id},
        {"$set": {"status": status}},
    )
    return result.matched_count > 0


async def count_incidents(collection: Any, query: dict) -> int:
    """Return the count of incidents matching *query*.

    Args:
        collection: Motor incidents collection.
        query: MongoDB filter dict.

    Returns:
        Integer document count.
    """
    return await collection.count_documents(query)


async def list_open_incidents(
    collection: Any, venue_id: str, limit: int = 20
) -> list[dict]:
    """Fetch non-resolved incidents for ops briefing.

    Args:
        collection: Motor incidents collection.
        venue_id: Venue to filter by.
        limit: Maximum results.

    Returns:
        List of open/in-progress incident dicts.
    """
    query = {"venue_id": venue_id, "status": {"$ne": "RESOLVED"}}
    return (
        await collection.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    )


# ─────────────────────────────────────────────────────────────
# Chat message repository
# ─────────────────────────────────────────────────────────────


async def persist_message(
    collection: Any,
    session_id: str,
    role: str,
    content: str,
) -> None:
    """Append a chat message to the session history.

    Args:
        collection: Motor chat_messages collection.
        session_id: Chat session identifier.
        role: ``"user"`` or ``"assistant"``.
        content: Message text.
    """
    await collection.insert_one(
        {
            "session_id": session_id,
            "role": role,
            "content": content,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
    )


async def get_chat_history(collection: Any, session_id: str) -> list[dict]:
    """Retrieve all messages for a session, sorted oldest-first.

    Args:
        collection: Motor chat_messages collection.
        session_id: Chat session identifier.

    Returns:
        List of message dicts (``_id`` excluded), ordered by ``ts`` ascending.
    """
    return (
        await collection.find({"session_id": session_id}, {"_id": 0})
        .sort("ts", 1)
        .to_list(200)
    )


# ─────────────────────────────────────────────────────────────
# Index setup (called at startup)
# ─────────────────────────────────────────────────────────────


async def create_indexes(incidents_col: Any, messages_col: Any) -> None:
    """Create all required MongoDB indexes idempotently.

    Args:
        incidents_col: Motor incidents collection.
        messages_col: Motor chat_messages collection.
    """
    await incidents_col.create_index("venue_id")
    await incidents_col.create_index("created_at")
    await messages_col.create_index([("session_id", 1), ("ts", 1)])
    logger.info("MongoDB indexes verified.")
