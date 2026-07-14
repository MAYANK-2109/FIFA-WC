"""Static reference data — FIFA World Cup 2026 host venues and matches.

This module is intentionally a pure-data module with no imports from the rest
of the application. It can be imported safely in tests without triggering any
side-effects (no DB connection, no env-var reads, no network).
"""

from __future__ import annotations

# ─────────────────────────────────────────────────────────────
# FIFA World Cup 2026 host venues
# ─────────────────────────────────────────────────────────────

VENUES: list[dict] = [
    {"id": "metlife",   "city": "New York/New Jersey", "country": "USA", "name": "MetLife Stadium",        "capacity": 82500, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "sofi",      "city": "Los Angeles",          "country": "USA", "name": "SoFi Stadium",            "capacity": 70240, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "att",       "city": "Dallas",               "country": "USA", "name": "AT&T Stadium",            "capacity": 80000, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "levis",     "city": "Bay Area",             "country": "USA", "name": "Levi's Stadium",          "capacity": 68500, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "arrowhead", "city": "Kansas City",          "country": "USA", "name": "Arrowhead Stadium",       "capacity": 76416, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "gillette",  "city": "Boston",               "country": "USA", "name": "Gillette Stadium",        "capacity": 65878, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "lincoln",   "city": "Philadelphia",         "country": "USA", "name": "Lincoln Financial Field", "capacity": 69796, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "hardrock",  "city": "Miami",                "country": "USA", "name": "Hard Rock Stadium",       "capacity": 65326, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "nrg",       "city": "Houston",              "country": "USA", "name": "NRG Stadium",             "capacity": 72220, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "mercedes",  "city": "Atlanta",              "country": "USA", "name": "Mercedes-Benz Stadium",   "capacity": 71000, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "lumen",     "city": "Seattle",              "country": "USA", "name": "Lumen Field",             "capacity": 68740, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "bmo",       "city": "Toronto",              "country": "CAN", "name": "BMO Field",               "capacity": 45500, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "bcplace",   "city": "Vancouver",            "country": "CAN", "name": "BC Place",                "capacity": 54500, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "azteca",    "city": "Mexico City",          "country": "MEX", "name": "Estadio Azteca",          "capacity": 87523, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "akron",     "city": "Guadalajara",          "country": "MEX", "name": "Estadio Akron",           "capacity": 48071, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
    {"id": "bbva",      "city": "Monterrey",            "country": "MEX", "name": "Estadio BBVA",            "capacity": 53500, "zones": ["N","NE","E","SE","S","SW","W","NW"]},
]

VENUES_BY_ID: dict[str, dict] = {v["id"]: v for v in VENUES}

# ─────────────────────────────────────────────────────────────
# Fixture matches (static demo data)
# ─────────────────────────────────────────────────────────────

MATCHES: list[dict] = [
    {"id": "m1", "home": "USA", "away": "MEX", "venue_id": "metlife",  "kickoff": "2026-06-11T20:00:00Z", "status": "LIVE",      "score": "1-1", "minute": 63},
    {"id": "m2", "home": "BRA", "away": "ARG", "venue_id": "azteca",   "kickoff": "2026-06-12T21:00:00Z", "status": "SCHEDULED", "score": "0-0", "minute": 0},
    {"id": "m3", "home": "ENG", "away": "FRA", "venue_id": "sofi",     "kickoff": "2026-06-13T19:00:00Z", "status": "SCHEDULED", "score": "0-0", "minute": 0},
    {"id": "m4", "home": "GER", "away": "ESP", "venue_id": "att",      "kickoff": "2026-06-14T18:00:00Z", "status": "SCHEDULED", "score": "0-0", "minute": 0},
    {"id": "m5", "home": "POR", "away": "NED", "venue_id": "bmo",      "kickoff": "2026-06-15T17:00:00Z", "status": "SCHEDULED", "score": "0-0", "minute": 0},
    {"id": "m6", "home": "JPN", "away": "KOR", "venue_id": "hardrock", "kickoff": "2026-06-16T22:00:00Z", "status": "FINAL",     "score": "2-1", "minute": 90},
]

# ─────────────────────────────────────────────────────────────
# Incident taxonomy
# ─────────────────────────────────────────────────────────────

INCIDENT_CATEGORIES: list[str] = [
    "MEDICAL", "SECURITY", "CROWD", "FACILITIES",
    "LOST_ITEM", "ACCESSIBILITY", "TRANSPORT", "OTHER",
]

INCIDENT_SEVERITIES: list[str] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

ALLOWED_CATEGORIES: frozenset[str] = frozenset(INCIDENT_CATEGORIES)
ALLOWED_SEVERITIES: frozenset[str] = frozenset(INCIDENT_SEVERITIES)

DEPARTMENTS: dict[str, str] = {
    "MEDICAL":       "Medical Team",
    "SECURITY":      "Security Command",
    "CROWD":         "Crowd Ops",
    "FACILITIES":    "Facilities",
    "LOST_ITEM":     "Guest Services",
    "ACCESSIBILITY": "Accessibility Services",
    "TRANSPORT":     "Transport Desk",
    "OTHER":         "Ops Command",
}

# ─────────────────────────────────────────────────────────────
# Triage keyword rules — order matters (first match wins)
# ─────────────────────────────────────────────────────────────

CATEGORY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("MEDICAL",       ("injur", "hurt", "medic", "faint", "bleed", "chest", "unconscious")),
    ("SECURITY",      ("fight", "weapon", "threat", "suspicious", "steal")),
    ("CROWD",         ("crowd", "push", "surge", "block", "queue")),
    ("LOST_ITEM",     ("lost", "found", "missing")),
    ("ACCESSIBILITY", ("wheelchair", "access", "ramp", "hearing", "deaf", "blind")),
    ("TRANSPORT",     ("metro", "shuttle", "train", "bus", "parking", "taxi")),
    ("FACILITIES",    ("toilet", "restroom", "water", "food", "seat", "broken", "leak")),
]

SEVERITY_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("CRITICAL", ("urgent", "critical", "unconscious", "weapon")),
    ("HIGH",     ("injur", "bleed", "fight", "surge")),
]

# Concierge system prompt template — kept here so it is testable in isolation
CONCIERGE_SYSTEM_TEMPLATE: str = (
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
