"""PITCH.OPS — FIFA World Cup 2026 Smart Stadium & Tournament Ops Backend.

GenAI-powered platform providing:
    * Multilingual AI Concierge (streaming SSE, session-persisted, powered by Gemini 3 Flash)
    * Real-time crowd density heatmaps (simulated but deterministic per venue)
    * AI Incident triage (severity + department routing)
    * Smart Transportation Advisor (AI-recommended)
    * Accessibility routing (AI-generated step-by-step)
    * Sustainability insights (AI narrative on real KPIs)
    * Operational Intelligence (AI briefing for staff / organizers)

All endpoints are prefixed with /api and safe to expose behind the k8s ingress.
"""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import random  # nosec B311 — used for DETERMINISTIC SIMULATION (heatmap/sustainability demo data), NOT for security. See `_seeded_rand` below.
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, List, Literal, Optional

from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types
from fastapi import APIRouter, FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, StringConstraints
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("pitchops")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")
LLM_MODEL = "gemini-2.0-flash"

mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

app = FastAPI(title="PITCH.OPS API", version="1.0.0")
api = APIRouter(prefix="/api")

# ─────────────────────────────────────────────────────────────
# Static reference data — FIFA World Cup 2026 host venues
# ─────────────────────────────────────────────────────────────

VENUES: list[dict] = [
    {"id": "metlife",     "city": "New York/New Jersey", "country": "USA",    "name": "MetLife Stadium",       "capacity": 82500, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "sofi",        "city": "Los Angeles",         "country": "USA",    "name": "SoFi Stadium",           "capacity": 70240, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "att",         "city": "Dallas",              "country": "USA",    "name": "AT&T Stadium",           "capacity": 80000, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "levis",       "city": "Bay Area",            "country": "USA",    "name": "Levi's Stadium",         "capacity": 68500, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "arrowhead",   "city": "Kansas City",         "country": "USA",    "name": "Arrowhead Stadium",      "capacity": 76416, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "gillette",    "city": "Boston",              "country": "USA",    "name": "Gillette Stadium",       "capacity": 65878, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "lincoln",     "city": "Philadelphia",        "country": "USA",    "name": "Lincoln Financial Field","capacity": 69796, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "hardrock",    "city": "Miami",               "country": "USA",    "name": "Hard Rock Stadium",      "capacity": 65326, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "nrg",         "city": "Houston",             "country": "USA",    "name": "NRG Stadium",            "capacity": 72220, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "mercedes",    "city": "Atlanta",             "country": "USA",    "name": "Mercedes-Benz Stadium",  "capacity": 71000, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "lumen",       "city": "Seattle",             "country": "USA",    "name": "Lumen Field",            "capacity": 68740, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "bmo",         "city": "Toronto",             "country": "CAN",    "name": "BMO Field",              "capacity": 45500, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "bcplace",     "city": "Vancouver",           "country": "CAN",    "name": "BC Place",               "capacity": 54500, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "azteca",      "city": "Mexico City",         "country": "MEX",    "name": "Estadio Azteca",         "capacity": 87523, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "akron",       "city": "Guadalajara",         "country": "MEX",    "name": "Estadio Akron",          "capacity": 48071, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "bbva",        "city": "Monterrey",           "country": "MEX",    "name": "Estadio BBVA",           "capacity": 53500, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
]

VENUES_BY_ID = {v["id"]: v for v in VENUES}

MATCHES: list[dict] = [
    {"id": "m1", "home": "USA",     "away": "MEX",     "venue_id": "metlife",  "kickoff": "2026-06-11T20:00:00Z", "status": "LIVE",      "score": "1-1", "minute": 63},
    {"id": "m2", "home": "BRA",     "away": "ARG",     "venue_id": "azteca",   "kickoff": "2026-06-12T21:00:00Z", "status": "SCHEDULED", "score": "0-0", "minute": 0},
    {"id": "m3", "home": "ENG",     "away": "FRA",     "venue_id": "sofi",     "kickoff": "2026-06-13T19:00:00Z", "status": "SCHEDULED", "score": "0-0", "minute": 0},
    {"id": "m4", "home": "GER",     "away": "ESP",     "venue_id": "att",      "kickoff": "2026-06-14T18:00:00Z", "status": "SCHEDULED", "score": "0-0", "minute": 0},
    {"id": "m5", "home": "POR",     "away": "NED",     "venue_id": "bmo",      "kickoff": "2026-06-15T17:00:00Z", "status": "SCHEDULED", "score": "0-0", "minute": 0},
    {"id": "m6", "home": "JPN",     "away": "KOR",     "venue_id": "hardrock", "kickoff": "2026-06-16T22:00:00Z", "status": "FINAL",     "score": "2-1", "minute": 90},
]

INCIDENT_CATEGORIES = ["MEDICAL", "SECURITY", "CROWD", "FACILITIES", "LOST_ITEM", "ACCESSIBILITY", "TRANSPORT", "OTHER"]
INCIDENT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

# ─────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────

NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
ShortStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)]


