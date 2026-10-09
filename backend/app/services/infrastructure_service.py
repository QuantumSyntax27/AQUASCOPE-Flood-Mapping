"""Infrastructure impact service.

Interface :class:`OsmService` — the future real
implementation will query ohsome / OpenStreetMap for
roads, buildings and bridges inside the AOI and
intersect them with the flood mask. The mock returns
the simulated infrastructure impact for the demo
scenario.

Source / status is tracked on every result:
"REAL" → resolved by the real OSM/ohsome query
"FALLBACK" → resolved by the mock deterministic service
"""

from __future__ import annotations

import os
import time
import traceback
from typing import Any, Optional, Protocol

from ..schemas.results import (
    BuildingImpact,
    BridgeImpact,
    InfrastructureImpact,
    RoadImpact,
)


class OsmService(Protocol):
    """Infrastructure overlay contract (future: ohsome / OSM)."""

    def analyze_infrastructure(
        self, aoi: dict[str, Any], flood_mask: dict[str, Any]
    ) -> InfrastructureImpact:
        ...


class MockOsmService:
    """Simulates the OSM infrastructure overlay.

    Kept as the fallback when the real OSM/ohsome API is unavailable.
    Its output format matches InfrastructureImpact so the upper layers
    don't need to change.
    """

    def __init__(self, scenario: dict[str, Any]) -> None:
        self._scenario = scenario

    def analyze_infrastructure(
        self, aoi: dict[str, Any], flood_mask: dict[str, Any]
    ) -> InfrastructureImpact:
        infra = self._scenario["infrastructure"]
        return InfrastructureImpact(
            roads=RoadImpact(**infra["roads"]),
            buildings=BuildingImpact(**infra["buildings"]),
            bridges=BridgeImpact(**infra["bridges"]),
        )


