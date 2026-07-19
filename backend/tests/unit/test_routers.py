"""Unit tests for pitchops endpoints and app factory."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from pitchops.main import app, create_app


@pytest.fixture
def mock_db_clients():
    with patch("pitchops.main.AsyncIOMotorClient") as mock_mongo:
        mock_client = MagicMock()
        mock_db = MagicMock()
        mock_incidents = AsyncMock()
        mock_messages = AsyncMock()

        mock_mongo.return_value = mock_client
        mock_client.__getitem__.return_value = mock_db
        mock_db.incidents = mock_incidents
        mock_db.chat_messages = mock_messages
        yield mock_mongo


@pytest.fixture
def client(mock_db_clients):
    # Using `with` triggers the startup and shutdown events
    with TestClient(app) as c:
        yield c


def test_root(client):
    res = client.get("/api/")
    assert res.status_code == 200
    assert res.json()["service"] == "PITCH.OPS"


def test_venues(client):
    res = client.get("/api/venues")
    assert res.status_code == 200
    assert "venues" in res.json()


def test_matches(client):
    res = client.get("/api/matches")
    assert res.status_code == 200
    assert "matches" in res.json()


def test_crowd(client):
    res = client.get("/api/crowd/metlife")
    assert res.status_code == 200
    assert res.json()["venue_id"] == "metlife"


def test_crowd_404(client):
    res = client.get("/api/crowd/invalid")
    assert res.status_code == 404


def test_sustainability(client):
    res = client.get("/api/sustainability/metlife")
    assert res.status_code == 200
    assert "waste_diversion_pct" in res.json()


def test_sustainability_404(client):
    res = client.get("/api/sustainability/invalid")
    assert res.status_code == 404


def test_create_incident(client):
    # Patch the LLM to return a valid JSON structure for triage
    async def mock_llm(*args, **kwargs):
        return (
            '{"category": "MEDICAL", "severity": "HIGH",'
            ' "summary": "test", "recommended_action": "test"}'
        )

    app.state.llm_fn = mock_llm

    res = client.post(
        "/api/incidents",
        json={
            "venue_id": "metlife",
            "zone": "N",
            "reporter_role": "fan",
            "description": "Test incident",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["category"] == "MEDICAL"
    assert data["severity"] == "HIGH"

    # DB insert should be called
    app.state.incidents_col.insert_one.assert_called_once()


def test_list_incidents(client):
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    valid_incident = {
        "id": "1",
        "venue_id": "metlife",
        "zone": "A",
        "reporter_role": "fan",
        "description": "test",
        "status": "OPEN",
        "category": "MEDICAL",
        "severity": "LOW",
        "summary": "test",
        "recommended_action": "test",
        "department": "MEDICAL",
        "ai_summary": "test",
        "created_at": "2026-07-14T10:00:00Z",
    }
    mock_cursor.to_list = AsyncMock(return_value=[valid_incident])
    app.state.incidents_col.find = MagicMock(return_value=mock_cursor)

    res = client.get("/api/incidents")
    assert res.status_code == 200
    assert len(res.json()) == 1


def test_update_incident(client):
    mock_result = MagicMock()
    mock_result.matched_count = 1
    app.state.incidents_col.update_one.return_value = mock_result

    res = client.patch("/api/incidents/123?status=RESOLVED")
    assert res.status_code == 200
    assert res.json()["status"] == "RESOLVED"


def test_update_incident_not_found(client):
    mock_result = MagicMock()
    mock_result.matched_count = 0
    app.state.incidents_col.update_one.return_value = mock_result

    res = client.patch("/api/incidents/123?status=RESOLVED")
    assert res.status_code == 404


def test_ops_insights(client):
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=[])
    app.state.incidents_col.find = MagicMock(return_value=mock_cursor)

    async def mock_llm(*args, **kwargs):
        return "Ops briefing test"

    app.state.llm_fn = mock_llm

    res = client.post("/api/ops/insights", json={"venue_id": "metlife"})
    assert res.status_code == 200
    assert res.json()["briefing"] == "Ops briefing test"


def test_ops_insights_llm_failure(client):
    # Test fallback
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=[])
    app.state.incidents_col.find = MagicMock(return_value=mock_cursor)

    async def mock_llm_fail(*args, **kwargs):
        raise RuntimeError("LLM error")

    app.state.llm_fn = mock_llm_fail

    res = client.post("/api/ops/insights", json={"venue_id": "metlife"})
    assert res.status_code == 200
    assert "Occupancy at" in res.json()["briefing"]


def test_transport(client):
    async def mock_llm(*args, **kwargs):
        return "Metro: fast"

    app.state.llm_fn = mock_llm

    res = client.post(
        "/api/transport/recommend",
        json={
            "venue_id": "metlife",
            "origin": "NYC",
            "accessibility": False,
            "language": "English",
        },
    )
    assert res.status_code == 200
    assert res.json()["recommendation"] == "Metro: fast"


def test_transport_llm_failure(client):
    async def mock_llm_fail(*args, **kwargs):
        raise RuntimeError("LLM error")

    app.state.llm_fn = mock_llm_fail

    res = client.post(
        "/api/transport/recommend",
        json={
            "venue_id": "metlife",
            "origin": "NYC",
            "accessibility": False,
            "language": "English",
        },
    )
    assert res.status_code == 200
    assert "fastest low-carbon option" in res.json()["recommendation"]


def test_accessibility(client):
    async def mock_llm(*args, **kwargs):
        return "Step 1: Go left"

    app.state.llm_fn = mock_llm

    res = client.post(
        "/api/accessibility/route",
        json={
            "venue_id": "metlife",
            "entry_gate": "A",
            "seat_section": "100",
            "needs": [],
            "language": "English",
        },
    )
    assert res.status_code == 200
    assert res.json()["route"] == "Step 1: Go left"


def test_accessibility_llm_failure(client):
    async def mock_llm_fail(*args, **kwargs):
        raise RuntimeError("LLM error")

    app.state.llm_fn = mock_llm_fail

    res = client.post(
        "/api/accessibility/route",
        json={
            "venue_id": "metlife",
            "entry_gate": "A",
            "seat_section": "100",
            "needs": [],
            "language": "English",
        },
    )
    assert res.status_code == 200
    assert "Enter through accessible entrance" in res.json()["route"]


def test_sustainability_insights(client):
    async def mock_llm(*args, **kwargs):
        return "Sust briefing"

    app.state.llm_fn = mock_llm

    res = client.post("/api/sustainability/insights", json={"venue_id": "metlife"})
    assert res.status_code == 200
    assert res.json()["narrative"] == "Sust briefing"


def test_sustainability_insights_llm_failure(client):
    async def mock_llm_fail(*args, **kwargs):
        raise RuntimeError("LLM error")

    app.state.llm_fn = mock_llm_fail

    res = client.post("/api/sustainability/insights", json={"venue_id": "metlife"})
    assert res.status_code == 200
    assert "Renewables at" in res.json()["narrative"]


def test_concierge_history(client):
    mock_cursor = MagicMock()
    mock_cursor.sort.return_value = mock_cursor
    mock_cursor.to_list = AsyncMock(return_value=[{"role": "user", "content": "hi"}])
    app.state.messages_col.find = MagicMock(return_value=mock_cursor)

    res = client.get("/api/concierge/history?session_id=123")
    assert res.status_code == 200
    assert res.json()["messages"] == [{"role": "user", "content": "hi"}]


def test_concierge_chat(client):
    with patch("pitchops.routers.concierge.make_llm_client") as mock_make:
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Hello there"
        mock_client.models.generate_content_stream.return_value = [mock_response]
        mock_make.return_value = mock_client

        # Test client does not handle streaming generator perfectly
        # out of the box with .post, but it will collect all chunks.
        res = client.post(
            "/api/concierge/chat",
            json={
                "session_id": "s1",
                "message": "hi",
                "role": "fan",
                "language": "English",
                "venue_id": "metlife",
            },
        )

        assert res.status_code == 200
        text = res.text
        assert "data: Hello there" in text
        assert "event: done" in text

        # Verify persistence was called
        app.state.messages_col.insert_one.assert_called()


def test_concierge_chat_fallback(client):
    with patch("pitchops.routers.concierge.make_llm_client") as mock_make:
        mock_client = MagicMock()

        def fail_stream(*args, **kwargs):
            yield  # make it a generator
            raise RuntimeError("Rate limit")


        mock_client.models.generate_content_stream.side_effect = fail_stream
        mock_make.return_value = mock_client

        res = client.post(
            "/api/concierge/chat",
            json={
                "session_id": "s1",
                "message": "hi",
                "role": "fan",
                "language": "English",
                "venue_id": "metlife",
            },
        )

        assert res.status_code == 200
        text = res.text
        assert "data: The AI concierge is currently unavailable" in text
        assert "event: done" in text


def test_concierge_chat_no_key(mock_db_clients):
    with patch("pitchops.main.get_settings") as mock_get_settings:
        mock_get_settings.return_value = MagicMock(
            google_api_key="",
            mongo_url="mongodb://localhost",
            db_name="test",
            llm_concurrency=10,
        )
        app_no_key = create_app()

        with TestClient(app_no_key) as c:
            res = c.post(
                "/api/concierge/chat",
                json={
                    "session_id": "s1",
                    "message": "hi",
                    "role": "fan",
                    "language": "English",
                    "venue_id": "metlife",
                },
            )
            assert res.status_code == 503
            assert "LLM key not configured" in res.json()["detail"]


def test_startup_without_llm_key(mock_db_clients):
    with patch("pitchops.main.get_settings") as mock_get_settings:
        mock_settings = MagicMock(
            google_api_key="",
            mongo_url="mongodb://localhost",
            db_name="test",
            llm_concurrency=10,
        )
        mock_get_settings.return_value = mock_settings

        app_no_key = create_app()
        with TestClient(app_no_key) as _:
            pass  # startup succeeds

        # Test the fallback llm_fn raises RuntimeError
        import asyncio

        import pytest

        with pytest.raises(RuntimeError, match="LLM key not configured"):
            asyncio.run(app_no_key.state.llm_fn("system", "user"))


def test_startup_seed_demo_incident(mock_db_clients):
    with patch("pitchops.main.get_settings") as mock_get_settings:
        mock_settings = MagicMock(
            google_api_key="",
            mongo_url="mongodb://localhost",
            db_name="test",
            llm_concurrency=10,
        )
        mock_get_settings.return_value = mock_settings

        app_seed = create_app()

        # Mock count to return 0 so it seeds
        mock_inc = mock_db_clients.return_value.__getitem__.return_value.incidents
        mock_inc.count_documents = AsyncMock(return_value=0)

        with patch("pitchops.services.db.create_indexes", new_callable=AsyncMock):
            with TestClient(app_seed) as _:
                pass

        mock_inc.insert_one.assert_called_once()
