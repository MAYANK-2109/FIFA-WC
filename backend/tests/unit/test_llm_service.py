"""Unit tests for pitchops.services.llm — retry logic and error propagation.

The genai.Client is mocked via unittest.mock so no network calls are made.
Tests cover:
- Successful one-shot call
- Retry on 429 / quota errors
- Immediate re-raise on non-quota errors
- make_llm_fn factory binding

No env vars or network required.
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from pitchops.services.llm import llm_oneshot, make_llm_fn

# ────────────────────────────────────────────────────────────────────────────
# Helpers
# ────────────────────────────────────────────────────────────────────────────


def _make_client(response_text: str = "AI response"):
    """Return a mock genai.Client whose generate_content returns ``response_text``."""
    mock_response = MagicMock()
    mock_response.text = response_text

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response
    return mock_client


def _make_failing_client(error_msg: str):
    """Return a mock client that always raises an exception."""
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = RuntimeError(error_msg)
    return mock_client


# ────────────────────────────────────────────────────────────────────────────
# llm_oneshot
# ────────────────────────────────────────────────────────────────────────────


class TestLlmOneshot:
    @pytest.mark.asyncio
    async def test_returns_stripped_text_on_success(self):
        client = _make_client("  Hello World  ")
        semaphore = asyncio.Semaphore(1)
        result = await llm_oneshot(
            "system",
            "user",
            client=client,
            model="test-model",
            semaphore=semaphore,
        )
        assert result == "Hello World"

    @pytest.mark.asyncio
    async def test_calls_generate_content_once_on_success(self):
        client = _make_client("ok")
        semaphore = asyncio.Semaphore(1)
        await llm_oneshot(
            "sys",
            "usr",
            client=client,
            model="test-model",
            semaphore=semaphore,
        )
        assert client.models.generate_content.call_count == 1

    @pytest.mark.asyncio
    async def test_retries_on_429_error(self):
        """Should retry up to `retries` times on quota/rate errors."""
        call_count = 0
        success_response = MagicMock()
        success_response.text = "success after retry"

        def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise RuntimeError("429 rate limit exceeded")
            return success_response

        client = MagicMock()
        client.models.generate_content.side_effect = side_effect
        semaphore = asyncio.Semaphore(1)

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await llm_oneshot(
                "sys",
                "usr",
                client=client,
                model="m",
                semaphore=semaphore,
                retries=2,
            )
        assert result == "success after retry"
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_retries_on_quota_keyword(self):
        """'quota' in error message should also trigger retry."""
        call_count = 0
        success_response = MagicMock()
        success_response.text = "ok"

        def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise RuntimeError("quota exceeded for this key")
            return success_response

        client = MagicMock()
        client.models.generate_content.side_effect = side_effect
        semaphore = asyncio.Semaphore(1)

        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await llm_oneshot(
                "sys",
                "usr",
                client=client,
                model="m",
                semaphore=semaphore,
                retries=1,
            )
        assert result == "ok"

    @pytest.mark.asyncio
    async def test_raises_immediately_on_non_quota_error(self):
        """Non-quota errors must propagate immediately without retrying."""
        client = _make_failing_client("Internal server error — generic failure")
        semaphore = asyncio.Semaphore(1)

        with pytest.raises(RuntimeError, match="Internal server error"):
            await llm_oneshot(
                "sys",
                "usr",
                client=client,
                model="m",
                semaphore=semaphore,
            )
        # Should only be called once (no retries)
        assert client.models.generate_content.call_count == 1

    @pytest.mark.asyncio
    async def test_raises_last_error_after_exhausted_retries(self):
        """After all retries fail, the last error should be raised."""
        client = _make_failing_client("429 rate limit")
        semaphore = asyncio.Semaphore(1)

        with patch("asyncio.sleep", new_callable=AsyncMock):
            with pytest.raises(RuntimeError, match="429 rate limit"):
                await llm_oneshot(
                    "sys",
                    "usr",
                    client=client,
                    model="m",
                    semaphore=semaphore,
                    retries=2,
                )
        # Called initial + 2 retries = 3 times
        assert client.models.generate_content.call_count == 3

    @pytest.mark.asyncio
    async def test_semaphore_respected(self):
        """Confirm the semaphore is entered during the call."""
        client = _make_client("ok")
        semaphore = asyncio.Semaphore(1)
        assert semaphore._value == 1

        # Run concurrently and check no exceptions
        results = await asyncio.gather(
            *[
                llm_oneshot("s", "u", client=client, model="m", semaphore=semaphore)
                for _ in range(3)
            ]
        )
        assert all(r == "ok" for r in results)


# ────────────────────────────────────────────────────────────────────────────
# make_llm_fn factory
# ────────────────────────────────────────────────────────────────────────────


class TestMakeLlmFn:
    @pytest.mark.asyncio
    async def test_returns_callable(self):
        client = _make_client("bound response")
        semaphore = asyncio.Semaphore(1)
        fn = make_llm_fn(client, "test-model", semaphore)
        assert callable(fn)

    @pytest.mark.asyncio
    async def test_bound_fn_calls_through(self):
        client = _make_client("from bound fn")
        semaphore = asyncio.Semaphore(1)
        fn = make_llm_fn(client, "test-model", semaphore)
        result = await fn("system prompt", "user prompt")
        assert result == "from bound fn"

    @pytest.mark.asyncio
    async def test_bound_fn_uses_correct_model(self):
        """Verify the model name is forwarded to generate_content."""
        success_response = MagicMock()
        success_response.text = "ok"
        client = MagicMock()
        client.models.generate_content.return_value = success_response

        semaphore = asyncio.Semaphore(1)
        fn = make_llm_fn(client, "gemini-2.0-flash", semaphore)
        await fn("sys", "usr")

        call_kwargs = client.models.generate_content.call_args
        assert call_kwargs.kwargs.get("model") == "gemini-2.0-flash"


# ────────────────────────────────────────────────────────────────────────────
# errors.py — require_venue / require_llm_key
# ────────────────────────────────────────────────────────────────────────────


class TestErrorHelpers:
    def test_require_venue_returns_dict_on_hit(self):
        from pitchops.errors import require_venue

        registry = {"metlife": {"id": "metlife", "name": "MetLife Stadium"}}
        result = require_venue(registry, "metlife")
        assert result["name"] == "MetLife Stadium"

    def test_require_venue_raises_on_miss(self):
        from pitchops.errors import VenueNotFoundError, require_venue

        with pytest.raises(VenueNotFoundError) as exc_info:
            require_venue({}, "unknown")
        assert "unknown" in str(exc_info.value)

    def test_require_llm_key_returns_key_when_set(self):
        from pitchops.errors import require_llm_key

        assert require_llm_key("my-key") == "my-key"

    def test_require_llm_key_raises_when_empty(self):
        from pitchops.errors import LLMUnavailableError, require_llm_key

        with pytest.raises(LLMUnavailableError):
            require_llm_key("")

    def test_http_status_for_venue_error(self):
        from pitchops.errors import VenueNotFoundError, http_status_for

        assert http_status_for(VenueNotFoundError("x")) == 404

    def test_http_status_for_incident_error(self):
        from pitchops.errors import IncidentNotFoundError, http_status_for

        assert http_status_for(IncidentNotFoundError("x")) == 404

    def test_http_status_for_llm_error(self):
        from pitchops.errors import LLMUnavailableError, http_status_for

        assert http_status_for(LLMUnavailableError()) == 503
