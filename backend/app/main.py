"""ClimateGuard AI — FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

import time
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
from app.routers import alerts, crop, dams, data_sources, demo, drainage, fire, health, heat, hydromet, iot, location, ml, notifications, raw, risk, simulation, translate, validation

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
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-Process-Time"],
)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(GZipMiddleware, minimum_size=500)

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = f"{process_time:.4f}"
    return response

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
app.include_router(hydromet.router, prefix="/api")
app.include_router(raw.router, prefix="/api")
app.include_router(risk.router, prefix="/api")
app.include_router(heat.router, prefix="/api")
app.include_router(fire.router, prefix="/api")
app.include_router(crop.router, prefix="/api")
app.include_router(drainage.router, prefix="/api")
app.include_router(dams.router, prefix="/api")
app.include_router(iot.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(data_sources.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(simulation.router, prefix="/api")
app.include_router(demo.router, prefix="/api")
app.include_router(validation.router, prefix="/api")
app.include_router(ml.router, prefix="/api")
app.include_router(translate.router, prefix="/api")


# ---------------------------------------------------------------------------
# Frontend Single-Page Application (SPA) Serving
# ---------------------------------------------------------------------------
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

@app.get("/docs", include_in_schema=False)
async def redirect_docs():
    return RedirectResponse(url="/api/docs")

@app.get("/redoc", include_in_schema=False)
async def redirect_redoc():
    return RedirectResponse(url="/api/redoc")

candidate_dists = [
    Path(__file__).resolve().parents[1] / "dist",
    Path(__file__).resolve().parents[2] / "frontend" / "dist",
    Path(__file__).resolve().parents[3] / "frontend" / "dist",
    Path.cwd() / "frontend" / "dist",
    Path.cwd() / "dist",
]
frontend_dist = next((p for p in candidate_dists if p.exists() and (p / "index.html").exists()), None)

if frontend_dist is not None:
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        file_candidate = frontend_dist / full_path
        if file_candidate.is_file():
            return FileResponse(file_candidate)
        return FileResponse(frontend_dist / "index.html")
