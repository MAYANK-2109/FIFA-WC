"""Pydantic models, TypedDicts, and type aliases for PITCH.OPS.

Keeping all schema definitions in one module means:
- Routes import *only* from here (no circular deps through server.py)
- Tests can validate schemas without starting the app
- The same ``Incident`` model is used by both the DB layer and the API layer
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Annotated, List, Literal, Optional, TypedDict

from pydantic import BaseModel, Field, StringConstraints

# ─────────────────────────────────────────────────────────────
# Shared string constraints
# ─────────────────────────────────────────────────────────────

NonEmptyStr = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)
]
ShortStr = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)
]


# ─────────────────────────────────────────────────────────────
# Request / Response models
# ─────────────────────────────────────────────────────────────


class ChatRequest(BaseModel):
    """Payload for a concierge chat turn."""

    session_id: NonEmptyStr
    role: Literal["fan", "volunteer", "staff", "organizer"] = "fan"
    language: ShortStr = "English"
    venue_id: Optional[ShortStr] = None
    message: NonEmptyStr


class IncidentIn(BaseModel):
    """Fields accepted when a reporter submits a new incident."""

    venue_id: ShortStr
    zone: ShortStr = "N"
    reporter_role: Literal["fan", "volunteer", "staff", "organizer"] = "fan"
    description: NonEmptyStr


class Incident(BaseModel):
    """Full incident record — stored in MongoDB and returned by the API."""

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
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class TransportRequest(BaseModel):
    """Payload for transport recommendation."""

    venue_id: ShortStr
    origin: NonEmptyStr
    language: ShortStr = "English"
    accessibility: bool = False


class AccessibilityRouteRequest(BaseModel):
    """Payload for accessibility route planning."""

    venue_id: ShortStr
    entry_gate: ShortStr = "A"
    seat_section: ShortStr = "112"
    needs: List[ShortStr] = Field(default_factory=list)
    language: ShortStr = "English"


class OpsInsightRequest(BaseModel):
    """Payload for ops intelligence and sustainability insight endpoints."""

    venue_id: ShortStr


# ─────────────────────────────────────────────────────────────
# Internal TypedDicts (not serialised to/from HTTP directly)
# ─────────────────────────────────────────────────────────────


class TriageResult(TypedDict):
    """Output of the triage step — both heuristic and AI paths."""

    category: str
    severity: str
    summary: str
    recommended_action: str


class CrowdZone(TypedDict):
    """Per-zone crowd reading."""

    zone: str
    density_pct: int
    occupancy: int
    status: str


class GateSnapshot(TypedDict):
    """Per-gate snapshot."""

    gate: str
    wait_min: int
    flow: str


class CrowdSnapshot(TypedDict):
    """Full crowd snapshot for a venue."""

    venue_id: str
    venue_name: str
    capacity: int
    occupancy: int
    occupancy_pct: float
    zones: list
    gates: list
    ts: str


class SustainabilitySnapshot(TypedDict):
    """Hourly sustainability KPIs for a venue."""

    venue_id: str
    venue_name: str
    waste_diversion_pct: int
    energy_kwh: int
    renewable_pct: int
    water_liters: int
    carbon_kg_co2e: int
    single_use_plastics_kg: int
    recycled_kg: int
    goal_waste_diversion_pct: int
