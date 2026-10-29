"""ClimateGuard AI — FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.config import get_settings
from app.engines.alerts import start_scheduler
from app.middleware.security import SecurityHeadersMiddleware, limiter
from app.ml import get_model_status
from app.routers import alerts, crop, data_sources, demo, fire, health, heat, iot, location, ml, notifications, raw, risk, simulation, validation

# ---------------------------------------------------------------------------
# Structured logging
# ---------------------------------------------------------------------------
structlog.configure(
    processors=[
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)
log = structlog.get_logger()

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
settings = get_settings()
allow_origins = [origin.strip() for origin in settings.allowed_origins.split(',') if origin.strip()]

app = FastAPI(
    title="ClimateGuard AI",
    version="0.1.0",
    description="AI-powered Climate Risk Prediction & Early Warning System",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server (and production origin)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-API-Key", "X-Requested-With"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"error": "invalid_request", "detail": exc.errors()},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})

# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("climateguard_startup", version=app.version, origin=settings.frontend_origin)
    app.state.ml_status = get_model_status()
    app.state.alert_scheduler = start_scheduler()
    yield
    if getattr(app.state, "alert_scheduler", None) is not None:
        app.state.alert_scheduler.shutdown()
    log.info("climateguard_shutdown")


app.router.lifespan_context = lifespan
app.include_router(health.router, prefix="/api")
app.include_router(location.router, prefix="/api")
app.include_router(raw.router, prefix="/api")
app.include_router(risk.router, prefix="/api")
app.include_router(heat.router, prefix="/api")
app.include_router(fire.router, prefix="/api")
app.include_router(crop.router, prefix="/api")
app.include_router(iot.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(data_sources.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")
app.include_router(demo.router, prefix="/api")
app.include_router(validation.router, prefix="/api")
app.include_router(ml.router, prefix="/api")
