"""PITCH.OPS application factory — wires all layers together.

This module is the single place where:
- The FastAPI app is created and configured
- All routers are mounted under ``/api``
- Exception handlers translate domain errors → HTTP responses
- Motor client and LLM service are initialised and stored on ``app.state``
- Startup DB seeding and index creation are performed
- CORS middleware is applied

Nothing else imports from this module. Import ``app`` for uvicorn:

    uvicorn pitchops.main:app --reload
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

from pitchops.config import get_settings
from pitchops.constants import DEPARTMENTS, VENUES
from pitchops.errors import PitchOpsError, http_status_for
from pitchops.models import Incident
from pitchops.routers import (
    accessibility,
    concierge,
    incidents,
    ops,
    reference,
    sustainability,
    transport,
)
from pitchops.services import db as db_repo
from pitchops.services.llm import make_llm_client, make_llm_fn

logger = logging.getLogger("pitchops")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

# ─────────────────────────────────────────────────────────────
# Application factory
# ─────────────────────────────────────────────────────────────

def create_app() -> FastAPI:
    """Build and return the configured FastAPI application.

    Separated from module-level instantiation so integration tests can call
    ``create_app()`` with a different settings override if needed.
    """
    settings = get_settings()
    application = FastAPI(title="PITCH.OPS API", version="1.0.0")

    # ── Exception handlers ────────────────────────────────────
    @application.exception_handler(PitchOpsError)
    async def domain_error_handler(request: Request, exc: PitchOpsError) -> JSONResponse:
        """Map every domain exception to the correct HTTP status in one place."""
        return JSONResponse(
            status_code=http_status_for(exc),
            content={"detail": str(exc)},
        )

    # ── Routers (all under /api prefix) ───────────────────────
    for router_module in (
        reference,
        incidents,
        ops,
        transport,
        accessibility,
        sustainability,
        concierge,
    ):
        application.include_router(router_module.router, prefix="/api")

    # ── CORS ──────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Lifecycle ─────────────────────────────────────────────
    @application.on_event("startup")
    async def _startup() -> None:
        """Initialise Motor client, LLM service, DB indexes, and demo data."""
        mongo = AsyncIOMotorClient(settings.mongo_url)
        db = mongo[settings.db_name]

        incidents_col = db.incidents
        messages_col = db.chat_messages

        # Create indexes idempotently
        await db_repo.create_indexes(incidents_col, messages_col)

        # Seed one demo incident so the ops board isn't empty on first load
        if await db_repo.count_incidents(incidents_col, {}) == 0:
            demo = Incident(
                venue_id="metlife",
                zone="NE",
                reporter_role="volunteer",
                description="Spilled water near section 118 escalator, slippery.",
                category="FACILITIES",
                severity="MEDIUM",
                department=DEPARTMENTS["FACILITIES"],
                ai_summary="Wet floor near section 118 escalator — slip hazard.",
                recommended_action="Dispatch facilities to place wet-floor signs and mop.",
            )
            await db_repo.insert_incident(incidents_col, demo.model_dump())

        # Build shared LLM resources
        semaphore = asyncio.Semaphore(settings.llm_concurrency)
        if settings.google_api_key:
            llm_client = make_llm_client(settings.google_api_key)
            llm_fn = make_llm_fn(llm_client, settings.llm_model, semaphore)
        else:
            # LLM unavailable — every route will use its heuristic fallback
            async def llm_fn(system: str, user: str) -> str:  # type: ignore[misc]
                raise RuntimeError("LLM key not configured; using fallback.")

        # Store shared resources on app.state for injection into request handlers
        application.state.settings = settings
        application.state.mongo_client = mongo
        application.state.incidents_col = incidents_col
        application.state.messages_col = messages_col
        application.state.llm_semaphore = semaphore
        application.state.llm_fn = llm_fn

        logger.info(
            "PITCH.OPS ready — %d venues, model=%s, llm=%s",
            len(VENUES),
            settings.llm_model,
            "configured" if settings.google_api_key else "UNAVAILABLE (fallback mode)",
        )

    @application.on_event("shutdown")
    async def _shutdown() -> None:
        """Cleanly close the Motor client."""
        application.state.mongo_client.close()

    return application


# Module-level app instance — consumed by uvicorn
app = create_app()
