"""Satellite scene schemas.

In the real pipeline these describe scenes discovered through the
Copernicus Data Space API (Sentinel-1, Sentinel-2, Copernicus DEM).
The backend — not the caller — decides which scenes to use, so the
public API never exposes scene/orbit selection parameters.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class SatelliteScene(BaseModel):
    """A single satellite scene relevant to the analysis window."""

    scene_id: str
    platform: str = Field(
        description="e.g. Sentinel-1A, Sentinel-1B, Sentinel-2A"
    )
    acquisition_date: str = Field(description="ISO 8601 date (YYYY-MM-DD)")
    relative_orbit: int
    orbit_number: int
    pass_direction: str = Field(description="Ascending or Descending")
    swath_mode: str
    status: str = Field(description="available | unavailable")
    is_fallback: bool = Field(
        default=False,
        description="True when this scene replaced an unavailable primary scene",
    )
    unavailable_reason: Optional[str] = None


class SatelliteSceneSelection(BaseModel):
    """Automatic scene selection produced by the backend."""

    before_scene: SatelliteScene
    event_scene: SatelliteScene
    after_scene: SatelliteScene
    relative_orbit: int
    coverage_status: str = Field(
        description="e.g. complete | partial"
    )
    orbit_compatible: bool
    fallback_used: bool
    fallback_note: Optional[str] = None
    dem_source: str
    osm_release: str
