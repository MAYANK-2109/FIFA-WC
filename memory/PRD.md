# PITCH.OPS — PRD

## Original Problem Statement
PromptWars Challenge 4 — Build a GenAI-enabled solution that enhances stadium
operations and the overall tournament experience for fans, organizers,
volunteers, or venue staff during the **FIFA World Cup 2026**. Judged on:
Code Quality, Security, Efficiency, Testing, Accessibility, and Problem
Statement Alignment.

## User Choices (Jan 2026 kick-off)
- All-in-one platform with role switcher (Fan / Volunteer / Staff / Organizer)
- All GenAI features (concierge, ops intelligence, accessibility, transport, incident triage, sustainability)
- Gemini 2.0 Flash via Google AI API Key
- No auth (judge-friendly role selector)
- Creative distinctive design ("Editorial Sports-Tech" — dark, high-contrast, Oswald typography, WCAG-AA)

## User Personas
1. **Fan** — needs multilingual help, wayfinding, transport, accessibility, incident reporting.
2. **Volunteer** — assists lost/confused guests, submits situational reports.
3. **Staff (Command)** — monitors real-time crowd density, incident board, AI ops briefings.
4. **Organizer** — full operational overview including sustainability KPIs.

## Core Requirements (Static)
- 16 FIFA 2026 host venues (11 USA + 2 Canada + 3 Mexico) with zone/gate data.
- AI concierge in ≥8 languages with streaming + persisted sessions.
- Real-time crowd heatmap (8 zones, 6 gates, auto-refresh every 15s).
- AI-triaged incident reporting (category + severity + department routing).
- AI ops briefing (Gemini-generated bullet-point commander briefings).
- Sustainability KPIs + AI narrative (waste, energy, carbon, water).
- Scoreboard-style live ticker (matches, transport alerts, incidents).

## Architecture
- **Backend**: FastAPI (single `server.py`, 679 lines), MongoDB via Motor,
  `google-generativeai` (`gemini-2.0-flash`), global
  `asyncio.Semaphore(4)` around all LLM calls, plus
  retry-on-429 and heuristic fallbacks on every AI endpoint.
- **Frontend**: React 19 + React Router 7, Tailwind, framer-motion,
  react-fast-marquee, Recharts, Lucide icons. Oswald + IBM Plex Sans/Mono.
- **Streaming**: SSE via `fetch` POST → custom parser in `lib/sse.js`.

## What's Implemented (2026-01-08)
- 16 venues, 6 matches, 8-zone crowd model, deterministic time-bucketed simulation.
- POST /api/incidents with LLM triage → 8 categories × 4 severities + heuristic fallback.
- POST /api/ops/insights, /transport/recommend, /accessibility/route,
  /sustainability/insights (all with graceful degradation).
- POST /api/concierge/chat streaming SSE + GET /api/concierge/history.
- Landing (hero + role picker + features), Fan app (4 tabs), Ops Command
  (heatmap + AI briefing + incident board + sustainability).
- Full data-testid coverage; WCAG-AA focus rings; aria-live on chat.
- 23/23 pytest backend tests pass. Full frontend E2E verified.

## Prioritized Backlog
### P0 (done)
- All required capabilities delivered.

### P1 (next)
- Split `server.py` into `routers/` + `services/` for maintainability.
- Migrate `@app.on_event` → FastAPI lifespan handlers.
- Add rate-limit on public POST endpoints (slowapi).
- Persist crowd snapshots history for post-match analytics.

### P2 (future)
- WebSocket push for incidents (currently 20s polling).
- Real map integration (Mapbox) with venue-specific overlays.
- Volunteer task queue (assign incidents by proximity).
- Broadcast alerts to fan devices (WebPush).

## Next Actions
- None blocking. Ready for competition submission.
