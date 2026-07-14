"""Centralised domain error types and HTTP-mapping helpers.

Design rules:
- Business/service code raises *domain* errors (no FastAPI imports here).
- A single ``http_exception_for`` function translates domain errors to
  ``HTTPException`` at the API boundary (inside exception handlers or routes).
- This makes the core logic independently testable without FastAPI.
"""

from __future__ import annotations

from typing import NoReturn


# ─────────────────────────────────────────────────────────────
# Domain exception hierarchy
# ─────────────────────────────────────────────────────────────

class PitchOpsError(Exception):
    """Base class for all PITCH.OPS domain errors."""


class VenueNotFoundError(PitchOpsError):
    """Raised when a venue_id is not in the known venues registry."""

    def __init__(self, venue_id: str) -> None:
        self.venue_id = venue_id
        super().__init__(f"Unknown venue '{venue_id}'.")


class IncidentNotFoundError(PitchOpsError):
    """Raised when an incident_id does not exist in the database."""

    def __init__(self, incident_id: str) -> None:
        self.incident_id = incident_id
        super().__init__(f"Incident '{incident_id}' not found.")


class LLMUnavailableError(PitchOpsError):
    """Raised when the LLM API key is not configured."""

    def __init__(self) -> None:
        super().__init__("LLM key not configured on server.")


# ─────────────────────────────────────────────────────────────
# HTTP mapping helper — used by FastAPI exception handlers
# ─────────────────────────────────────────────────────────────

#: Maps domain error type → (HTTP status code, detail string override or None)
_ERROR_MAP: dict[type[PitchOpsError], tuple[int, str | None]] = {
    VenueNotFoundError:    (404, None),
    IncidentNotFoundError: (404, None),
    LLMUnavailableError:   (503, None),
}


def http_status_for(exc: PitchOpsError) -> int:
    """Return the appropriate HTTP status code for a domain exception."""
    entry = _ERROR_MAP.get(type(exc))
    return entry[0] if entry else 500


def require_venue(venues_by_id: dict[str, dict], venue_id: str) -> dict:
    """Return the venue dict or raise :class:`VenueNotFoundError`.

    Pure function — no HTTP, no I/O.

    Args:
        venues_by_id: The lookup table (typically ``VENUES_BY_ID``).
        venue_id: The ID to look up.

    Returns:
        The venue dict if found.

    Raises:
        VenueNotFoundError: If ``venue_id`` is not in ``venues_by_id``.
    """
    venue = venues_by_id.get(venue_id)
    if not venue:
        raise VenueNotFoundError(venue_id)
    return venue


def require_llm_key(api_key: str) -> str:
    """Return ``api_key`` or raise :class:`LLMUnavailableError`.

    Pure function — no HTTP, no I/O.

    Args:
        api_key: The Google API key string (may be empty).

    Returns:
        The non-empty API key.

    Raises:
        LLMUnavailableError: If ``api_key`` is falsy.
    """
    if not api_key:
        raise LLMUnavailableError()
    return api_key
