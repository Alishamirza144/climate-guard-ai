"""Live data-source health status registry for the public dashboard."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.source_registry import get_data_source_status

router = APIRouter(tags=["data-sources"])


@router.get("/data-sources")
async def data_sources() -> dict[str, object]:
    return await get_data_source_status()
