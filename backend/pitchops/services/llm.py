"""LLM service — Google GenAI client factory and one-shot call wrapper.

All parameters are passed explicitly (no module-level singletons) so callers
can inject mock clients in tests and integration tests can swap models.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Awaitable, Callable

from google import genai
from google.genai import types as genai_types

logger = logging.getLogger("pitchops.llm")


# ─────────────────────────────────────────────────────────────
# Client factory
# ─────────────────────────────────────────────────────────────


def make_llm_client(api_key: str) -> genai.Client:
    """Construct and return a :class:`genai.Client` for *api_key*.

    Separated from ``llm_oneshot`` so tests can mock the client without
    importing ``genai`` at all.

    Args:
        api_key: Google Generative AI API key.

    Returns:
        A configured :class:`genai.Client` instance.
    """
    return genai.Client(api_key=api_key)


# ─────────────────────────────────────────────────────────────
# One-shot async call with retry
# ─────────────────────────────────────────────────────────────


async def llm_oneshot(
    system: str,
    user_text: str,
    *,
    client: genai.Client,
    model: str,
    semaphore: asyncio.Semaphore,
    retries: int = 2,
) -> str:
    """Send a one-shot prompt to the LLM and return the response text.

    Retries on rate-limit / quota errors with a brief back-off.  All retryable
    errors from non-quota exceptions are re-raised immediately.

    Args:
        system: System-instruction string.
        user_text: User message content.
        client: Pre-built :class:`genai.Client` (injected).
        model: Model identifier string (e.g. ``"gemini-2.0-flash"``).
        semaphore: Concurrency limiter — gates the LLM calls.
        retries: Number of extra attempts on quota errors (default: 2).

    Returns:
        Stripped response text from the model.

    Raises:
        Exception: Re-raises the last exception if all retries are exhausted or
                   the error is not quota-related.
    """
    last_err: Exception | None = None
    for attempt in range(retries + 1):
        try:
            async with semaphore:
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None,
                    lambda: client.models.generate_content(
                        model=model,
                        contents=user_text,
                        config=genai_types.GenerateContentConfig(
                            system_instruction=system,
                        ),
                    ),
                )
            return (response.text or "").strip()
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            msg = str(exc).lower()
            if "429" in msg or "rate" in msg or "quota" in msg:
                await asyncio.sleep(0.6 * (attempt + 1))
                continue
            raise
    raise last_err  # type: ignore[misc]


def make_llm_fn(
    client: genai.Client,
    model: str,
    semaphore: asyncio.Semaphore,
) -> Callable[[str, str], Awaitable[str]]:
    """Return a bound ``llm_oneshot`` coroutine with client/model/semaphore pre-filled.

    This is the factory used in production; it produces the ``llm_fn``
    signature expected by :func:`pitchops.triage.ai_triage` and the ops/
    transport/accessibility routers.

    Args:
        client: Configured GenAI client.
        model: LLM model identifier.
        semaphore: Shared concurrency semaphore.

    Returns:
        An async callable ``(system: str, user: str) -> str``.
    """

    async def _fn(system: str, user: str) -> str:
        return await llm_oneshot(
            system, user, client=client, model=model, semaphore=semaphore
        )

    return _fn