class ChatRequest(BaseModel):
    session_id: NonEmptyStr
    role: Literal["fan", "volunteer", "staff", "organizer"] = "fan"
    language: ShortStr = "English"
    venue_id: Optional[ShortStr] = None
    message: NonEmptyStr


class IncidentIn(BaseModel):
    venue_id: ShortStr
    zone: ShortStr = "N"
    reporter_role: Literal["fan", "volunteer", "staff", "organizer"] = "fan"
    description: NonEmptyStr


class Incident(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    venue_id: str
    zone: str
    reporter_role: str
    description: str
    category: str
    severity: str
    department: str
    ai_summary: str
    recommended_action: str
    status: Literal["OPEN", "IN_PROGRESS", "RESOLVED"] = "OPEN"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TransportRequest(BaseModel):
    venue_id: ShortStr
    origin: NonEmptyStr
    language: ShortStr = "English"
    accessibility: bool = False


class AccessibilityRouteRequest(BaseModel):
    venue_id: ShortStr
    entry_gate: ShortStr = "A"
    seat_section: ShortStr = "112"
    needs: List[ShortStr] = Field(default_factory=list)
    language: ShortStr = "English"


class OpsInsightRequest(BaseModel):
    venue_id: ShortStr


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _require_llm_key() -> str:
    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=503, detail="LLM key not configured on server.")
    return GOOGLE_API_KEY


def _genai_client() -> genai.Client:
    return genai.Client(api_key=_require_llm_key())


def _require_venue(venue_id: str) -> dict:
    v = VENUES_BY_ID.get(venue_id)
    if not v:
        raise HTTPException(status_code=404, detail=f"Unknown venue '{venue_id}'.")
    return v


def _seeded_rand(*parts: str) -> random.Random:
    """Deterministic RNG per (venue, minute-bucket) so demo data is stable but evolves.

    Security note: `random` (Mersenne Twister) is intentional here — we need a
    *seeded* PRNG so the same (venue, time-bucket) yields the same simulated
    crowd/sustainability snapshot across requests. `secrets` cannot be seeded
    and is not appropriate for reproducible simulation data. No secrets, tokens,
    or auth values are generated with this RNG.
    """
    seed = hashlib.sha256("|".join(parts).encode()).hexdigest()
    return random.Random(int(seed[:12], 16))


