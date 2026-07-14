"""Unit tests for pitchops.simulation — pure functions, zero mocking needed.

All tests are deterministic because:
1. Simulation functions are pure (now_ts is injected, not read from system clock).
2. seeded_rand produces identical output for identical inputs.

No env vars, no DB, no LLM, no network required.
"""

from __future__ import annotations

import pytest

from pitchops.simulation import (
    build_gate,
    build_zone,
    crowd_snapshot,
    seeded_rand,
    sustainability_snapshot,
    zone_status,
)

# ────────────────────────────────────────────────────────────────────────────
# Fixtures
# ────────────────────────────────────────────────────────────────────────────

METLIFE = {
    "id": "metlife",
    "name": "MetLife Stadium",
    "city": "New York/New Jersey",
    "country": "USA",
    "capacity": 82500,
    "zones": ["N", "NE", "E", "SE", "S", "SW", "W", "NW"],
}

FIXED_TS = 1_718_150_400.0  # 2026-06-12 00:00:00 UTC — arbitrary but stable


# ────────────────────────────────────────────────────────────────────────────
# seeded_rand
# ────────────────────────────────────────────────────────────────────────────

class TestSeededRand:
    def test_same_parts_same_output(self):
        """Identical parts must always produce the same PRNG state."""
        r1 = seeded_rand("metlife", "12345")
        r2 = seeded_rand("metlife", "12345")
        assert r1.randint(0, 9999) == r2.randint(0, 9999)

    def test_different_parts_different_output(self):
        """Different parts should produce different PRNG states."""
        r1 = seeded_rand("metlife", "12345")
        r2 = seeded_rand("sofi", "12345")
        # Statistically extremely unlikely to collide
        samples_1 = [r1.randint(0, 9999) for _ in range(5)]
        samples_2 = [r2.randint(0, 9999) for _ in range(5)]
        assert samples_1 != samples_2

    def test_returns_random_instance(self):
        """Return type must be random.Random."""
        import random
        assert isinstance(seeded_rand("a"), random.Random)

    def test_single_part(self):
        """Should work with just one part."""
        r = seeded_rand("singlepart")
        val = r.randint(0, 100)
        assert 0 <= val <= 100

    def test_empty_string_part_stable(self):
        """Empty string parts are valid and stable."""
        r1 = seeded_rand("", "x")
        r2 = seeded_rand("", "x")
        assert r1.randint(0, 1000) == r2.randint(0, 1000)


# ────────────────────────────────────────────────────────────────────────────
# zone_status
# ────────────────────────────────────────────────────────────────────────────

class TestZoneStatus:
    @pytest.mark.parametrize("density, expected", [
        (91, "CRITICAL"),
        (100, "CRITICAL"),
        (90, "HIGH"),           # boundary: exactly 90 → HIGH not CRITICAL
        (79, "HIGH"),
        (78, "MEDIUM"),         # boundary: exactly 78 → MEDIUM
        (56, "MEDIUM"),
        (55, "LOW"),            # boundary: exactly 55 → LOW
        (0,  "LOW"),
    ])
    def test_thresholds(self, density: int, expected: str):
        assert zone_status(density) == expected

    def test_all_statuses_reachable(self):
        statuses = {zone_status(d) for d in [100, 85, 65, 30]}
        assert statuses == {"CRITICAL", "HIGH", "MEDIUM", "LOW"}


# ────────────────────────────────────────────────────────────────────────────
# build_zone
# ────────────────────────────────────────────────────────────────────────────

class TestBuildZone:
    def test_keys_present(self):
        rng = seeded_rand("test-zone")
        zone = build_zone("NE", 10000.0, rng)
        assert set(zone.keys()) == {"zone", "density_pct", "occupancy", "status"}

    def test_zone_name_preserved(self):
        rng = seeded_rand("test-zone")
        zone = build_zone("SW", 5000.0, rng)
        assert zone["zone"] == "SW"

    def test_density_in_range(self):
        rng = seeded_rand("range-test")
        for _ in range(20):
            zone = build_zone("N", 8000.0, rng)
            assert 35 <= zone["density_pct"] <= 96

    def test_occupancy_proportional_to_capacity(self):
        rng = seeded_rand("prop-test")
        capacity_per_zone = 10000.0
        zone = build_zone("E", capacity_per_zone, rng)
        expected_max = int(capacity_per_zone * 0.96)
        expected_min = int(capacity_per_zone * 0.35)
        assert expected_min <= zone["occupancy"] <= expected_max

    def test_status_matches_density(self):
        rng = seeded_rand("status-test")
        zone = build_zone("N", 10000.0, rng)
        assert zone["status"] == zone_status(zone["density_pct"])


# ────────────────────────────────────────────────────────────────────────────
# build_gate
# ────────────────────────────────────────────────────────────────────────────

class TestBuildGate:
    def test_keys_present(self):
        rng = seeded_rand("gate-test")
        gate = build_gate(0, rng)
        assert set(gate.keys()) == {"gate", "wait_min", "flow"}

    @pytest.mark.parametrize("index, expected_letter", [(0, "A"), (1, "B"), (5, "F")])
    def test_gate_letter_from_index(self, index: int, expected_letter: str):
        rng = seeded_rand("letter-test")
        gate = build_gate(index, rng)
        assert gate["gate"] == f"Gate {expected_letter}"

    def test_wait_min_in_range(self):
        rng = seeded_rand("wait-test")
        for i in range(10):
            gate = build_gate(i % 6, rng)
            assert 1 <= gate["wait_min"] <= 22

    def test_flow_valid_value(self):
        valid_flows = {"INBOUND", "OUTBOUND", "IDLE"}
        rng = seeded_rand("flow-test")
        for i in range(20):
            gate = build_gate(i % 6, rng)
            assert gate["flow"] in valid_flows


