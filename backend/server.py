"""Backward-compatibility shim — real application is in ``pitchops/``.

Running ``uvicorn server:app`` continues to work unchanged.
Running ``uvicorn pitchops.main:app`` is the canonical invocation.
"""

from pitchops.main import app  # noqa: F401
