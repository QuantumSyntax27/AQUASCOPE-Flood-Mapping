"""Infrastructure impact API routes."""

from __future__ import annotations

from fastapi import APIRouter

from ..core.config import settings

router = APIRouter()


@router.get("/status")
def infrastructure_status() -> dict[str, object]:
    """Status of the infrastructure analysis service."""
    return {
        "service": "Infrastructure Analysis Service",
        "status": "operational (mock)",
        "version": settings.app_version,
        "providers": ["ohsome / OpenStreetMap (planned)"],
        "outputs": [
            "potentially affected roads",
            "potentially affected buildings",
            "potentially affected bridges",
        ],
        "demo": True,
        "data_source": "DEMO / SIMULATED DATA",
        "note": (
            "Infrastructure overlay is simulated in this stage. "
            "Real OSM/ohsome queries arrive with the pipeline "
            "implementation."
        ),
    }
