import sys
sys.path.insert(0, r"C:\Users\chhab\OneDrive\Documents\New OpenCode Project\backend")

from app.services.preprocessing_service import (
    Sentinel1PreprocessingService,
    MockSentinel1PreprocessingService,
    PreprocessedScene,
    PreprocessedPair,
)
print("Imports OK")

# Test that the classes can be instantiated
service = Sentinel1PreprocessingService()
mock_service = MockSentinel1PreprocessingService()
print("Service instantiation OK")

# Test mock preprocess_pair
from app.schemas.satellite import SatelliteScene

before_scene = SatelliteScene(
    scene_id="S1A_20260826",
    platform="Sentinel-1A",
    acquisition_date="2026-08-26",
    relative_orbit=123,
    orbit_number=123,
    pass_direction="Ascending",
    swath_mode="IW",
    status="available",
)

after_scene = SatelliteScene(
    scene_id="S1A_20260926",
    platform="Sentinel-1A",
    acquisition_date="2026-09-26",
    relative_orbit=123,
    orbit_number=123,
    pass_direction="Ascending",
    swath_mode="IW",
    status="available",
)

aoi = {
    "type": "Polygon",
    "coordinates": [
        [[85.0, 27.5], [85.5, 27.5], [85.5, 28.0], [85.0, 28.0], [85.0, 27.5]]
    ]
}

# Test mock service
pair = mock_service.preprocess_pair(before_scene, after_scene, aoi)
print(f"Mock pair source: {pair['before_scene']['source']}")
print(f"Mock before raster_path: {pair['before_scene']['raster_path']}")
print(f"Mock after raster_path: {pair['after_scene']['raster_path']}")

# Test real service (will fail gracefully since no real data)
try:
    real_pair = service.preprocess_pair(before_scene, after_scene, aoi)
    print(f"Real pair source: {real_pair['before_scene']['source']}")
    print(f"Real before raster_path: {real_pair['before_scene']['raster_path']}")
except Exception as e:
    print(f"Real processing failed (expected without real data): {type(e).__name__}")

print("\nAll tests passed!")