"""Incident triage — heuristic (pure) and AI-assisted (injected LLM).

Architecture:
- ``match_rule``, ``heuristic_triage``, ``parse_triage_json`` are **pure
  functions** with no I/O. They can be unit-tested without any mocking.
- ``ai_triage`` accepts an injectable ``llm_fn`` coroutine so tests can
  mock the LLM with a single lambda — no patching needed.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Awaitable, Callable

from pitchops.constants import (
    ALLOWED_CATEGORIES,
    ALLOWED_SEVERITIES,
    CATEGORY_RULES,
    DEPARTMENTS,
    SEVERITY_RULES,
)
from pitchops.models import TriageResult

logger = logging.getLogger("pitchops.triage")


# ─────────────────────────────────────────────────────────────
# Pure helpers
# ─────────────────────────────────────────────────────────────


def match_rule(
    text: str,
    rules: list[tuple[str, tuple[str, ...]]],
    default: str,
) -> str:
    """Return the label of the first rule whose keywords appear in *text*.

    Args:
        text: Lower-cased incident description to search.
        rules: Ordered list of ``(label, keyword_tuple)`` pairs.
        default: Label returned if no rule matches.

    Returns:
        Matched label string, or ``default``.
    """
    for label, keywords in rules:
        if any(word in text for word in keywords):
            return label
    return default


def heuristic_triage(description: str) -> TriageResult:
    """Classify an incident description using keyword rules (no I/O).

    Used as the fallback when the LLM is unavailable or returns unparseable
    output.

    Args:
        description: Raw reporter text.

    Returns:
        A :class:`TriageResult` dict with ``category``, ``severity``,
        ``summary``, and ``recommended_action``.
    """
    low = description.lower()
    category = match_rule(low, CATEGORY_RULES, "OTHER")
    severity = match_rule(low, SEVERITY_RULES, "MEDIUM")
    return TriageResult(
        category=category,
        severity=severity,
        summary=description[:140],
        recommended_action=f"Dispatch {DEPARTMENTS[category]} to reported location.",
    )


def parse_triage_json(raw: str) -> TriageResult | None:
    """Parse the LLM's JSON triage response into a :class:`TriageResult`.

    Strips code fences, validates enum values, and truncates strings to safe
    lengths. Returns ``None`` on any parse failure so callers can fall back
    gracefully.

    Args:
        raw: Raw string returned by the LLM.

    Returns:
        A :class:`TriageResult` if the JSON is valid, otherwise ``None``.
    """
    text = raw.strip().strip("`")
    if text.lower().startswith("json"):
        text = text[4:].strip()
    try:
        data = json.loads(text)
    except (ValueError, TypeError):
        return None

    category = str(data.get("category", "OTHER")).upper()
    severity = str(data.get("severity", "MEDIUM")).upper()

    return TriageResult(
        category=category if category in ALLOWED_CATEGORIES else "OTHER",
        severity=severity if severity in ALLOWED_SEVERITIES else "MEDIUM",
        summary=str(data.get("summary", ""))[:200],
        recommended_action=str(
            data.get("recommended_action", "Dispatch nearest team.")
        )[:220],
    )


# ─────────────────────────────────────────────────────────────
# AI-assisted triage (injected LLM dependency)
# ─────────────────────────────────────────────────────────────

_TRIAGE_SYSTEM_PROMPT = (
    "You are the incident triage system for a FIFA World Cup 2026 stadium ops center. "
    "Given a raw report, respond with ONLY a compact JSON object with keys: "
    "category (one of MEDICAL, SECURITY, CROWD, FACILITIES, "
    "LOST_ITEM, ACCESSIBILITY, TRANSPORT, OTHER), "
    "severity (LOW, MEDIUM, HIGH, CRITICAL), "
    "summary (<=140 chars neutral factual), "
    "recommended_action (<=180 chars imperative sentence)."
    " No prose, no code fences."
)


async def ai_triage(
    description: str,
    role: str,
    venue_name: str,
    llm_fn: Callable[[str, str], Awaitable[str]],
) -> TriageResult:
    """Triage an incident using an AI model, falling back to heuristic on error.

    The ``llm_fn`` parameter is the key injection point. In production, pass
    a bound coroutine from ``pitchops.services.llm``. In tests, pass a simple
    async lambda:

        >>> async def fake_llm(system, user): return '{"category":"MEDICAL",...}'
        >>> result = await ai_triage("...", "fan", "MetLife", fake_llm)

    Args:
        description: Raw reporter text.
        role: Reporter role string (e.g. ``"fan"``).
        venue_name: Human-readable venue name for the LLM prompt.
        llm_fn: Async callable ``(system_prompt, user_prompt) -> str``.

    Returns:
        A :class:`TriageResult` — always valid (falls back to heuristic).
    """
    user_prompt = f"Venue: {venue_name}. Reporter role: {role}. Report: {description}"
    try:
        raw = await llm_fn(_TRIAGE_SYSTEM_PROMPT, user_prompt)
        parsed = parse_triage_json(raw)
        if parsed:
            if not parsed["summary"]:
                parsed["summary"] = description[:200]
            return parsed
    except Exception as exc:  # noqa: BLE001 — graceful fallback
        logger.warning("Triage AI failed, using heuristic: %s", exc)

    return heuristic_triage(description)
