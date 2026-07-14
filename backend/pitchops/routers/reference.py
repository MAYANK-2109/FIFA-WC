"""Reference-data routes: root health-check, venues, matches, crowd, sustainability.

These endpoints expose static and simulated data. No DB or LLM dependency.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request

from pitchops.constants import MATCHES, VENUES, VENUES_BY_ID
from pitchops.errors import VenueNotFoundError, require_venue
from pitchops.simulation import crowd_snapshot, sustainability_snapshot

router = APIRouter()


def _now_ts() -> float:
    """Return the current UTC Unix timestamp. Extracted for testability."""
    return datetime.now(timezone.utc).timestamp()


@router.get("/")
async def root() -> dict:
    """Health-check endpoint."""
    return {
        "service": "PITCH.OPS",
        "status": "ok",
        "ts": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/venues")
async def list_venues() -> dict:
    """Return all FIFA WC 2026 host venues."""
    return {"venues": VENUES}


@router.get("/matches")
async def list_matches() -> dict:
    """Return all fixture matches."""
    return {"matches": MATCHES}


@router.get("/crowd/{venue_id}")
async def crowd(venue_id: str) -> dict:
    """Return the live crowd density snapshot for *venue_id*.

    Raises:
        VenueNotFoundError: If *venue_id* is not a known venue (mapped → 404).
    """
    venue = require_venue(VENUES_BY_ID, venue_id)
    return crowd_snapshot(venue, _now_ts())


@router.get("/sustainability/{venue_id}")
async def sustainability(venue_id: str) -> dict:
    """Return hourly sustainability KPIs for *venue_id*.

    Raises:
        VenueNotFoundError: If *venue_id* is not a known venue (mapped → 404).
    """
    venue = require_venue(VENUES_BY_ID, venue_id)
    return sustainability_snapshot(venue, _now_ts())
