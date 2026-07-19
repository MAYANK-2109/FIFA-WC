"""Unit tests for Pydantic model validation in pitchops.models.

Tests focus on edge-cases: boundary values, invalid literals, whitespace
stripping, and optional fields. No network or DB needed.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from pitchops.models import (
    AccessibilityRouteRequest,
    ChatRequest,
    Incident,
    IncidentIn,
    OpsInsightRequest,
    TransportRequest,
)

# ────────────────────────────────────────────────────────────────────────────
# ChatRequest
# ────────────────────────────────────────────────────────────────────────────


class TestChatRequest:
    def test_valid_minimal(self):
        req = ChatRequest(session_id="sess-1", message="Hello")
        assert req.role == "fan"
        assert req.language == "English"
        assert req.venue_id is None

    def test_valid_full(self):
        req = ChatRequest(
            session_id="s1",
            role="organizer",
            language="Spanish",
            venue_id="azteca",
            message="¿Dónde está la salida?",
        )
        assert req.role == "organizer"
        assert req.language == "Spanish"

    def test_whitespace_stripped_from_session_id(self):
        req = ChatRequest(session_id="  sess  ", message="hi")
        assert req.session_id == "sess"

    def test_empty_session_id_raises(self):
        with pytest.raises(ValidationError):
            ChatRequest(session_id="", message="hi")

    def test_empty_message_raises(self):
        with pytest.raises(ValidationError):
            ChatRequest(session_id="s1", message="")

    def test_whitespace_only_message_raises(self):
        with pytest.raises(ValidationError):
            ChatRequest(session_id="s1", message="   ")

    def test_invalid_role_raises(self):
        with pytest.raises(ValidationError):
            ChatRequest(session_id="s1", message="hi", role="superadmin")

    def test_message_max_length_2000(self):
        """Messages up to 2000 chars should be accepted."""
        ChatRequest(session_id="s1", message="x" * 2000)

    def test_message_over_2000_raises(self):
        with pytest.raises(ValidationError):
            ChatRequest(session_id="s1", message="x" * 2001)


# ────────────────────────────────────────────────────────────────────────────
# IncidentIn
# ────────────────────────────────────────────────────────────────────────────


class TestIncidentIn:
    def test_valid_defaults(self):
        inc = IncidentIn(venue_id="metlife", description="Water spill near gate B")
        assert inc.zone == "N"
        assert inc.reporter_role == "fan"

    def test_empty_description_raises(self):
        with pytest.raises(ValidationError):
            IncidentIn(venue_id="metlife", description="")

    def test_empty_venue_id_raises(self):
        with pytest.raises(ValidationError):
            IncidentIn(venue_id="", description="Something happened")

    def test_venue_id_max_64(self):
        """venue_id is a ShortStr — max 64 chars."""
        IncidentIn(venue_id="a" * 64, description="test")

    def test_venue_id_over_64_raises(self):
        with pytest.raises(ValidationError):
            IncidentIn(venue_id="a" * 65, description="test")

    def test_all_valid_reporter_roles(self):
        for role in ("fan", "volunteer", "staff", "organizer"):
            inc = IncidentIn(venue_id="metlife", description="test", reporter_role=role)
            assert inc.reporter_role == role

    def test_invalid_reporter_role_raises(self):
        with pytest.raises(ValidationError):
            IncidentIn(venue_id="metlife", description="test", reporter_role="hacker")

    def test_description_stripped(self):
        inc = IncidentIn(venue_id="metlife", description="  spill  ")
        assert inc.description == "spill"


# ────────────────────────────────────────────────────────────────────────────
# Incident (response model)
# ────────────────────────────────────────────────────────────────────────────


class TestIncident:
    def _valid_kwargs(self, **overrides) -> dict:
        base = dict(
            venue_id="metlife",
            zone="NE",
            reporter_role="fan",
            description="Test incident",
            category="MEDICAL",
            severity="HIGH",
            department="Medical Team",
            ai_summary="Patient collapsed.",
            recommended_action="Dispatch Medical Team.",
        )
        base.update(overrides)
        return base

    def test_auto_generated_id(self):
        inc1 = Incident(**self._valid_kwargs())
        inc2 = Incident(**self._valid_kwargs())
        assert inc1.id != inc2.id  # UUIDs should differ

    def test_default_status_is_open(self):
        inc = Incident(**self._valid_kwargs())
        assert inc.status == "OPEN"

    def test_valid_status_values(self):
        for status in ("OPEN", "IN_PROGRESS", "RESOLVED"):
            inc = Incident(**self._valid_kwargs(), status=status)
            assert inc.status == status

    def test_invalid_status_raises(self):
        with pytest.raises(ValidationError):
            Incident(**self._valid_kwargs(), status="DELETED")

    def test_created_at_is_iso_string(self):
        inc = Incident(**self._valid_kwargs())
        from datetime import datetime

        # Should parse without error
        datetime.fromisoformat(inc.created_at)

    def test_model_dump_round_trip(self):
        """model_dump() → Incident(**) must produce an identical object."""
        inc = Incident(**self._valid_kwargs())
        restored = Incident(**inc.model_dump())
        assert restored.id == inc.id
        assert restored.category == inc.category


# ────────────────────────────────────────────────────────────────────────────
# TransportRequest
# ────────────────────────────────────────────────────────────────────────────


class TestTransportRequest:
    def test_defaults(self):
        req = TransportRequest(venue_id="metlife", origin="Times Square")
        assert req.language == "English"
        assert req.accessibility is False

    def test_accessibility_flag(self):
        req = TransportRequest(
            venue_id="metlife", origin="Newark Penn", accessibility=True
        )
        assert req.accessibility is True

    def test_empty_origin_raises(self):
        with pytest.raises(ValidationError):
            TransportRequest(venue_id="metlife", origin="")

    def test_empty_venue_raises(self):
        with pytest.raises(ValidationError):
            TransportRequest(venue_id="", origin="Times Square")


# ────────────────────────────────────────────────────────────────────────────
# AccessibilityRouteRequest
# ────────────────────────────────────────────────────────────────────────────


class TestAccessibilityRouteRequest:
    def test_defaults(self):
        req = AccessibilityRouteRequest(venue_id="metlife")
        assert req.entry_gate == "A"
        assert req.seat_section == "112"
        assert req.needs == []
        assert req.language == "English"

    def test_needs_list(self):
        req = AccessibilityRouteRequest(
            venue_id="metlife",
            needs=["wheelchair", "hearing_loop"],
        )
        assert len(req.needs) == 2

    def test_empty_venue_raises(self):
        with pytest.raises(ValidationError):
            AccessibilityRouteRequest(venue_id="")


# ────────────────────────────────────────────────────────────────────────────
# OpsInsightRequest
# ────────────────────────────────────────────────────────────────────────────


class TestOpsInsightRequest:
    def test_valid(self):
        req = OpsInsightRequest(venue_id="azteca")
        assert req.venue_id == "azteca"

    def test_empty_venue_raises(self):
        with pytest.raises(ValidationError):
            OpsInsightRequest(venue_id="")
