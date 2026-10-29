"""GET /api/health — liveness probe."""

from __future__ import annotations

import platform
import sys
from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    python: str
    platform: str


@router.get("/health", response_model=HealthResponse, summary="Liveness probe")
async def health() -> HealthResponse:
    """Returns service status and runtime metadata."""
    return HealthResponse(
        status="ok",
        version="0.1.0",
        timestamp=datetime.now(UTC).isoformat(),
        python=sys.version,
        platform=platform.platform(),
    )
