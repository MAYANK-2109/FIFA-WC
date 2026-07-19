"""Incident management routes: create, list, and patch status.

Dependencies (DB collection, LLM fn) are injected via FastAPI ``Request``
state so the wiring happens once in ``main.py`` rather than being hardcoded
here. This makes the router importable and testable without a live DB.
"""

from __future__ import annotations

import logging
from typing import List, Literal, Optional

from fastapi import APIRouter, Query, Request

from pitchops.constants import DEPARTMENTS, VENUES_BY_ID
from pitchops.errors import IncidentNotFoundError, require_venue
from pitchops.models import Incident, IncidentIn
from pitchops.services import db as db_repo
from pitchops.triage import ai_triage

logger = logging.getLogger("pitchops.incidents")
router = APIRouter()


def _get_incidents_col(request: Request):
    """Extract the incidents collection from app state."""
    return request.app.state.incidents_col


def _get_llm_fn(request: Request):
    """Extract the LLM callable from app state."""
    return request.app.state.llm_fn


@router.post("/incidents", response_model=Incident)
async def create_incident(payload: IncidentIn, request: Request) -> Incident:
    """Triage and persist a new incident report.

    The AI triage is attempted first; if it fails the heuristic fallback is
    used transparently. Either way, a valid ``Incident`` is always returned.

    Raises:
        VenueNotFoundError: If ``payload.venue_id`` is unknown (→ 404).
    """
    venue = require_venue(VENUES_BY_ID, payload.venue_id)
    llm_fn = _get_llm_fn(request)
    triage = await ai_triage(
        description=payload.description,
        role=payload.reporter_role,
        venue_name=venue["name"],
        llm_fn=llm_fn,
    )
    incident = Incident(
        venue_id=payload.venue_id,
        zone=payload.zone.upper()[:4],
        reporter_role=payload.reporter_role,
        description=payload.description,
        category=triage["category"],
        severity=triage["severity"],
        department=DEPARTMENTS[triage["category"]],
        ai_summary=triage["summary"],
        recommended_action=triage["recommended_action"],
    )
    col = _get_incidents_col(request)
    await db_repo.insert_incident(col, incident.model_dump())
    return incident


@router.get("/incidents", response_model=List[Incident])
async def list_incidents(
    request: Request,
    venue_id: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[Incident]:
    """List incidents sorted newest-first, optionally filtered by venue."""
    col = _get_incidents_col(request)
    docs = await db_repo.list_incidents(col, venue_id, limit)
    return [Incident(**d) for d in docs]


@router.patch("/incidents/{incident_id}")
async def update_incident(
    incident_id: str,
    status: Literal["OPEN", "IN_PROGRESS", "RESOLVED"],
    request: Request,
) -> dict:
    """Update the status of an existing incident.

    Raises:
        IncidentNotFoundError: If *incident_id* does not exist (→ 404).
    """
    col = _get_incidents_col(request)
    matched = await db_repo.update_incident_status(col, incident_id, status)
    if not matched:
        raise IncidentNotFoundError(incident_id)
    return {"id": incident_id, "status": status}
