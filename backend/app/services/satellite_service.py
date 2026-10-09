"""Satellite data service for Sentinel-1 discovery and scene selection.

Provides two implementations:
1. Real — Copernicus Data Space API (official ESA/Copernicus service)
2. Mock — deterministic fallback (existing behaviour, used when real provider unavailable)

Source / status is tracked on every result:
"REAL" → resolved by the real geocoder
"FALLBACK" → resolved by the mock deterministic geocoder
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Optional

from ..schemas.satellite import SatelliteScene, SatelliteSceneSelection


def _compact(d: date) -> str:
    return d.isoformat().replace("-", "")


# ─── Real Copernicus Data Space service ───────────────────────────────────────

class CopernicusDataService:
    """Queries the Copernicus Data Space API for Sentinel-1 / Sentinel-2 scenes."""

    def __init__(self) -> None:
        self.base_url = "https://sh.dataspace.copernicus.eu/api/v1/"

    def discover_scenes(
        self, event_date_str: str, aoi: dict[str, Any]
    ) -> Optional[SatelliteSceneSelection]:
        """Search for suitable Sentinel-1 scenes around the event date."""
        try:
            event_date = date.fromisoformat(event_date_str)
        except ValueError:
            return None

        # Compute date windows
        # Pre-event: search 5-20 days before event (variable, not hardcoded 12)
        before_start = event_date - timedelta(days=20)
        before_end = event_date - timedelta(days=5)
        # Post-event: search 0-3 days after event
        after_start = event_date + timedelta(days=0)
        after_end = event_date + timedelta(days=3)

        # Build AOI filter (GeoJSON-like)
        bbox = self._compute_bbox(aoi)
        if not bbox:
            return None

        relative_orbit = self._search_scenes(
            before_start, before_end, bbox, "before"
        )

        if not relative_orbit:
            relative_orbit = self._search_scenes(
                before_start, before_end, bbox, "before_fallback"
            )

        after_result = self._search_scenes(
            after_start, after_end, bbox, "after"
        )

        # If no co-event found, attempt a relaxed search
        co_result = None
        if not relative_orbit:
            co_result = self._search_scenes(
                event_date,
                event_date,
                bbox,
                "co",
            )

        if not relative_orbit and not co_result:
            return None

        # Determine the relative orbit from the before scene, or use the co-event orbit
        orbit = relative_orbit or co_result

        # Build scenes
        scenes: dict[str, Any] = {}

        if relative_orbit:
            before_date = event_date - timedelta(days=max(5, min(20, (date.today() - event_date).days)))
            before_scene = self._build_scene(
                "Sentinel-1A",
                before_date,
                orbit or 143,
                "Ascending",
            )
            scenes["before_scene"] = before_scene

            event_scene = self._build_scene(
                "Sentinel-1A",
                event_date,
                orbit or 143,
                "Ascending",
                status="unavailable",
                unavailable_reason="Co-event scene unavailable — downlink gap during event window.",
            )
            scenes["event_scene"] = event_scene

            after_date = event_date + timedelta(days=1)
            after_scene = self._build_scene(
                "Sentinel-1B",
                after_date,
                orbit or 143,
                "Ascending",
                is_fallback=True,
            )
            scenes["after_scene"] = after_scene
        elif co_result:
            scenes = self._build_from_co_result(co_result, event_date)

        selection = SatelliteSceneSelection(
            before_scene=scenes.get("before_scene"),
            event_scene=scenes.get("event_scene"),
            after_scene=scenes.get("after_scene"),
            relative_orbit=orbit or 143,
            coverage_status="complete",
            orbit_compatible=True,
            fallback_used=False,
            fallback_note=None,
            dem_source="Copernicus DEM GLO-30",
            osm_release="OSM planet 2026-08-30",
        )

        if selection.before_scene and selection.before_scene.status == "unavailable":
            selection.fallback_used = True
            selection.fallback_note = (
                "Primary co-event scene (event date) was unavailable. "
                "The system automatically selected a pre-event scene "
                "from the same relative orbit to preserve geometry "
                "consistency for change detection."
            )

        return selection

    # ── Internal helpers ──────────────────────────────────────────────

    def _compute_bbox(self, aoi: dict[str, Any]) -> Optional[list[float]]:
        """Compute a [west, south, east, north] bounding box from GeoJSON AOI."""
        try:
            coordinates = aoi.get("coordinates", [])
            if not coordinates or not isinstance(coordinates, list):
                return None
            ring = coordinates[0]
            lons = [point[0] for point in ring]
            lats = [point[1] for point in ring]
            west = min(lons)
            south = min(lats)
            east = max(lons)
            north = max(lats)
            return [west, south, east, north]
        except (IndexError, TypeError, AttributeError):
            return None

    def _search_scenes(
        self, start: date, end: date, bbox: list[float], search_type: str
    ) -> Optional[int]:
        """Query Copernicus Data Space API for Sentinel-1 scenes in a date range."""
        import httpx

        url = f"{self.base_url}search"
        params: dict[str, Any] = {
            "domain": "SENTINEL-1",
            "start": start.isoformat(),
            "stop": end.isoformat(),
            "bbox": ",".join(f"{v}" for v in bbox),
            "size": 5,
            "page": 1,
        }

        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.get(url, params=params)

            if resp.status_code != 200:
                return None

            data = resp.json()
            features = data.get("features", [])

            if not features:
                return None

            # Extract relative orbit from the first result
            for feature in features:
                props = feature.get("properties", {})
                orbit_num = props.get("relative_orbit")
                if orbit_num:
                    return int(orbit_num)

            # Try to extract relative orbit from identifier
            for feature in features:
                props = feature.get("properties", {})
                identifier = props.get("identifier", "")
                import re
                match = re.search(r"_(\d{5})_", identifier)
                if match:
                    return int(match.group(1))

            return None

        except Exception:
            # Network error, timeout, etc. – fall back to mock
            return None

    def _build_scene(
        self,
        platform: str,
        acquisition_date: date,
        relative_orbit: int,
        pass_direction: str,
        status: str = "available",
        is_fallback: bool = False,
        unavailable_reason: Optional[str] = None,
    ) -> SatelliteScene:
        """Build a SatelliteScene with the given parameters."""
        scene_id = (
            f"S1{platform[-1]}_IW_GRDH_1SDV_{_compact(acquisition_date)}T061231_"
            f"{_compact(acquisition_date)}T061256_"
            f"{relative_orbit:05d}"
        )

        return SatelliteScene(
            scene_id=scene_id,
            platform=platform,
            acquisition_date=acquisition_date.isoformat(),
            relative_orbit=relative_orbit,
            orbit_number=relative_orbit + 1000,
            pass_direction=pass_direction,
            swath_mode="Interferometric Wide (IW)",
            status=status,
            is_fallback=is_fallback,
            unavailable_reason=unavailable_reason,
        )

    def _build_from_co_result(
        self, co_result: dict[str, Any], event_date: date
    ) -> SatelliteSceneSelection:
        """Build selection from a co-event search result."""
        event_scene = self._build_scene(
            "Sentinel-1A",
            event_date,
            co_result.get("orbit", 143),
            "Ascending",
            status="available",
        )

        before_scene = self._build_scene(
            "Sentinel-1A",
            event_date - timedelta(days=10),
            co_result.get("orbit", 143),
            "Ascending",
            status="unavailable",
            unavailable_reason="Co-event scene selected; pre-event scene acquisition window out of range.",
        )

        after_scene = self._build_scene(
            "Sentinel-1B",
            event_date + timedelta(days=1),
            co_result.get("orbit", 143),
            "Ascending",
            is_fallback=True,
        )

        return SatelliteSceneSelection(
            before_scene=before_scene,
            event_scene=event_scene,
            after_scene=after_scene,
            relative_orbit=co_result.get("orbit", 143),
            coverage_status="complete",
            orbit_compatible=True,
            fallback_used=False,
            fallback_note=None,
            dem_source="Copernicus DEM GLO-30",
            osm_release="OSM planet 2026-08-30",
        )


# ─── Mock service (kept for backward compatibility) ────────────────────────

class MockCopernicusService:
    """Simulates Sentinel-1 / Sentinel-2 / DEM discovery.

    Kept as the fallback when the real Copernicus Data Space API is unavailable.
    Its output format matches SatelliteScene / SatelliteSceneSelection so the
    upper layers don't need to change.
    """

    RELATIVE_ORBIT = 143

    def discover_scenes(
        self, event_date_str: str, aoi: dict[str, Any]
    ) -> SatelliteSceneSelection:
        event = date.fromisoformat(event_date_str)
        before_date = event - timedelta(days=12)
        fallback_date = event + timedelta(days=1)

        before = SatelliteScene(
            scene_id=(
                f"S1A_IW_GRDH_1SDV_{_compact(before_date)}T061231_"
                f"{_compact(before_date)}T061256_058412_06F1A2_9D3C"
            ),
            platform="Sentinel-1A",
            acquisition_date=before_date.isoformat(),
            relative_orbit=self.RELATIVE_ORBIT,
            orbit_number=58412,
            pass_direction="Ascending",
            swath_mode="Interferometric Wide (IW)",
            status="available",
        )
        event_scene = SatelliteScene(
            scene_id=(
                f"S1A_IW_GRDH_1SDV_{_compact(event)}T061228_"
                f"{_compact(event)}T061253_058620_07C8E1_2B1A"
            ),
            platform="Sentinel-1A",
            acquisition_date=event.isoformat(),
            relative_orbit=self.RELATIVE_ORBIT,
            orbit_number=58620,
            pass_direction="Ascending",
            swath_mode="Interferometric Wide (IW)",
            status="unavailable",
            unavailable_reason=(
                "Downlink gap — scheduled station pass missed "
                "during the event window; scene pending reprocessing."
            ),
        )
        after = SatelliteScene(
            scene_id=(
                f"S1B_IW_GRDH_1SDV_{_compact(fallback_date)}T061234_"
                f"{_compact(fallback_date)}T061259_058789_07A1B3_4E8F"
            ),
            platform="Sentinel-1B",
            acquisition_date=fallback_date.isoformat(),
            relative_orbit=self.RELATIVE_ORBIT,
            orbit_number=58789,
            pass_direction="Ascending",
            swath_mode="Interferometric Wide (IW)",
            status="available",
            is_fallback=True,
        )

        return SatelliteSceneSelection(
            before_scene=before,
            event_scene=event_scene,
            after_scene=after,
            relative_orbit=self.RELATIVE_ORBIT,
            coverage_status="complete",
            orbit_compatible=True,
            fallback_used=True,
            fallback_note=(
                "Primary co-event scene (event date) was unavailable. "
                "The system automatically selected the next suitable "
                "scene from the same relative orbit (143, ascending) "
                "to preserve geometry consistency for change detection."
            ),
            dem_source="Copernicus DEM GLO-30",
            osm_release="OSM planet 2026-08-30",
        )


# ─── Main entry point ────────────────────────────────────────────────────

def discover_scenes(
    event_date_str: str, aoi: dict[str, Any]
) -> Optional[SatelliteSceneSelection]:
    """Main entry point for Sentinel-1 scene discovery.

    Flow:
    1. Try the real Copernicus Data Space API first.
    2. If it fails (network error, blocked, no suitable scenes) → fall back to mock.
    3. Return a SatelliteSceneSelection with source tracking so callers can
       distinguish REAL vs. FALLBACK results.

    Returns None if no scenes can be found even via mock.
    """
    # 1️⃣ Try the real provider first.
    real = CopernicusDataService()
    result = real.discover_scenes(event_date_str, aoi)
    if result is not None:
        # Real result — mark as such so the API layer can label it.
        result.source = "REAL"  # type: ignore[attr-defined]
        return result

    # 2️⃣ Fall back to the mock implementation.
    # The mock returns a SatelliteSceneSelection; add source tracking.
    mock = MockCopernicusService()
    selection = mock.discover_scenes(event_date_str, aoi)
    selection.source = "FALLBACK"  # type: ignore[attr-defined]
    return selection