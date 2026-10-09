"""Road connectivity API routes."""

from __future__ import annotations

from fastapi import APIRouter

from ..core.config import settings

router = APIRouter()


@router.get("/status")
def connectivity_status() -> dict[str, object]:
    """Status of the road connectivity service."""
    return {
        "service": "Road Connectivity Service",
        "status": "operational (mock)",
        "version": settings.app_version,
        "providers": ["NetworkX road graph (planned)"],
        "outputs": [
            "potentially road-disconnected settlements",
            "alternative route availability",
        ],
        "demo": True,
        "data_source": "DEMO / SIMULATED DATA",
        "note": (
            "Connectivity analysis is simulated in this stage. "
            "Real road-graph analysis arrives with the pipeline "
            "implementation."
        ),
    }
