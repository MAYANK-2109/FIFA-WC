"""Concierge streaming SSE chat and history routes."""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from pitchops.constants import CONCIERGE_SYSTEM_TEMPLATE, VENUES_BY_ID
from pitchops.errors import require_llm_key
from pitchops.models import ChatRequest
from pitchops.services import db as db_repo
from pitchops.services.llm import make_llm_client

logger = logging.getLogger("pitchops.concierge")
router = APIRouter()

_SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}


def _build_concierge_system(venue_name: str, language: str, role: str) -> str:
    """Render the concierge system prompt (pure function).

    Args:
        venue_name: Human-readable venue name.
        language: Requested reply language.
        role: User role (fan / volunteer / staff / organizer).

    Returns:
        Formatted system instruction string.
    """
    return CONCIERGE_SYSTEM_TEMPLATE.format(
        language=language,
        venue_name=venue_name,
        role=role,
    )


def _fallback_concierge_reply(language: str) -> str:
    """Return a static fallback when LLM is unavailable due to rate limits."""
    if language.lower() == "spanish":
        return (
            "El asistente AI no está disponible por límites de uso. "
            "Por favor, acuda a un miembro del personal o busque el baño accesible "
            "más cercano. Hay mostradores de información ubicados en cada nivel."
        )
    return (
        "The AI concierge is currently unavailable due to high demand. "
        "Please approach a staff member for assistance."
    )


@router.get("/concierge/history")
async def concierge_history(
    request: Request,
    session_id: str = Query(..., min_length=1, max_length=128),
) -> dict:
    """Return message history for a chat session."""
    col = request.app.state.messages_col
    messages = await db_repo.get_chat_history(col, session_id)
    return {"session_id": session_id, "messages": messages}


@router.post("/concierge/chat")
async def concierge_chat(req: ChatRequest, request: Request) -> StreamingResponse:
    """Stream the concierge AI response as Server-Sent Events.

    Validates the API key, builds the system prompt, persists the user
    message, streams LLM chunks, then persists the assembled assistant reply.

    Raises:
        LLMUnavailableError: If the API key is not configured (→ 503).
    """
    settings = request.app.state.settings
    require_llm_key(settings.google_api_key)

    venue = VENUES_BY_ID.get(
        req.venue_id or "", {"name": "the assigned FIFA 2026 venue"}
    )
    system = _build_concierge_system(
        venue_name=venue.get("name", "the assigned FIFA 2026 venue"),
        language=req.language,
        role=req.role,
    )

    messages_col = request.app.state.messages_col
    semaphore: asyncio.Semaphore = request.app.state.llm_semaphore
    client = make_llm_client(settings.google_api_key)
    model = settings.llm_model

    await db_repo.persist_message(messages_col, req.session_id, "user", req.message)

    async def _stream_generator():
        from google.genai import types as genai_types

        async with semaphore:
            full: list[str] = []
            try:
                loop = asyncio.get_event_loop()
                chunks = await loop.run_in_executor(
                    None,
                    lambda: list(
                        client.models.generate_content_stream(
                            model=model,
                            contents=req.message,
                            config=genai_types.GenerateContentConfig(
                                system_instruction=system,
                            ),
                        )
                    ),
                )
                for chunk in chunks:
                    text = chunk.text if chunk.text else ""
                    if text:
                        full.append(text)
                        yield f"data: {text}\n\n"

                joined = "".join(full).strip()
                if joined:
                    await db_repo.persist_message(
                        messages_col, req.session_id, "assistant", joined
                    )
                yield "event: done\ndata: [DONE]\n\n"
            except Exception as exc:  # noqa: BLE001
                logger.exception("Streaming failed")
                if not full:
                    fallback = _fallback_concierge_reply(req.language)
                    yield f"data: {fallback}\n\n"
                    await db_repo.persist_message(
                        messages_col, req.session_id, "assistant", fallback
                    )
                    yield "event: done\ndata: [DONE]\n\n"
                else:
                    yield f"event: error\ndata: {str(exc)[:200]}\n\n"

    return StreamingResponse(
        _stream_generator(),
        media_type="text/event-stream",
        headers=_SSE_HEADERS,
    )
