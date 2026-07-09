"""PITCH.OPS backend end-to-end API tests.

Covers: venues, matches, crowd (determinism + 404), sustainability, incidents
(triage + validation + list + patch), ops insights, transport advisor,
accessibility route, sustainability insights, concierge streaming SSE + history.
"""

import json
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
if not BASE_URL:
    # fall back to reading frontend/.env
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

TIMEOUT = 60


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ─────── reference data ───────

class TestReferenceData:
    def test_root(self, client):
        r = client.get(f"{BASE_URL}/api/", timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json().get("service") == "PITCH.OPS"

    def test_venues(self, client):
        r = client.get(f"{BASE_URL}/api/venues", timeout=TIMEOUT)
        assert r.status_code == 200
        venues = r.json()["venues"]
        assert len(venues) == 16
        v0 = venues[0]
        for key in ("id", "city", "country", "name", "capacity", "zones"):
            assert key in v0, f"missing field {key}"
        assert len(v0["zones"]) == 8

    def test_matches(self, client):
        r = client.get(f"{BASE_URL}/api/matches", timeout=TIMEOUT)
        assert r.status_code == 200
        matches = r.json()["matches"]
        assert len(matches) == 6
        for m in matches:
            for key in ("id", "home", "away", "venue_id", "status", "score"):
                assert key in m


# ─────── crowd ───────

class TestCrowd:
    def test_crowd_snapshot(self, client):
        r = client.get(f"{BASE_URL}/api/crowd/metlife", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        assert d["capacity"] > 0
        assert "occupancy_pct" in d
        assert len(d["zones"]) == 8
        z0 = d["zones"][0]
        for key in ("zone", "density_pct", "occupancy", "status"):
            assert key in z0
        assert len(d["gates"]) >= 1
        g0 = d["gates"][0]
        for key in ("gate", "wait_min", "flow"):
            assert key in g0

    def test_crowd_deterministic_within_30s(self, client):
        r1 = client.get(f"{BASE_URL}/api/crowd/sofi", timeout=TIMEOUT).json()
        r2 = client.get(f"{BASE_URL}/api/crowd/sofi", timeout=TIMEOUT).json()
        # zones should be identical within 30s bucket
        assert [z["density_pct"] for z in r1["zones"]] == [z["density_pct"] for z in r2["zones"]]

    def test_crowd_404(self, client):
        r = client.get(f"{BASE_URL}/api/crowd/unknown", timeout=TIMEOUT)
        assert r.status_code == 404


# ─────── sustainability ───────

class TestSustainability:
    def test_sustainability(self, client):
        r = client.get(f"{BASE_URL}/api/sustainability/metlife", timeout=TIMEOUT)
        assert r.status_code == 200
        d = r.json()
        for k in ("waste_diversion_pct", "energy_kwh", "renewable_pct",
                  "water_liters", "carbon_kg_co2e", "single_use_plastics_kg",
                  "recycled_kg", "goal_waste_diversion_pct"):
            assert k in d, f"missing {k}"
        assert d["goal_waste_diversion_pct"] == 90


# ─────── incidents ───────

class TestIncidents:
    created_ids = []

    def test_medical_triage(self, client):
        r = client.post(f"{BASE_URL}/api/incidents", json={
            "venue_id": "metlife",
            "zone": "N",
            "reporter_role": "fan",
            "description": "TEST_Person collapsed, unconscious near section 118",
        }, timeout=90)
        assert r.status_code == 200
        d = r.json()
        assert d["category"] == "MEDICAL"
        assert d["severity"] in ("HIGH", "CRITICAL")
        assert d["department"] == "Medical Team"
        assert d["ai_summary"]
        assert d["recommended_action"]
        assert d["status"] == "OPEN"
        TestIncidents.created_ids.append(d["id"])

    def test_lost_item_triage(self, client):
        r = client.post(f"{BASE_URL}/api/incidents", json={
            "venue_id": "metlife",
            "zone": "SE",
            "reporter_role": "fan",
            "description": "TEST_I lost my backpack near Gate B",
        }, timeout=90)
        assert r.status_code == 200
        d = r.json()
        assert d["category"] == "LOST_ITEM"
        TestIncidents.created_ids.append(d["id"])

    def test_empty_description_422(self, client):
        r = client.post(f"{BASE_URL}/api/incidents", json={
            "venue_id": "metlife",
            "zone": "N",
            "reporter_role": "fan",
            "description": "",
        }, timeout=TIMEOUT)
        assert r.status_code == 422

    def test_unknown_venue_404(self, client):
        r = client.post(f"{BASE_URL}/api/incidents", json={
            "venue_id": "nowhere",
            "zone": "N",
            "reporter_role": "fan",
            "description": "TEST_test",
        }, timeout=TIMEOUT)
        assert r.status_code == 404

    def test_list_incidents(self, client):
        r = client.get(f"{BASE_URL}/api/incidents", timeout=TIMEOUT)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list) and len(arr) >= 1
        # sorted newest first (created_at desc)
        ts = [i["created_at"] for i in arr]
        assert ts == sorted(ts, reverse=True)

    def test_list_incidents_filter(self, client):
        r = client.get(f"{BASE_URL}/api/incidents?venue_id=metlife", timeout=TIMEOUT)
        assert r.status_code == 200
        arr = r.json()
        assert all(i["venue_id"] == "metlife" for i in arr)

    def test_patch_status(self, client):
        if not TestIncidents.created_ids:
            pytest.skip("no incident created")
        iid = TestIncidents.created_ids[0]
        r1 = client.patch(f"{BASE_URL}/api/incidents/{iid}?status=IN_PROGRESS", timeout=TIMEOUT)
        assert r1.status_code == 200
        assert r1.json()["status"] == "IN_PROGRESS"
        r2 = client.patch(f"{BASE_URL}/api/incidents/{iid}?status=RESOLVED", timeout=TIMEOUT)
        assert r2.status_code == 200
        assert r2.json()["status"] == "RESOLVED"

    def test_patch_unknown_404(self, client):
        r = client.patch(f"{BASE_URL}/api/incidents/does-not-exist?status=RESOLVED", timeout=TIMEOUT)
        assert r.status_code == 404


# ─────── ops insights ───────

class TestOpsInsights:
    def test_ops_insights(self, client):
        r = client.post(f"{BASE_URL}/api/ops/insights", json={"venue_id": "metlife"}, timeout=120)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["briefing"], str) and len(d["briefing"]) > 0
        assert isinstance(d["hot_zones"], list)
        assert isinstance(d["open_incidents"], int)


