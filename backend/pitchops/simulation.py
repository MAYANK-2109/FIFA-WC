"""Pure simulation functions for crowd density and sustainability KPIs.

**Design contract**: every function here is *pure* — given the same arguments
it always returns the same result. No ``datetime.now()`` calls, no I/O, no
module-level state. The caller is responsible for providing the current
timestamp so tests can pin time trivially.

Security note:
    ``random`` (Mersenne Twister) is used intentionally here for its
    seed-ability. These functions produce deterministic *simulation* data for
    demo purposes. No secrets, tokens, or auth values are generated here.
    ``secrets`` cannot be seeded and is not appropriate for reproducible demo
    data.
"""

from __future__ import annotations

import hashlib
import random  # nosec B311 — seeded simulation only, not security-sensitive
from typing import Literal

from pitchops.models import (
    CrowdSnapshot,
    CrowdZone,
    GateSnapshot,
    SustainabilitySnapshot,
)

# ─────────────────────────────────────────────────────────────
# Core PRNG helper
# ─────────────────────────────────────────────────────────────


def seeded_rand(*parts: str) -> random.Random:
    """Return a deterministic :class:`random.Random` instance seeded from *parts*.

    The seed is derived by SHA-256-hashing the pipe-joined string, so any
    combination of (venue, bucket, domain) produces a stable but unique PRNG
    state.

    Args:
        *parts: String components to hash together (e.g. venue_id, time bucket).

    Returns:
        A seeded :class:`random.Random` instance.
    """
    seed_hex = hashlib.sha256("|".join(parts).encode()).hexdigest()
    return random.Random(int(seed_hex[:12], 16))


# ─────────────────────────────────────────────────────────────
# Crowd simulation helpers (all pure)
# ─────────────────────────────────────────────────────────────


def zone_status(density_pct: int) -> Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
    """Classify crowd density into an operational status label.

    Args:
        density_pct: Integer percentage in range [0, 100].

    Returns:
        One of ``"CRITICAL"``, ``"HIGH"``, ``"MEDIUM"``, ``"LOW"``.
    """
    if density_pct > 90:
        return "CRITICAL"
    if density_pct > 78:
        return "HIGH"
    if density_pct > 55:
        return "MEDIUM"
    return "LOW"


def build_zone(
    zone_name: str, capacity_per_zone: float, rng: random.Random
) -> CrowdZone:
    """Build a single zone reading from the given RNG state.

    Args:
        zone_name: Compass direction label (e.g. ``"NE"``).
        capacity_per_zone: Nominal occupant capacity for this zone.
        rng: Seeded PRNG (mutated in place — caller controls ordering).

    Returns:
        A :class:`CrowdZone` dict.
    """
    density = rng.randint(35, 96)
    occupancy = int(capacity_per_zone * (density / 100))
    return CrowdZone(
        zone=zone_name,
        density_pct=density,
        occupancy=occupancy,
        status=zone_status(density),
    )


def build_gate(index: int, rng: random.Random) -> GateSnapshot:
    """Build a single gate snapshot from the given RNG state.

    Args:
        index: Zero-based gate index (Gate A = 0, Gate B = 1, …).
        rng: Seeded PRNG.

    Returns:
        A :class:`GateSnapshot` dict.
    """
    return GateSnapshot(
        gate=f"Gate {chr(65 + index)}",
        wait_min=rng.randint(1, 22),
        flow=rng.choice(["INBOUND", "OUTBOUND", "IDLE"]),
    )


def crowd_snapshot(venue: dict, now_ts: float) -> CrowdSnapshot:
    """Compute a full crowd snapshot for a venue at a specific point in time.

    The snapshot is deterministic for a given (venue_id, 30-second bucket) so
    the heatmap "breathes" without being random on every request.

    Args:
        venue: Venue dict from ``VENUES_BY_ID`` (must have ``id``, ``name``,
               ``capacity``, ``zones`` keys).
        now_ts: Current Unix timestamp (seconds). Caller injects this so
                tests can freeze time without monkeypatching.

    Returns:
        A :class:`CrowdSnapshot` dict.
    """
    bucket = int(now_ts // 30)
    rng = seeded_rand(venue["id"], str(bucket))
    capacity_per_zone = venue["capacity"] / len(venue["zones"])

    zones: list[CrowdZone] = [
        build_zone(z, capacity_per_zone, rng) for z in venue["zones"]
    ]
    gates: list[GateSnapshot] = [build_gate(i, rng) for i in range(6)]
    total_occupancy = sum(z["occupancy"] for z in zones)

    return CrowdSnapshot(
        venue_id=venue["id"],
        venue_name=venue["name"],
        capacity=venue["capacity"],
        occupancy=total_occupancy,
        occupancy_pct=round(total_occupancy / venue["capacity"] * 100, 1),
        zones=zones,
        gates=gates,
        ts=_iso_from_ts(now_ts),
    )


# ─────────────────────────────────────────────────────────────
# Sustainability simulation (pure)
# ─────────────────────────────────────────────────────────────


def sustainability_snapshot(venue: dict, now_ts: float) -> SustainabilitySnapshot:
    """Compute hourly sustainability KPIs for a venue.

    Bucketed per hour so the numbers evolve meaningfully between requests
    without changing on every call.

    Args:
        venue: Venue dict (must have ``id``, ``name`` keys).
        now_ts: Current Unix timestamp. Injected for testability.

    Returns:
        A :class:`SustainabilitySnapshot` dict.
    """
    hour_bucket = int(now_ts // 3600)
    rng = seeded_rand(venue["id"], "sust", str(hour_bucket))

    return SustainabilitySnapshot(
        venue_id=venue["id"],
        venue_name=venue["name"],
        waste_diversion_pct=rng.randint(58, 92),
        energy_kwh=rng.randint(48000, 92000),
        renewable_pct=rng.randint(35, 78),
        water_liters=rng.randint(180000, 420000),
        carbon_kg_co2e=rng.randint(24000, 58000),
        single_use_plastics_kg=rng.randint(120, 640),
        recycled_kg=rng.randint(800, 2400),
        goal_waste_diversion_pct=90,
    )


# ─────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────


def _iso_from_ts(ts: float) -> str:
    """Convert a Unix timestamp to an ISO 8601 UTC string."""
    from datetime import datetime, timezone

    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