# ────────────────────────────────────────────────────────────────────────────
# crowd_snapshot
# ────────────────────────────────────────────────────────────────────────────

class TestCrowdSnapshot:
    def test_returns_expected_keys(self):
        snap = crowd_snapshot(METLIFE, FIXED_TS)
        for key in ("venue_id", "venue_name", "capacity", "occupancy",
                    "occupancy_pct", "zones", "gates", "ts"):
            assert key in snap, f"Missing key: {key}"

    def test_venue_id_and_name(self):
        snap = crowd_snapshot(METLIFE, FIXED_TS)
        assert snap["venue_id"] == "metlife"
        assert snap["venue_name"] == "MetLife Stadium"

    def test_zone_count_matches_venue(self):
        snap = crowd_snapshot(METLIFE, FIXED_TS)
        assert len(snap["zones"]) == len(METLIFE["zones"])

    def test_gate_count(self):
        snap = crowd_snapshot(METLIFE, FIXED_TS)
        assert len(snap["gates"]) == 6

    def test_occupancy_pct_within_bounds(self):
        snap = crowd_snapshot(METLIFE, FIXED_TS)
        assert 0.0 < snap["occupancy_pct"] < 100.0

    def test_capacity_preserved(self):
        snap = crowd_snapshot(METLIFE, FIXED_TS)
        assert snap["capacity"] == METLIFE["capacity"]

    def test_determinism_same_ts(self):
        """Same venue + same timestamp must yield identical snapshots."""
        snap1 = crowd_snapshot(METLIFE, FIXED_TS)
        snap2 = crowd_snapshot(METLIFE, FIXED_TS)
        assert snap1["zones"] == snap2["zones"]
        assert snap1["gates"] == snap2["gates"]

    def test_different_ts_bucket_different_snapshot(self):
        """Different 30-second buckets must differ in at least one zone."""
        ts_bucket_1 = FIXED_TS
        ts_bucket_2 = FIXED_TS + 31  # next 30-second bucket
        snap1 = crowd_snapshot(METLIFE, ts_bucket_1)
        snap2 = crowd_snapshot(METLIFE, ts_bucket_2)
        densities1 = [z["density_pct"] for z in snap1["zones"]]
        densities2 = [z["density_pct"] for z in snap2["zones"]]
        assert densities1 != densities2

    def test_same_ts_bucket_same_snapshot(self):
        """Two calls within the same 30-second window must be identical."""
        ts1 = FIXED_TS
        ts2 = FIXED_TS + 15  # still same bucket
        snap1 = crowd_snapshot(METLIFE, ts1)
        snap2 = crowd_snapshot(METLIFE, ts2)
        assert snap1["zones"] == snap2["zones"]

    def test_occupancy_sum_matches(self):
        snap = crowd_snapshot(METLIFE, FIXED_TS)
        total = sum(z["occupancy"] for z in snap["zones"])
        assert total == snap["occupancy"]


# ────────────────────────────────────────────────────────────────────────────
# sustainability_snapshot
# ────────────────────────────────────────────────────────────────────────────

class TestSustainabilitySnapshot:
    def test_returns_expected_keys(self):
        snap = sustainability_snapshot(METLIFE, FIXED_TS)
        for key in ("venue_id", "venue_name", "waste_diversion_pct", "energy_kwh",
                    "renewable_pct", "water_liters", "carbon_kg_co2e",
                    "single_use_plastics_kg", "recycled_kg", "goal_waste_diversion_pct"):
            assert key in snap, f"Missing key: {key}"

    def test_goal_waste_diversion_fixed(self):
        snap = sustainability_snapshot(METLIFE, FIXED_TS)
        assert snap["goal_waste_diversion_pct"] == 90

    def test_values_in_realistic_ranges(self):
        snap = sustainability_snapshot(METLIFE, FIXED_TS)
        assert 58 <= snap["waste_diversion_pct"] <= 92
        assert 48000 <= snap["energy_kwh"] <= 92000
        assert 35 <= snap["renewable_pct"] <= 78
        assert 180000 <= snap["water_liters"] <= 420000
        assert 24000 <= snap["carbon_kg_co2e"] <= 58000

    def test_hourly_determinism(self):
        """Two calls within the same hour must produce identical KPIs."""
        ts1 = FIXED_TS
        ts2 = FIXED_TS + 1800  # same hour, +30 minutes
        snap1 = sustainability_snapshot(METLIFE, ts1)
        snap2 = sustainability_snapshot(METLIFE, ts2)
        assert snap1["energy_kwh"] == snap2["energy_kwh"]
        assert snap1["renewable_pct"] == snap2["renewable_pct"]

    def test_different_hours_different_kpis(self):
        ts1 = FIXED_TS
        ts2 = FIXED_TS + 3601  # next hour
        snap1 = sustainability_snapshot(METLIFE, ts1)
        snap2 = sustainability_snapshot(METLIFE, ts2)
        assert snap1["energy_kwh"] != snap2["energy_kwh"]