# ─────── transport ───────

class TestTransport:
    def test_transport(self, client):
        r = client.post(f"{BASE_URL}/api/transport/recommend", json={
            "venue_id": "metlife",
            "origin": "Times Square",
            "language": "English",
            "accessibility": False,
        }, timeout=120)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["options"], list) and len(d["options"]) >= 1
        assert isinstance(d["recommendation"], str) and d["recommendation"]

    def test_transport_accessibility_excludes_bike(self, client):
        r = client.post(f"{BASE_URL}/api/transport/recommend", json={
            "venue_id": "metlife",
            "origin": "Newark Penn",
            "language": "English",
            "accessibility": True,
        }, timeout=120)
        assert r.status_code == 200
        modes = [o["mode"] for o in r.json()["options"]]
        assert not any("Bike" in m for m in modes)


# ─────── accessibility ───────

class TestAccessibility:
    def test_route(self, client):
        r = client.post(f"{BASE_URL}/api/accessibility/route", json={
            "venue_id": "metlife",
            "entry_gate": "A",
            "seat_section": "112",
            "needs": ["wheelchair"],
            "language": "English",
        }, timeout=120)
        assert r.status_code == 200
        d = r.json()
        route = d["route"]
        assert isinstance(route, str) and len(route) > 10
        low = route.lower()
        assert any(w in low for w in ("step", "gate", "elevator", "ramp", "concourse", "seat"))


# ─────── sustainability insights ───────

class TestSustainabilityInsights:
    def test_insights(self, client):
        r = client.post(f"{BASE_URL}/api/sustainability/insights", json={"venue_id": "metlife"}, timeout=120)
        assert r.status_code == 200
        d = r.json()
        assert "kpis" in d and isinstance(d["kpis"], dict)
        assert "narrative" in d and isinstance(d["narrative"], str) and d["narrative"]


# ─────── concierge SSE + history ───────

class TestConcierge:
    def test_sse_stream_english(self, client):
        session_id = f"TEST_{uuid.uuid4()}"
        with requests.post(
            f"{BASE_URL}/api/concierge/chat",
            json={"session_id": session_id, "role": "fan", "language": "English",
                  "venue_id": "metlife", "message": "Where are the restrooms?"},
            stream=True, timeout=120,
        ) as resp:
            assert resp.status_code == 200
            ct = resp.headers.get("Content-Type", "")
            assert "text/event-stream" in ct, f"got {ct}"
            # X-Accel-Buffering is set by backend but may be stripped by upstream proxy (Cloudflare).
            # Soft-check: presence is nice-to-have, absence at ingress is not a backend bug.
            _ = resp.headers.get("X-Accel-Buffering")
            got_data = False
            got_done = False
            for raw in resp.iter_lines(decode_unicode=True):
                if not raw:
                    continue
                if raw.startswith("data:"):
                    got_data = True
                if raw.strip() == "event: done":
                    got_done = True
                    break
            assert got_data, "no data frames"
            assert got_done, "no done frame"

        # follow-up preserves history
        with requests.post(
            f"{BASE_URL}/api/concierge/chat",
            json={"session_id": session_id, "role": "fan", "language": "English",
                  "venue_id": "metlife", "message": "And the closest one to Gate A?"},
            stream=True, timeout=120,
        ) as resp2:
            assert resp2.status_code == 200
            for raw in resp2.iter_lines(decode_unicode=True):
                if raw and raw.strip() == "event: done":
                    break

        # small sleep to ensure persistence
        time.sleep(1)
        h = client.get(f"{BASE_URL}/api/concierge/history?session_id={session_id}", timeout=TIMEOUT).json()
        msgs = h["messages"]
        assert len(msgs) >= 2, f"expected >=2 messages, got {len(msgs)}"

    def test_sse_spanish(self, client):
        session_id = f"TEST_ES_{uuid.uuid4()}"
        with requests.post(
            f"{BASE_URL}/api/concierge/chat",
            json={"session_id": session_id, "role": "fan", "language": "Spanish",
                  "venue_id": "azteca", "message": "¿Dónde están los baños accesibles?"},
            stream=True, timeout=120,
        ) as resp:
            assert resp.status_code == 200
            chunks = []
            for raw in resp.iter_lines(decode_unicode=True):
                if raw and raw.startswith("data:"):
                    chunks.append(raw[5:].strip())
                if raw and raw.strip() == "event: done":
                    break
            body = " ".join(chunks).lower()
            # spanish response: look for common spanish words
            assert any(w in body for w in ("baño", "acces", "por favor", "gate", "elevad", "ubicad", "está", "encuentra", "para", "hay"))

    def test_history_endpoint(self, client):
        session_id = f"TEST_H_{uuid.uuid4()}"
        # empty session
        r = client.get(f"{BASE_URL}/api/concierge/history?session_id={session_id}", timeout=TIMEOUT)
        assert r.status_code == 200
        assert r.json()["messages"] == []
