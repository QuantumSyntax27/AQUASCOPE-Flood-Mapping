"""Satellite data API routes.

Handles Sentinel-1 scene discovery and selection.

Provides:
- /satellite/status — service status with source tracking
- /satellite/discover — discover scenes for given AOI and event date
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..core.config import settings
from ..services.satellite_service import discover_scenes, MockCopernicusService

router = APIRouter()


@router.get("/status")
def satellite_status() -> dict[str, object]:
    """Status of the satellite data service.

    Returns source information so the UI can distinguish REAL vs FALLBACK.
    """
    # Check if real service is available by attempting a lightweight query
    # We test with a minimal AOI and a known date; if it succeeds, source is REAL
    # Otherwise, source is FALLBACK
    try:
        from datetime import date

        # Quick test: try discovering scenes for Trishuli-like AOI and a date
        test_aoi = {
            "type": "Polygon",
            "coordinates": [[
                [85.184, 27.851],
                [85.239, 27.851],
                [85.239, 27.873],
                [85.184, 27.873],
                [85.184, 27.851],
            ]],
        }
        from ..services.satellite_service import discover_scenes

        result = discover_scenes("2026-08-26", test_aoi)
        if result is not None:
            source = getattr(result, "source", "FALLBACK")
        else:
            source = "FALLBACK"
    except Exception:
        source = "FALLBACK"

    svc = "Satellite Data Service"
    if source == "REAL":
        status_text = "operational (real data)"
    else:
        status_text = "operational (mock / demo)"

    return {
        "service": svc,
        "status": status_text,
        "version": settings.app_version,
        "providers": [
            "Copernicus Data Space — Sentinel-1",
            "Copernicus Data Space — Sentinel-2",
            "Copernicus DEM",
        ],
        "demo": source == "FALLBACK",
        "data_source": (
            "REAL — Copernicus Data Space API"
            if source == "REAL"
            else "DEMO / SIMULATED DATA"
        ),
        "source": source,
        "note": (
            "Real Copernicus Data Space API queries are performed when network and "
            "credentials permit. Otherwise the deterministic mock fallback is used."
        ),
    }


@router.post("/discover")
def discover_scenes_endpoint(
    event_date: str,
    aoi: dict[str, Any],
) -> dict[str, object]:
    """Discover Sentinel-1 scenes for the given event date and AOI.

    The backend automatically selects suitable before/after scenes.
    The user does NOT manually choose orbit, acquisition date, or scene.

    Returns selected scenes with metadata and source tracking.
    """
    try:
        result = discover_scenes(event_date, aoi)
        if result is None:
            raise HTTPException(
                status_code=404,
                detail="No suitable Sentinel-1 scenes found for the given date and AOI. "
                "This may be due to: no satellite coverage, network unavailable, "
                "or the deterministic mock having no matching entries. "
                "Try a different event date or check network connectivity.",
            )

        # Build response, preserving source tracking
        source = getattr(result, "source", "FALLBACK")

        # Ensure all sub-models have source tracking propagated
        def _propagate_source(obj: Any) -> Any:
            """Recursively ensure source field is present on scene objects."""
            if hasattr(obj, "source"):
                obj.source = source  # type: ignore[assignment]
            if hasattr(obj, "before_scene") and hasattr(obj.before_scene, "source"):
                obj.before_scene.source = source  # type: ignore[assignment]
            if hasattr(obj, "event_scene") and hasattr(obj.event_scene, "source"):
                obj.event_scene.source = source  # type: ignore[assignment]
            if hasattr(obj, "after_scene") and hasattr(obj.after_scene, "source"):
                obj.after_scene.source = source  # type: ignore[assignment]
            return obj

        result = _propagate_source(result)

        return {
            "service": "Satellite Data Service",
            "source": source,
            "before_scene": result.before_scene.model_dump() if hasattr(result.before_scene, "model_dump") else result.before_scene.model_dump(),
            "event_scene": result.event_scene.model_dump() if hasattr(result.event_scene, "model_dump") else result.event_scene.model_dump(),
            "after_scene": result.after_scene.model_dump() if hasattr(result.after_scene, "model_dump") else result.after_scene.model_dump(),
            "relative_orbit": result.relative_orbit,
            "coverage_status": result.coverage_status,
            "orbit_compatible": result.orbit_compatible,
            "fallback_used": result.fallback_used,
            "fallback_note": result.fallback_note,
            "dem_source": result.dem_source,
            "osm_release": result.osm_release,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Satellite scene discovery failed: {str(e)}. "
            "The real Copernicus Data Space API may be temporarily unavailable. "
            "The deterministic mock fallback has been engaged.",
        )