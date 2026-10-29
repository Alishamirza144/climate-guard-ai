"""Thin debug endpoints that expose raw data-source responses for local inspection."""

from __future__ import annotations

from fastapi import APIRouter, Query

from app.services import firms, openmeteo, overpass

router = APIRouter(tags=["raw"])


@router.get("/raw/forecast")
async def raw_forecast(
    lat: float = Query(...),
    lon: float = Query(...),
    past_days: int = Query(3, ge=0, le=92),
    forecast_days: int = Query(3, ge=0, le=16),
):
    return (await openmeteo.get_forecast(lat, lon, past_days=past_days, forecast_days=forecast_days)).model_dump(mode="json")


@router.get("/raw/flood")
async def raw_flood(
    lat: float = Query(...),
    lon: float = Query(...),
    past_days: int = Query(3, ge=0, le=92),
    forecast_days: int = Query(3, ge=0, le=16),
):
    return (await openmeteo.get_flood(lat, lon, past_days=past_days, forecast_days=forecast_days)).model_dump(mode="json")


@router.get("/raw/fires")
async def raw_fires(
    min_lat: float = Query(...),
    min_lon: float = Query(...),
    max_lat: float = Query(...),
    max_lon: float = Query(...),
    days: int = Query(1, ge=1, le=5),
):
    result = firms.get_fires(min_lat, min_lon, max_lat, max_lon, days=days)
    return result.model_dump(mode="json")


@router.get("/raw/waterways")
async def raw_waterways(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(3.0, ge=0.1, le=25),
):
    return await overpass.query_waterways(lat, lon, radius_km=radius_km)
