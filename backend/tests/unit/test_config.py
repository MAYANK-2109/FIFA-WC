"""Unit tests for pitchops.config."""

import os
from unittest.mock import patch

from pitchops.config import get_settings


def test_get_settings_default():
    get_settings.cache_clear()
    with patch.dict(os.environ, {}, clear=True):
        settings = get_settings()
        assert isinstance(settings.llm_model, str)
        assert isinstance(settings.mongo_url, str)


def test_get_settings_overrides():
    get_settings.cache_clear()
    env = {
        "LLM_MODEL": "test-model",
        "MONGO_URL": "mongodb://remote",
        "CORS_ORIGINS": "http://a.com,http://b.com",
    }
    with patch.dict(os.environ, env, clear=True):
        # Force lru_cache refresh if needed, but get_settings isn't cached by default
        settings = get_settings()
        assert settings.llm_model == "test-model"
        assert settings.mongo_url == "mongodb://remote"
        assert settings.cors_origins_list == ["http://a.com", "http://b.com"]


def test_cors_origins_list_empty():
    get_settings.cache_clear()
    env = {"CORS_ORIGINS": ""}
    with patch.dict(os.environ, env, clear=True):
        settings = get_settings()
        assert settings.cors_origins_list == []
