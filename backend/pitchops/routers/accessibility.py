"""Accessibility route planning: POST /accessibility/route."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Request

from pitchops.constants import VENUES_BY_ID
from pitchops.errors import require_venue
from pitchops.models import AccessibilityRouteRequest

logger = logging.getLogger("pitchops.accessibility")
router = APIRouter()

_ACCESSIBILITY_SYSTEM_TEMPLATE = (
    "You are an accessibility navigator for a FIFA 2026 stadium. "
    "Reply in {language}. "
    "Produce a numbered, step-by-step route (5-8 steps) "
    "from the entry gate to the seat, "
    "prioritising step-free access, elevators, sensory-friendly rest zones, "
    "hearing loops, guide-dog relief areas and accessible restrooms. "
    "Reference stadium landmarks generically "
    "(elevator bank, concourse level, accessible ramp). "
    "Keep each step ≤ 22 words."
)


def _build_accessibility_fallback(entry_gate: str, seat_section: str) -> str:
    """Return a generic fallback route when LLM is unavailable (pure function)."""
    return (
        f"1. Enter through accessible entrance at Gate {entry_gate}.\n"
        f"2. Follow signage to the elevator bank in the main concourse.\n"
        f"3. Take the elevator to your seating level for section {seat_section}.\n"
        f"4. Follow tactile floor guides along the concourse"
        f" (hearing loop available).\n"
        f"5. Accessible restrooms and sensory-friendly rest area"
        f" located near section {seat_section}.\n"
        f"6. A steward is stationed at the section entry to assist with seating."
    )


@router.post("/accessibility/route")
async def accessibility_route(req: AccessibilityRouteRequest, request: Request) -> dict:
    """Generate a step-by-step accessible route from gate to seat.

    Raises:
        VenueNotFoundError: If ``req.venue_id`` is unknown (→ 404).
    """
    venue = require_venue(VENUES_BY_ID, req.venue_id)
    needs_str = ", ".join(req.needs) or "general accessibility"

    system = _ACCESSIBILITY_SYSTEM_TEMPLATE.format(language=req.language)
    user = (
        f"Venue: {venue['name']}. Entry gate: {req.entry_gate}. "
        f"Seat section: {req.seat_section}. Needs: {needs_str}."
    )

    llm_fn = request.app.state.llm_fn
    try:
        plan = await llm_fn(system, user)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Accessibility AI failed: %s", exc)
        plan = _build_accessibility_fallback(req.entry_gate, req.seat_section)

    return {"venue_id": req.venue_id, "route": plan}
