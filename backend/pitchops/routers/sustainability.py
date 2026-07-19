"""Sustainability narrative insights: POST /sustainability/insights."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from pitchops.constants import VENUES_BY_ID
from pitchops.errors import require_venue
from pitchops.models import OpsInsightRequest, SustainabilitySnapshot
from pitchops.simulation import sustainability_snapshot

logger = logging.getLogger("pitchops.sustainability")
router = APIRouter()

_SUSTAINABILITY_SYSTEM_PROMPT = (
    "You are a stadium sustainability officer for FIFA 2026. "
    "Given hourly KPIs, write a 3-bullet narrative "
    "(≤ 20 words each, prefixed with '\u2022 '). "
    "One positive, one risk, one action."
)


def _sustainability_fallback(snap: SustainabilitySnapshot) -> str:
    """Return a static narrative fallback when the LLM is unavailable (pure)."""
    return (
        f"\u2022 Renewables at {snap['renewable_pct']}%"
        f" — strong momentum vs 50% baseline.\n"
        f"\u2022 Waste diversion at {snap['waste_diversion_pct']}% trails 90% goal.\n"
        f"\u2022 Deploy extra sorting volunteers to concourse bins for next 60 minutes."
    )


@router.post("/sustainability/insights")
async def sustainability_insights(req: OpsInsightRequest, request: Request) -> dict:
    """Return AI narrative commentary on the current sustainability KPIs.

    Raises:
        VenueNotFoundError: If ``req.venue_id`` is unknown (→ 404).
    """
    venue = require_venue(VENUES_BY_ID, req.venue_id)
    now_ts = datetime.now(timezone.utc).timestamp()
    snap = sustainability_snapshot(venue, now_ts)

    llm_fn = request.app.state.llm_fn
    try:
        text = await llm_fn(_SUSTAINABILITY_SYSTEM_PROMPT, str(snap))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Sustainability AI failed: %s", exc)
        text = _sustainability_fallback(snap)

    return {"venue_id": req.venue_id, "kpis": snap, "narrative": text}
