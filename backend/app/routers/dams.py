"""Dam & Reservoir Capacity Monitoring API router."""

from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException, Query
from app.engines.dams import RESERVOIR_CATALOG, compute_reservoir_metrics, list_all_reservoirs

router = APIRouter(prefix="/dams", tags=["dams"])


@router.get("")
async def get_all_dams(
    lat: float | None = Query(None, description="Current latitude to prioritize nearest regional reservoirs"),
    lon: float | None = Query(None, description="Current longitude to prioritize nearest regional reservoirs"),
) -> list[dict[str, Any]]:
    """Return monitored reservoirs with storage capacity, percentages, and release status."""
    return list_all_reservoirs(lat=lat, lon=lon)


@router.get("/{dam_id}")
async def get_dam_details(
    dam_id: str,
    custom_storage_mcm: float | None = Query(None, description="Simulated storage volume in MCM"),
    custom_inflow: float | None = Query(None, description="Simulated inflow in cusecs"),
    custom_outflow: float | None = Query(None, description="Simulated outflow in cusecs"),
) -> dict[str, Any]:
    """Return detailed telemetry, capacity gauge data, and historical storage trend for a specific dam."""
    key = dam_id.lower().strip()
    if key not in RESERVOIR_CATALOG:
        raise HTTPException(
            status_code=404,
            detail=f"Reservoir '{dam_id}' not found. Supported IDs: {list(RESERVOIR_CATALOG.keys())}",
        )
    summary = compute_reservoir_metrics(
        reservoir_id=key,
        custom_storage_mcm=custom_storage_mcm,
        custom_inflow=custom_inflow,
        custom_outflow=custom_outflow,
    )
    return summary.model_dump()
