"""Unit tests for pitchops.triage — heuristic (pure) and AI (injected LLM).

Testing strategy:
- Heuristic functions: no mocking required (pure functions).
- AI triage: LLM injected as a simple async lambda — no patching, no fixtures.

No env vars, no DB, no network required.
"""

from __future__ import annotations

import json
import pytest

from pitchops.triage import ai_triage, heuristic_triage, match_rule, parse_triage_json


# ────────────────────────────────────────────────────────────────────────────
# match_rule
# ────────────────────────────────────────────────────────────────────────────

SAMPLE_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("MEDICAL",  ("injur", "hurt", "medic", "unconscious")),
    ("SECURITY", ("fight", "weapon", "threat")),
]

class TestMatchRule:
    def test_first_match_wins(self):
        assert match_rule("person unconscious near gate", SAMPLE_RULES, "OTHER") == "MEDICAL"

    def test_default_when_no_match(self):
        assert match_rule("broken toilet", SAMPLE_RULES, "OTHER") == "OTHER"

    def test_case_sensitivity(self):
        """Rules operate on the caller's text; caller should pass lowercased text."""
        assert match_rule("Injur", SAMPLE_RULES, "OTHER") == "OTHER"   # uppercase → no match
        assert match_rule("injur", SAMPLE_RULES, "OTHER") == "MEDICAL" # lowercase → match

    def test_partial_keyword_match(self):
        """Keyword 'injur' matches 'injured'."""
        assert match_rule("patient is injured", SAMPLE_RULES, "OTHER") == "MEDICAL"

    def test_multiple_rules_match_first_wins(self):
        """If both MEDICAL and SECURITY keywords appear, MEDICAL (first) wins."""
        text = "unconscious person near weapon"
        assert match_rule(text, SAMPLE_RULES, "OTHER") == "MEDICAL"

    def test_empty_rules_returns_default(self):
        assert match_rule("anything", [], "FALLBACK") == "FALLBACK"


# ────────────────────────────────────────────────────────────────────────────
# heuristic_triage
# ────────────────────────────────────────────────────────────────────────────

class TestHeuristicTriage:
    def test_medical_category(self):
        result = heuristic_triage("Person fainted near section 103")
        assert result["category"] == "MEDICAL"

    def test_security_category(self):
        result = heuristic_triage("There is a fight breaking out in zone SW")
        assert result["category"] == "SECURITY"

    def test_lost_item_category(self):
        result = heuristic_triage("I lost my backpack near Gate B")
        assert result["category"] == "LOST_ITEM"

    def test_crowd_category(self):
        result = heuristic_triage("Crowd surge near the south entrance causing a blockage")
        assert result["category"] == "CROWD"

    def test_facilities_category(self):
        result = heuristic_triage("Restroom is flooded and broken")
        assert result["category"] == "FACILITIES"

    def test_transport_category(self):
        result = heuristic_triage("The shuttle bus is not showing up")
        assert result["category"] == "TRANSPORT"

    def test_accessibility_category(self):
        result = heuristic_triage("Wheelchair ramp is inaccessible due to a cart")
        assert result["category"] == "ACCESSIBILITY"

    def test_other_category_fallback(self):
        result = heuristic_triage("Some generic unknown report")
        assert result["category"] == "OTHER"

    def test_critical_severity(self):
        result = heuristic_triage("URGENT: person is unconscious and not breathing")
        assert result["severity"] == "CRITICAL"

    def test_high_severity(self):
        result = heuristic_triage("Someone is injured and bleeding")
        assert result["severity"] == "HIGH"

    def test_medium_severity_default(self):
        result = heuristic_triage("Water spilled near section 118")
        assert result["severity"] == "MEDIUM"

    def test_summary_truncated_to_140(self):
        long_desc = "x" * 300
        result = heuristic_triage(long_desc)
        assert len(result["summary"]) <= 140

    def test_recommended_action_contains_department(self):
        result = heuristic_triage("Person is injured and bleeding")
        assert "Medical Team" in result["recommended_action"]

    def test_all_required_keys_present(self):
        result = heuristic_triage("Test incident")
        assert set(result.keys()) == {"category", "severity", "summary", "recommended_action"}


# ────────────────────────────────────────────────────────────────────────────
# parse_triage_json
# ────────────────────────────────────────────────────────────────────────────

