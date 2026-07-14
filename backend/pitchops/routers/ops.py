"""Ops intelligence briefing route: POST /ops/insights."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from pitchops.constants import VENUES_BY_ID
from pitchops.errors import require_venue
from pitchops.models import OpsInsightRequest
from pitchops.services import db as db_repo
from pitchops.simulation import crowd_snapshot

logger = logging.getLogger("pitchops.ops")
router = APIRouter()

_OPS_SYSTEM_PROMPT = (
    "You are the AI Operations Officer for a FIFA World Cup 2026 stadium. "
    "Given the live snapshot, write a decisive 4-bullet briefing for the on-duty commander. "
    "Rules: (1) plain text bullets prefixed with '• ', (2) each ≤ 22 words, (3) actionable + specific, "
    "(4) reference zones/gates by name where useful, (5) English only."
)


def _build_ops_user_prompt(venue: dict, crowd: dict, incidents: list[dict]) -> str:
    """Construct the LLM user prompt from live data (pure function)."""
    hot = sorted(crowd["zones"], key=lambda z: -z["density_pct"])[:3]
    hot_str = ", ".join(f"{z['zone']}({z['density_pct']}%)" for z in hot)
    gates_str = ", ".join(f"{g['gate']}:{g['wait_min']}m" for g in crowd["gates"])
    cats_str = ", ".join(str(i.get("category")) for i in incidents) or "none"
    return (
        f"Venue: {venue['name']} · {venue['city']}. "
        f"Occupancy: {crowd['occupancy_pct']}% of {venue['capacity']:,}. "
        f"Hottest zones: {hot_str}. Gate waits: {gates_str}. "
        f"Open incidents: {len(incidents)} — categories: {cats_str}."
    )


def _ops_fallback_briefing(crowd: dict, incidents: list[dict]) -> str:
    """Generate a static fallback briefing when the LLM is unavailable."""
    return (
        f"• Occupancy at {crowd['occupancy_pct']}% — monitor NE/NW pressure zones.\n"
        f"• {len(incidents)} open incidents — prioritise medical & security categories.\n"
        f"• Gate flow balanced; watch for wait spikes above 15 minutes.\n"
        f"• Escalate any CRITICAL incident to command within 60 seconds."
    )


@router.post("/ops/insights")
async def ops_insights(req: OpsInsightRequest, request: Request) -> dict:
    """Generate an AI ops briefing for the duty commander.

    Raises:
        VenueNotFoundError: If ``req.venue_id`` is unknown (→ 404).
    """
    venue = require_venue(VENUES_BY_ID, req.venue_id)
    now_ts = datetime.now(timezone.utc).timestamp()
    crowd = crowd_snapshot(venue, now_ts)

    col = request.app.state.incidents_col
    incidents = await db_repo.list_open_incidents(col, req.venue_id)

    llm_fn = request.app.state.llm_fn
    user_prompt = _build_ops_user_prompt(venue, crowd, incidents)
    hot_zones = sorted(crowd["zones"], key=lambda z: -z["density_pct"])[:3]

    try:
        briefing = await llm_fn(_OPS_SYSTEM_PROMPT, user_prompt)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Ops insights AI failed: %s", exc)
        briefing = _ops_fallback_briefing(crowd, incidents)

    return {
        "venue_id": req.venue_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "briefing": briefing,
        "hot_zones": hot_zones,
        "open_incidents": len(incidents),
    }
