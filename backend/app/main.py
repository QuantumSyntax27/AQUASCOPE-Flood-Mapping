"""AQUASCOPE backend — FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    analysis,
    connectivity,
    infrastructure,
    satellite,
)
from app.core.config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Application lifecycle hook (reserved for DB / Redis)."""
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Flood damage and road-connectivity analysis platform. "
        "Current stage: foundation with mock services — all "
        "values are DEMO / SIMULATED DATA."
    ),
    lifespan=lifespan,
)

# CORS — configurable origins, no hardcoded production assumptions
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routers
app.include_router(
    analysis.router,
    prefix=settings.api_prefix + "/analysis",
    tags=["analysis"],
)
app.include_router(
    satellite.router,
    prefix=settings.api_prefix + "/satellite",
    tags=["satellite"],
)
app.include_router(
    infrastructure.router,
    prefix=settings.api_prefix + "/infrastructure",
    tags=["infrastructure"],
)
app.include_router(
    connectivity.router,
    prefix=settings.api_prefix + "/connectivity",
    tags=["connectivity"],
)


@app.get("/")
def root() -> dict[str, object]:
    """Service root — links to documentation."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "data_source": "DEMO / SIMULATED DATA",
        "docs": "/docs",
        "health": f"{settings.api_prefix}/analysis/health",
        "run_analysis": f"{settings.api_prefix}/analysis/run",
    }
