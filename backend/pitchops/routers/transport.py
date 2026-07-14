"""Transport recommendation route: POST /transport/recommend."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Request

from pitchops.constants import VENUES_BY_ID
from pitchops.errors import require_venue
from pitchops.models import TransportRequest
from pitchops.simulation import seeded_rand

logger = logging.getLogger("pitchops.transport")
router = APIRouter()

_TRANSPORT_SYSTEM_TEMPLATE = (
    "You are a FIFA 2026 transport concierge. Reply in {language}. "
    "Given options from origin to venue, pick the best and justify in ≤ 45 words. "
    "Consider ETA, cost, sustainability (lower CO2 preferred), and accessibility if requested. "
    "Return ONLY: '<mode>: <one-sentence justification>'."
)


def _build_transport_options(
    venue_id: str,
    origin: str,
    now_ts: float,
    accessibility: bool,
) -> list[dict]:
    """Generate deterministic transport options for the given inputs (pure)."""
    bucket = int(now_ts // 300)
    rng = seeded_rand(venue_id, origin, str(bucket))
    options = [
        {"mode": "Metro / Subway",   "eta_min": rng.randint(18, 42), "cost_usd": rng.randint(3, 8),   "co2_kg": round(rng.uniform(0.4, 1.2), 2), "accessible": True},
        {"mode": "Official Shuttle", "eta_min": rng.randint(22, 55), "cost_usd": rng.randint(0, 5),   "co2_kg": round(rng.uniform(0.6, 1.6), 2), "accessible": True},
        {"mode": "Rideshare",        "eta_min": rng.randint(15, 40), "cost_usd": rng.randint(18, 55), "co2_kg": round(rng.uniform(2.2, 5.4), 2), "accessible": True},
        {"mode": "Bike / Scooter",   "eta_min": rng.randint(25, 60), "cost_usd": rng.randint(0, 6),   "co2_kg": 0.0,                              "accessible": False},
        {"mode": "Walking",          "eta_min": rng.randint(35, 90), "cost_usd": 0,                   "co2_kg": 0.0,                              "accessible": True},
    ]
    if accessibility:
        options = [o for o in options if o["accessible"]]
    return options


def _transport_fallback(options: list[dict]) -> str:
    """Select the best option heuristically when LLM is unavailable (pure)."""
    best = min(options, key=lambda o: (o["co2_kg"], o["eta_min"], o["cost_usd"]))
    return f"{best['mode']}: fastest low-carbon option at {best['eta_min']} min for ${best['cost_usd']}."


@router.post("/transport/recommend")
async def transport_recommend(req: TransportRequest, request: Request) -> dict:
    """Recommend the best transport option from an origin to a venue.

    Raises:
        VenueNotFoundError: If ``req.venue_id`` is unknown (→ 404).
    """
    venue = require_venue(VENUES_BY_ID, req.venue_id)
    now_ts = datetime.now(timezone.utc).timestamp()
    options = _build_transport_options(req.venue_id, req.origin, now_ts, req.accessibility)

    system = _TRANSPORT_SYSTEM_TEMPLATE.format(language=req.language)
    user = f"Origin: {req.origin}. Venue: {venue['name']}, {venue['city']}. Accessibility required: {req.accessibility}. Options: {options}"

    llm_fn = request.app.state.llm_fn
    try:
        reco = await llm_fn(system, user)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Transport AI failed: %s", exc)
        reco = _transport_fallback(options)

    return {"venue_id": req.venue_id, "options": options, "recommendation": reco}