def _crowd_snapshot(venue_id: str) -> dict:
    v = _require_venue(venue_id)
    # bucket by 30-second windows so the heatmap "breathes"
    bucket = int(datetime.now(timezone.utc).timestamp() // 30)
    rng = _seeded_rand(venue_id, str(bucket))
    zones = []
    total = 0
    for z in v["zones"]:
        density = rng.randint(35, 96)
        occupancy = int(v["capacity"] / len(v["zones"]) * (density / 100))
        total += occupancy
        zones.append({
            "zone": z,
            "density_pct": density,
            "occupancy": occupancy,
            "status": "CRITICAL" if density > 90 else "HIGH" if density > 78 else "MEDIUM" if density > 55 else "LOW",
        })
    gates = [
        {"gate": f"Gate {chr(65 + i)}", "wait_min": rng.randint(1, 22), "flow": rng.choice(["INBOUND", "OUTBOUND", "IDLE"])}
        for i in range(6)
    ]
    return {
        "venue_id": venue_id,
        "venue_name": v["name"],
        "capacity": v["capacity"],
        "occupancy": total,
        "occupancy_pct": round(total / v["capacity"] * 100, 1),
        "zones": zones,
        "gates": gates,
        "ts": datetime.now(timezone.utc).isoformat(),
    }


def _sustainability_snapshot(venue_id: str) -> dict:
    v = _require_venue(venue_id)
    rng = _seeded_rand(venue_id, "sust", str(int(datetime.now(timezone.utc).timestamp() // 3600)))
    return {
        "venue_id": venue_id,
        "venue_name": v["name"],
        "waste_diversion_pct": rng.randint(58, 92),
        "energy_kwh": rng.randint(48000, 92000),
        "renewable_pct": rng.randint(35, 78),
        "water_liters": rng.randint(180000, 420000),
        "carbon_kg_co2e": rng.randint(24000, 58000),
        "single_use_plastics_kg": rng.randint(120, 640),
        "recycled_kg": rng.randint(800, 2400),
        "goal_waste_diversion_pct": 90,
    }


_LLM_SEMAPHORE = asyncio.Semaphore(4)  # allow up to 4 concurrent LLM calls


async def _llm_oneshot(system: str, user_text: str, retries: int = 2) -> str:
    """One-shot LLM call with retry for quota errors using Google GenAI SDK."""
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            async with _LLM_SEMAPHORE:
                client = _genai_client()
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: client.models.generate_content(
                        model=LLM_MODEL,
                        contents=user_text,
                        config=genai_types.GenerateContentConfig(
                            system_instruction=system,
                        ),
                    ),
                )
            return response.text.strip()
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            msg = str(exc).lower()
            if "429" in msg or "rate" in msg or "quota" in msg:
                await asyncio.sleep(0.6 * (attempt + 1))
                continue
            raise
    raise last_err  # type: ignore[misc]


# ─────────────────────────────────────────────────────────────
# Routes — reference data
# ─────────────────────────────────────────────────────────────

@api.get("/")
async def root():
    return {"service": "PITCH.OPS", "status": "ok", "ts": datetime.now(timezone.utc).isoformat()}


@api.get("/venues")
async def list_venues():
    return {"venues": VENUES}


@api.get("/matches")
async def list_matches():
    return {"matches": MATCHES}


@api.get("/crowd/{venue_id}")
async def crowd(venue_id: str):
    return _crowd_snapshot(venue_id)


@api.get("/sustainability/{venue_id}")
async def sustainability(venue_id: str):
    return _sustainability_snapshot(venue_id)


# ─────────────────────────────────────────────────────────────
# Routes — Incidents (with AI triage)
# ─────────────────────────────────────────────────────────────

_ALLOWED_CATS = set(INCIDENT_CATEGORIES)
_ALLOWED_SEV = set(INCIDENT_SEVERITIES)
_DEPARTMENTS = {
    "MEDICAL": "Medical Team",
    "SECURITY": "Security Command",
    "CROWD": "Crowd Ops",
    "FACILITIES": "Facilities",
    "LOST_ITEM": "Guest Services",
    "ACCESSIBILITY": "Accessibility Services",
    "TRANSPORT": "Transport Desk",
    "OTHER": "Ops Command",
}


# ─────────────────────────────────────────────────────────────
# Heuristic triage — lookup-table based to keep cyclomatic complexity low.
# Each rule = (set of keyword tokens, resulting category/severity).
# Order matters (first match wins).
# ─────────────────────────────────────────────────────────────

_CATEGORY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("MEDICAL",       ("injur", "hurt", "medic", "faint", "bleed", "chest", "unconscious")),
    ("SECURITY",      ("fight", "weapon", "threat", "suspicious", "steal")),
    ("CROWD",         ("crowd", "push", "surge", "block", "queue")),
    ("LOST_ITEM",     ("lost", "found", "missing")),
    ("ACCESSIBILITY", ("wheelchair", "access", "ramp", "hearing", "deaf", "blind")),
    ("TRANSPORT",     ("metro", "shuttle", "train", "bus", "parking", "taxi")),
    ("FACILITIES",    ("toilet", "restroom", "water", "food", "seat", "broken", "leak")),
]

_SEVERITY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("CRITICAL", ("urgent", "critical", "unconscious", "weapon")),
    ("HIGH",     ("injur", "bleed", "fight", "surge")),
]


def _match_rule(text: str, rules: list[tuple[str, tuple[str, ...]]], default: str) -> str:
    for label, keywords in rules:
        if any(word in text for word in keywords):
            return label
    return default


def _heuristic_triage(description: str) -> dict:
    low = description.lower()
    cat = _match_rule(low, _CATEGORY_RULES, "OTHER")
    sev = _match_rule(low, _SEVERITY_RULES, "MEDIUM")
    return {
        "category": cat,
        "severity": sev,
        "summary": description[:140],
        "recommended_action": f"Dispatch {_DEPARTMENTS[cat]} to reported location.",
    }


def _parse_triage_json(raw: str) -> dict | None:
    """Parse the LLM's triage JSON, returning None on any failure."""
    import json
    text = raw.strip().strip("`")
    if text.lower().startswith("json"):
        text = text[4:].strip()
    try:
        data = json.loads(text)
    except (ValueError, TypeError):
        return None
    cat = str(data.get("category", "OTHER")).upper()
    sev = str(data.get("severity", "MEDIUM")).upper()
    return {
        "category": cat if cat in _ALLOWED_CATS else "OTHER",
        "severity": sev if sev in _ALLOWED_SEV else "MEDIUM",
        "summary": str(data.get("summary", ""))[:200],
        "recommended_action": str(data.get("recommended_action", "Dispatch nearest team."))[:220],
    }


async def _triage(description: str, role: str, venue_name: str) -> dict:
    system = (
        "You are the incident triage system for a FIFA World Cup 2026 stadium ops center. "
        "Given a raw report, respond with ONLY a compact JSON object with keys: "
        "category (one of MEDICAL, SECURITY, CROWD, FACILITIES, LOST_ITEM, ACCESSIBILITY, TRANSPORT, OTHER), "
        "severity (LOW, MEDIUM, HIGH, CRITICAL), "
        "summary (<=140 chars neutral factual), "
        "recommended_action (<=180 chars imperative sentence)."
        " No prose, no code fences."
    )
    user = f"Venue: {venue_name}. Reporter role: {role}. Report: {description}"
    try:
        raw = await _llm_oneshot(system, user)
        parsed = _parse_triage_json(raw)
        if parsed:
            if not parsed["summary"]:
                parsed["summary"] = description[:200]
            return parsed
    except Exception as exc:  # noqa: BLE001 — graceful fallback keeps flow working
        logger.warning("Triage AI failed, using heuristic: %s", exc)
    return _heuristic_triage(description)


@api.post("/incidents", response_model=Incident)
async def create_incident(payload: IncidentIn):
    v = _require_venue(payload.venue_id)
    triage = await _triage(payload.description, payload.reporter_role, v["name"])
    incident = Incident(
        venue_id=payload.venue_id,
        zone=payload.zone.upper()[:4],
        reporter_role=payload.reporter_role,
        description=payload.description,
        category=triage["category"],
        severity=triage["severity"],
        department=_DEPARTMENTS[triage["category"]],
        ai_summary=triage["summary"],
        recommended_action=triage["recommended_action"],
    )
    await db.incidents.insert_one(incident.model_dump())
    return incident


@api.get("/incidents", response_model=List[Incident])
async def list_incidents(venue_id: Optional[str] = Query(default=None), limit: int = Query(default=50, ge=1, le=200)):
    q = {"venue_id": venue_id} if venue_id else {}
    docs = await db.incidents.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return [Incident(**d) for d in docs]


@api.patch("/incidents/{incident_id}")
async def update_incident(incident_id: str, status: Literal["OPEN", "IN_PROGRESS", "RESOLVED"]):
    res = await db.incidents.update_one({"id": incident_id}, {"$set": {"status": status}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Incident not found.")
    return {"id": incident_id, "status": status}


# ─────────────────────────────────────────────────────────────
# Routes — Ops Intelligence briefing
# ─────────────────────────────────────────────────────────────

@api.post("/ops/insights")
async def ops_insights(req: OpsInsightRequest):
    v = _require_venue(req.venue_id)
    crowd = _crowd_snapshot(req.venue_id)
    incidents = await db.incidents.find({"venue_id": req.venue_id, "status": {"$ne": "RESOLVED"}}, {"_id": 0}).sort("created_at", -1).to_list(20)
    hot = sorted(crowd["zones"], key=lambda z: -z["density_pct"])[:3]
    system = (
        "You are the AI Operations Officer for a FIFA World Cup 2026 stadium. "
        "Given the live snapshot, write a decisive 4-bullet briefing for the on-duty commander. "
        "Rules: (1) plain text bullets prefixed with '• ', (2) each ≤ 22 words, (3) actionable + specific, "
        "(4) reference zones/gates by name where useful, (5) English only."
    )
    hot_str = ", ".join(f"{z['zone']}({z['density_pct']}%)" for z in hot)
    gates_str = ", ".join(f"{g['gate']}:{g['wait_min']}m" for g in crowd['gates'])
    cats_str = ", ".join(str(i.get('category')) for i in incidents) or "none"
    user = (
        f"Venue: {v['name']} · {v['city']}. Occupancy: {crowd['occupancy_pct']}% of {v['capacity']:,}. "
        f"Hottest zones: {hot_str}. Gate waits: {gates_str}. "
        f"Open incidents: {len(incidents)} — categories: {cats_str}."
    )
    try:
        briefing = await _llm_oneshot(system, user)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Ops insights AI failed: %s", exc)
        briefing = (
            f"• Occupancy at {crowd['occupancy_pct']}% — monitor NE/NW pressure zones.\n"
            f"• {len(incidents)} open incidents — prioritise medical & security categories.\n"
            f"• Gate flow balanced; watch for wait spikes above 15 minutes.\n"
            f"• Escalate any CRITICAL incident to command within 60 seconds."
        )
    return {
        "venue_id": req.venue_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "briefing": briefing,
        "hot_zones": hot,
        "open_incidents": len(incidents),
    }


# ─────────────────────────────────────────────────────────────
# Routes — Transportation Advisor
# ─────────────────────────────────────────────────────────────

@api.post("/transport/recommend")
async def transport_recommend(req: TransportRequest):
    v = _require_venue(req.venue_id)
    rng = _seeded_rand(req.venue_id, req.origin, str(int(datetime.now(timezone.utc).timestamp() // 300)))
    options = [
        {"mode": "Metro / Subway",     "eta_min": rng.randint(18, 42), "cost_usd": rng.randint(3, 8),   "co2_kg": round(rng.uniform(0.4, 1.2), 2), "accessible": True},
        {"mode": "Official Shuttle",   "eta_min": rng.randint(22, 55), "cost_usd": rng.randint(0, 5),   "co2_kg": round(rng.uniform(0.6, 1.6), 2), "accessible": True},
        {"mode": "Rideshare",          "eta_min": rng.randint(15, 40), "cost_usd": rng.randint(18, 55), "co2_kg": round(rng.uniform(2.2, 5.4), 2), "accessible": True},
        {"mode": "Bike / Scooter",     "eta_min": rng.randint(25, 60), "cost_usd": rng.randint(0, 6),   "co2_kg": 0.0,                              "accessible": False},
        {"mode": "Walking",            "eta_min": rng.randint(35, 90), "cost_usd": 0,                   "co2_kg": 0.0,                              "accessible": True},
    ]
    if req.accessibility:
        options = [o for o in options if o["accessible"]]
    system = (
        f"You are a FIFA 2026 transport concierge. Reply in {req.language}. "
        "Given options from origin to venue, pick the best and justify in ≤ 45 words. "
        "Consider ETA, cost, sustainability (lower CO2 preferred), and accessibility if requested. "
        "Return ONLY: '<mode>: <one-sentence justification>'."
    )
    user = f"Origin: {req.origin}. Venue: {v['name']}, {v['city']}. Accessibility required: {req.accessibility}. Options: {options}"
    try:
        reco = await _llm_oneshot(system, user)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Transport AI failed: %s", exc)
        best = min(options, key=lambda o: (o["co2_kg"], o["eta_min"], o["cost_usd"]))
        reco = f"{best['mode']}: fastest low-carbon option at {best['eta_min']} min for ${best['cost_usd']}."
    return {"venue_id": req.venue_id, "options": options, "recommendation": reco}


# ─────────────────────────────────────────────────────────────
# Routes — Accessibility Route
# ─────────────────────────────────────────────────────────────

@api.post("/accessibility/route")
async def accessibility_route(req: AccessibilityRouteRequest):
    v = _require_venue(req.venue_id)
    system = (
        f"You are an accessibility navigator for a FIFA 2026 stadium. Reply in {req.language}. "
        "Produce a numbered, step-by-step route (5-8 steps) from the entry gate to the seat, "
        "prioritising step-free access, elevators, sensory-friendly rest zones, hearing loops, "
        "guide-dog relief areas and accessible restrooms. Reference stadium landmarks generically "
        "(elevator bank, concourse level, accessible ramp). Keep each step ≤ 22 words."
    )
    user = (
        f"Venue: {v['name']}. Entry gate: {req.entry_gate}. Seat section: {req.seat_section}. "
        f"Needs: {', '.join(req.needs) or 'general accessibility'}."
    )
    try:
        plan = await _llm_oneshot(system, user)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Accessibility AI failed: %s", exc)
        plan = (
            f"1. Enter through accessible entrance at Gate {req.entry_gate}.\n"
            f"2. Follow signage to the elevator bank in the main concourse.\n"
            f"3. Take the elevator to your seating level for section {req.seat_section}.\n"
            f"4. Follow tactile floor guides along the concourse (hearing loop available).\n"
            f"5. Accessible restrooms and sensory-friendly rest area located near section {req.seat_section}.\n"
            f"6. A steward is stationed at the section entry to assist with seating."
        )
    return {"venue_id": req.venue_id, "route": plan}


# ─────────────────────────────────────────────────────────────
# Routes — Sustainability insights
# ─────────────────────────────────────────────────────────────

@api.post("/sustainability/insights")
async def sustainability_insights(req: OpsInsightRequest):
    snap = _sustainability_snapshot(req.venue_id)
    system = (
        "You are a stadium sustainability officer for FIFA 2026. Given hourly KPIs, write a 3-bullet "
        "narrative (≤ 20 words each, prefixed with '• '). One positive, one risk, one action."
    )
    user = str(snap)
    try:
        text = await _llm_oneshot(system, user)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Sustainability AI failed: %s", exc)
        text = (
            f"• Renewables at {snap['renewable_pct']}% — strong momentum vs 50% baseline.\n"
            f"• Waste diversion at {snap['waste_diversion_pct']}% trails 90% goal.\n"
            f"• Deploy extra sorting volunteers to concourse bins for next 60 minutes."
        )
    return {"venue_id": req.venue_id, "kpis": snap, "narrative": text}


# ─────────────────────────────────────────────────────────────
# Routes — Concierge (streaming SSE)
# ─────────────────────────────────────────────────────────────

CONCIERGE_SYSTEM_TEMPLATE = (
    "You are FIFA 2026 PITCH.OPS Concierge — a multilingual assistant for the "
    "FIFA World Cup 2026 hosted across USA, Canada and Mexico. "
    "Always reply in the user's requested language: {language}. "
    "You help with navigation inside {venue_name}, gate wait times, restrooms, "
    "food & merchandise, seat finding, lost items, accessibility support "
    "(wheelchair routes, sensory zones, hearing loops, guide-dog relief), "
    "public transportation to/from the venue, match schedule, and safety guidance. "
    "The current user's role is: {role}. Adapt tone accordingly (fans = warm & concise; "
    "staff/organizer = crisp operational; volunteer = instructional). "
    "Rules: keep replies under 130 words unless asked for detail; use short paragraphs "
    "or bullet lists; never invent match results — if unsure, say so; NEVER share personal data. "
    "If asked about medical emergency: instruct to press the SOS button, then call venue medical "
    "on gate stewards, then provide 3 short safety tips."
)


async def _persist_message(session_id: str, role: str, content: str) -> None:
    await db.chat_messages.insert_one({
        "session_id": session_id,
        "role": role,
        "content": content,
        "ts": datetime.now(timezone.utc).isoformat(),
    })


@api.get("/concierge/history")
async def concierge_history(session_id: str = Query(..., min_length=1, max_length=128)):
    docs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("ts", 1).to_list(200)
    return {"session_id": session_id, "messages": docs}


@api.post("/concierge/chat")
async def concierge_chat(req: ChatRequest):
    _require_llm_key()
    venue = VENUES_BY_ID.get(req.venue_id or "", {"name": "the assigned FIFA 2026 venue"})
    system = CONCIERGE_SYSTEM_TEMPLATE.format(
        language=req.language,
        venue_name=venue.get("name", "the assigned FIFA 2026 venue"),
        role=req.role,
    )
    await _persist_message(req.session_id, "user", req.message)

    async def stream():
        async with _LLM_SEMAPHORE:
            client = _genai_client()
            full = []
            try:
                loop = asyncio.get_event_loop()
                chunks = await loop.run_in_executor(
                    None,
                    lambda: list(client.models.generate_content_stream(
                        model=LLM_MODEL,
                        contents=req.message,
                        config=genai_types.GenerateContentConfig(
                            system_instruction=system,
                        ),
                    )),
                )
                for chunk in chunks:
                    text = chunk.text if chunk.text else ""
                    if text:
                        full.append(text)
                        yield f"data: {text}\n\n"
                joined = "".join(full).strip()
                if joined:
                    await _persist_message(req.session_id, "assistant", joined)
                yield "event: done\ndata: [DONE]\n\n"
            except Exception as exc:  # noqa: BLE001
                logger.exception("Streaming failed")
                yield f"event: error\ndata: {str(exc)[:200]}\n\n"

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ─────────────────────────────────────────────────────────────
# Wiring
# ─────────────────────────────────────────────────────────────

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup() -> None:
    await db.incidents.create_index("venue_id")
    await db.incidents.create_index("created_at")
    await db.chat_messages.create_index([("session_id", 1), ("ts", 1)])
    # Seed one demo incident so the ops board isn't empty on first load
    if await db.incidents.count_documents({}) == 0:
        demo = Incident(
            venue_id="metlife",
            zone="NE",
            reporter_role="volunteer",
            description="Spilled water near section 118 escalator, slippery.",
            category="FACILITIES",
            severity="MEDIUM",
            department=_DEPARTMENTS["FACILITIES"],
            ai_summary="Wet floor near section 118 escalator — slip hazard.",
            recommended_action="Dispatch facilities to place wet-floor signs and mop.",
        )
        await db.incidents.insert_one(demo.model_dump())
    logger.info("PITCH.OPS API ready — %d venues, model=%s", len(VENUES), LLM_MODEL)


@app.on_event("shutdown")
async def _shutdown() -> None:
    mongo_client.close()