class TestParseTriageJson:
    def _valid_json(self, **overrides) -> str:
        base = {
            "category": "MEDICAL",
            "severity": "HIGH",
            "summary": "Patient collapsed.",
            "recommended_action": "Dispatch Medical Team immediately.",
        }
        base.update(overrides)
        return json.dumps(base)

    def test_parses_valid_json(self):
        result = parse_triage_json(self._valid_json())
        assert result is not None
        assert result["category"] == "MEDICAL"
        assert result["severity"] == "HIGH"

    def test_strips_code_fence(self):
        raw = f"```json\n{self._valid_json()}\n```"
        result = parse_triage_json(raw)
        assert result is not None
        assert result["category"] == "MEDICAL"

    def test_strips_backtick_fence_no_lang(self):
        raw = f"```\n{self._valid_json()}\n```"
        result = parse_triage_json(raw)
        assert result is not None

    def test_invalid_category_defaults_to_other(self):
        result = parse_triage_json(self._valid_json(category="UNKNOWN_CAT"))
        assert result is not None
        assert result["category"] == "OTHER"

    def test_invalid_severity_defaults_to_medium(self):
        result = parse_triage_json(self._valid_json(severity="EXTREME"))
        assert result is not None
        assert result["severity"] == "MEDIUM"

    def test_category_normalised_to_uppercase(self):
        result = parse_triage_json(self._valid_json(category="medical"))
        assert result is not None
        assert result["category"] == "MEDICAL"

    def test_returns_none_on_invalid_json(self):
        assert parse_triage_json("not json at all") is None

    def test_returns_none_on_empty_string(self):
        assert parse_triage_json("") is None

    def test_summary_truncated_to_200(self):
        result = parse_triage_json(self._valid_json(summary="x" * 300))
        assert result is not None
        assert len(result["summary"]) <= 200

    def test_recommended_action_truncated_to_220(self):
        result = parse_triage_json(self._valid_json(recommended_action="y" * 300))
        assert result is not None
        assert len(result["recommended_action"]) <= 220

    def test_missing_keys_use_defaults(self):
        result = parse_triage_json("{}")
        assert result is not None
        assert result["category"] == "OTHER"
        assert result["severity"] == "MEDIUM"


# ────────────────────────────────────────────────────────────────────────────
# ai_triage — injected LLM (no mocking framework needed)
# ────────────────────────────────────────────────────────────────────────────

class TestAiTriage:
    """Tests for the async ai_triage function with injected llm_fn."""

    @pytest.mark.asyncio
    async def test_uses_llm_result_when_valid(self):
        """When LLM returns valid JSON, that result should be used."""
        llm_response = json.dumps({
            "category": "SECURITY",
            "severity": "CRITICAL",
            "summary": "Weapon spotted near Gate C.",
            "recommended_action": "Dispatch Security Command immediately.",
        })

        async def mock_llm(system: str, user: str) -> str:
            return llm_response

        result = await ai_triage("weapon spotted", "staff", "MetLife Stadium", mock_llm)
        assert result["category"] == "SECURITY"
        assert result["severity"] == "CRITICAL"

    @pytest.mark.asyncio
    async def test_falls_back_to_heuristic_on_llm_error(self):
        """When LLM raises an exception, heuristic fallback is used silently."""
        async def failing_llm(system: str, user: str) -> str:
            raise RuntimeError("LLM quota exceeded")

        result = await ai_triage(
            "Person is injured and bleeding",
            "fan",
            "SoFi Stadium",
            failing_llm,
        )
        # Heuristic should classify as MEDICAL / HIGH
        assert result["category"] == "MEDICAL"
        assert result["severity"] == "HIGH"

    @pytest.mark.asyncio
    async def test_falls_back_to_heuristic_on_invalid_json(self):
        """When LLM returns unparseable text, heuristic fallback is used."""
        async def bad_json_llm(system: str, user: str) -> str:
            return "Sorry, I cannot process this."

        result = await ai_triage(
            "Lost backpack near section 201",
            "fan",
            "Azteca",
            bad_json_llm,
        )
        assert result["category"] == "LOST_ITEM"

    @pytest.mark.asyncio
    async def test_empty_summary_filled_from_description(self):
        """An empty summary in the LLM response should be filled from description."""
        llm_response = json.dumps({
            "category": "FACILITIES",
            "severity": "LOW",
            "summary": "",
            "recommended_action": "Dispatch Facilities.",
        })

        async def mock_llm(system: str, user: str) -> str:
            return llm_response

        desc = "Restroom light is flickering"
        result = await ai_triage(desc, "volunteer", "Gillette", mock_llm)
        assert result["summary"] != ""
        assert desc[:200] == result["summary"]

    @pytest.mark.asyncio
    async def test_llm_fn_receives_correct_venue_name(self):
        """Verify venue_name is passed through to the LLM user prompt."""
        captured: list[str] = []

        async def capturing_llm(system: str, user: str) -> str:
            captured.append(user)
            raise RuntimeError("force heuristic")

        await ai_triage("crowd pushing", "fan", "AT&T Stadium", capturing_llm)
        assert "AT&T Stadium" in captured[0]

    @pytest.mark.asyncio
    async def test_result_always_has_required_keys(self):
        """Result always has all four required keys regardless of LLM outcome."""
        async def mock_llm(system: str, user: str) -> str:
            return json.dumps({"category": "OTHER", "severity": "LOW",
                               "summary": "x", "recommended_action": "y"})

        result = await ai_triage("test", "fan", "BMO Field", mock_llm)
        assert set(result.keys()) == {"category", "severity", "summary", "recommended_action"}
