"""Flood detection service.

Interface :class:`FloodDetectionService` — the future real
implementation will run the PyTorch Siamese/SNUNet-style
change-detection model on the preprocessed Sentinel-1
before/after stack. The mock returns the simulated flood
probability outcome, confidence split and binary mask
for the default demo scenario.
"""

from __future__ import annotations

from typing import Any, Protocol

from ..schemas.results import (
    FloodAnalysisResult,
    FloodConfidenceBreakdown,
)
from ..schemas.satellite import SatelliteSceneSelection


class FloodDetectionService(Protocol):
    """Flood segmentation contract (future: PyTorch model)."""

    def detect_flood(
        self,
        aoi: dict[str, Any],
        scenes: SatelliteSceneSelection,
    ) -> FloodAnalysisResult: ...


class MockFloodDetectionService:
    """Simulates AI flood mapping over the demo scenario."""

    def __init__(self, scenario: dict[str, Any]) -> None:
        self._scenario = scenario

    def detect_flood(
        self,
        aoi: dict[str, Any],
        scenes: SatelliteSceneSelection,
    ) -> FloodAnalysisResult:
        flood = self._scenario["flood"]
        return FloodAnalysisResult(
            flood_mapped_area_km2=flood["flood_mapped_area_km2"],
            confidence=FloodConfidenceBreakdown(
                high_confidence_km2=flood["high_confidence_km2"],
                borderline_km2=flood["borderline_km2"],
                uncertain_km2=flood["uncertain_km2"],
            ),
            flood_mask=self._scenario["flood_mask"],
            mask_format="GeoJSON",
            source=flood["source"],
        )