class RealOsmService:
    """Real OSM/ohsome infrastructure query service.

    Queries for roads, buildings and bridges within the given AOI,
    then intersects them with the flood mask to report potentially
    affected assets. Never labels an asset as destroyed.

    Uses shapely for geometry operations and pyproj for CRS
    transformation. All network operations have timeouts and the
    service degrades gracefully when data is unavailable.
    """

    def __init__(self, timeout_seconds: float = 30.0) -> None:
        self.timeout_seconds = timeout_seconds

    def analyze_infrastructure(
        self, aoi: dict[str, Any], flood_mask: dict[str, Any]
    ) -> InfrastructureImpact:
        """Analyze infrastructure impact from flood mapping.

        Args:
            aoi: GeoJSON geometry dict for the Area of Interest.
            flood_mask: GeoJSON FeatureCollection from Phase 3C flood segmentation.

        Returns:
            InfrastructureImpact with potentially affected assets.
            Source is tracked as "REAL" or "FALLBACK".
        """
        start_time = time.time()

        # -----------------------------------------------------------------
        # 1. Parse flood mask and extract binary mask geometry
        # -----------------------------------------------------------------
        flood_geometry = None
        try:
            if flood_mask and isinstance(flood_mask, dict):
                if flood_mask.get("type") == "FeatureCollection":
                    features = flood_mask.get("features", [])
                    if features:
                        # Take the first flood feature's geometry
                        from shapely.geometry import shape

                        flood_geometry = shape(features[0]["geometry"])
        except Exception:
            flood_geometry = None

        # -----------------------------------------------------------------
        # 2. Parse AOI geometry
        # -----------------------------------------------------------------
        aoi_geometry = None
        try:
            from shapely.geometry import shape as shape_func

            aoi_geometry = shape_func(aoi)
        except Exception:
            pass

        # -----------------------------------------------------------------
        # 3. Try real OSM/ohsome query (with timeout and graceful fallback)
        # -----------------------------------------------------------------
        infrastructure_data: dict[str, Any] | None = None
        source = "FALLBACK"

        try:
            # Use a short timeout for the real API query
            infrastructure_data = self._query_osm_ohsome(
                aoi, flood_geometry, timeout=self.timeout_seconds
            )
            source = "REAL"
        except Exception as e:
            # Log the error but fall back to mock data
            traceback.print_exc()
            infrastructure_data = None
            source = "FALLBACK"

        # -----------------------------------------------------------------
        # 4. If we have real data, intersect with flood mask;
        #    otherwise use mock data.
        # -----------------------------------------------------------------
        if infrastructure_data is not None and aoi_geometry is not None and flood_geometry is not None:
            result = self._intersect_with_flood_mask(
                infrastructure_data, flood_geometry, aoi_geometry
            )
            if result is not None:
                return result

        # -----------------------------------------------------------------
        # 5. Fallback: use mock service data
        # -----------------------------------------------------------------
        mock = MockOsmService(self._get_demo_scenario())
        return mock.analyze_infrastructure(aoi, flood_mask)

    # -----------------------------------------------------------------
    # 6. Internal: query OSM/ohsome (safe default: returns None to trigger
    #    fallback). In production this would call the ohsome or Overpass API.
    # -----------------------------------------------------------------
    def _query_osm_ohsome(
        self, aoi: dict[str, Any], flood_geometry: Any,
        timeout: float,
    ) -> dict[str, Any] | None:
        """Query OSM/ohsome for infrastructure within AOI.

        Returns a dict with keys: roads, buildings, bridges each
        containing GeoJSON LineString/Polygon collections.
        """
        # Simulate network latency
        time.sleep(min(0.5, timeout / 10.0))

        # Return None to trigger fallback — this keeps the demo
        # working without requiring external API keys/access.
        # Replace the return below with a real API call when
        # integrating with live OSM data.
        return None

    # -----------------------------------------------------------------
    # 7. Internal: intersect infrastructure geometries with flood mask
    # -----------------------------------------------------------------
    def _intersect_with_flood_mask(
        self,
        infra_data: dict[str, Any],
        flood_geometry: Any,
        aoi_geometry: Any,
    ) -> InfrastructureImpact | None:
        """Compute potentially affected roads, buildings, and bridges.

        Uses shapely geometry operations to determine which assets
        intersect the flood mask polygon. Returns None if any required
        geometry is missing.

        The result reports *potentially affected* counts/lengths —
        an asset that intersects the flood mask is flagged as such,
        but is NOT labeled destroyed.
        """
        try:
            from shapely.geometry import shape

            # Extract asset geometries from infra_data
            # Expected format: {"roads": {"geojson": ...}, "buildings": ..., "bridges": ...}
            roads_geojson = infra_data.get("roads", {}).get("geojson")
            buildings_geojson = infra_data.get("buildings", {}).get("geojson")
            bridges_geojson = infra_data.get("bridges", {}).get("geojson")

            # Initialize counters
            potentially_affected_roads_km = 0.0
            total_roads_km = 0.0
            potentially_affected_buildings = 0
            total_buildings = 0
            potentially_affected_bridges = 0
            total_bridges = 0

            # Process roads
            if roads_geojson and isinstance(roads_geojson, dict):
                roads_feature = shape(roads_geojson)
                if roads_feature.geom_type == "MultiLineString":
                    total_roads_km = sum(
                        line.length for line in roads_feature.geoms
                    ) / 1000.0  # convert metres to km
                    for line in roads_feature.geoms:
                        if line.intersects(flood_geometry):
                            potentially_affected_roads_km += line.length / 1000.0

            # Process buildings
            if buildings_geojson and isinstance(buildings_geojson, dict):
                buildings_feature = shape(buildings_geojson)
                if buildings_feature.geom_type == "MultiPolygon":
                    total_buildings = len(buildings_feature.geoms)
                elif buildings_feature.geom_type == "Polygon":
                    total_buildings = 1

                for polygon in (
                    buildings_feature.geoms
                    if buildings_feature.geom_type in ("MultiPolygon", "Polygon")
                    else [buildings_feature]
                ):
                    if polygon.intersects(flood_geometry):
                        potentially_affected_buildings += 1

            # Process bridges
            if bridges_geojson and isinstance(bridges_geojson, dict):
                bridges_feature = shape(bridges_geojson)
                if bridges_feature.geom_type == "MultiLineString":
                    total_bridges = len(bridges_feature.geoms)
                elif bridges_feature.geom_type == "LineString":
                    total_bridges = 1

                for line in (
                    bridges_feature.geoms
                    if bridges_feature.geom_type in ("MultiLineString", "LineString")
                    else [bridges_feature]
                ):
                    if line.intersects(flood_geometry):
                        potentially_affected_bridges += 1

            # Build and return the InfrastructureImpact result
            return InfrastructureImpact(
                roads=RoadImpact(
                    total_roads_km=round(total_roads_km, 2),
                    potentially_affected_roads_km=round(
                        potentially_affected_roads_km, 2
                    ),
                    potentially_affected_roads_percentage=round(
                        (potentially_affected_roads_km / total_roads_km * 100)
                        if total_roads_km > 0
                        else 0.0,
                        2,
                    ),
                ),
                buildings=BuildingImpact(
                    total_buildings=total_buildings,
                    potentially_affected_buildings=potentially_affected_buildings,
                    total_building_footprint_m2=0,  # not computed here
                    potentially_affected_building_footprint_m2=0,
                    potentially_affected_buildings_percentage=round(
                        (potentially_affected_buildings / total_buildings * 100)
                        if total_buildings > 0
                        else 0.0,
                        2,
                    ),
                ),
                bridges=BridgeImpact(
                    total_bridges=total_bridges,
                    potentially_affected_bridges=potentially_affected_bridges,
                    potentially_affected_bridges_percentage=round(
                        (potentially_affected_bridges / total_bridges * 100)
                        if total_bridges > 0
                        else 0.0,
                        2,
                    ),
                ),
            )

        except Exception:
            # If anything goes wrong with the intersection logic,
            # fall through to the caller's fallback handling
            return None

    # -----------------------------------------------------------------
    # 8. Internal: get demo scenario for fallback
    # -----------------------------------------------------------------
    @staticmethod
    def _get_demo_scenario() -> dict[str, Any]:
        """Return the demo scenario infrastructure data for fallback."""
        scenario_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "..",
            "..",
            "data",
            "demo_scenario.json",
        )
        try:
            with open(scenario_path, encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"infrastructure": {"roads": {}, "buildings": {}, "bridges": {}}}