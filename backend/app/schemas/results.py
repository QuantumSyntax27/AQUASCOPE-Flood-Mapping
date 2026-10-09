"""Structured analysis result schemas.

Every section is designed so the mock services can later be
replaced by real implementations (Copernicus, OSM/ohsome,
PyTorch flood model, NetworkX connectivity) without changing
the API contract.

Scientific language is deliberate: results describe areas
"potentially affected" and settlements "potentially
road-disconnected". Flood overlap never implies destruction.
"""

from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


# ─── Flood analysis ─────────────────────────────────────────


class FloodConfidenceBreakdown(BaseModel):
    high_confidence_km2: float
    borderline_km2: float
    uncertain_km2: float


class FloodMaskResult(BaseModel):
    """Result of flood mask generation service."""
    source: str
    data_source: str
    mask_status: str
    mask_dimensions: dict[str, Any]
    crs: str
    bounds: dict[str, Any]
    resolution_m: float
    threshold: float
    threshold_source: str
    flooded_pixel_count: int
    valid_pixel_count: int
    flooded_area_m2: float
    flooded_area_km2: float
    aoi_area_m2: float
    aoi_area_km2: float
    flooded_percentage: float | None
    confidence_available: bool
    uncertainty_flags: list[str]
    processing_status: str
    warnings: list[str]
    high_confidence_km2: float
    borderline_km2: float
    uncertain_km2: float


class FloodAnalysisResult(BaseModel):
    flood_mapped_area_km2: float = Field(
        description="Total flood mapped area in square kilometres"
    )
    confidence: FloodConfidenceBreakdown
    flood_mask: dict[str, Any] = Field(
        description="GeoJSON FeatureCollection of simulated flood extents"
    )
    mask_format: str = "GeoJSON"
    source: str = Field(
        description="Sensor / method that produced the mask"
    )


# ─── AI model ───────────────────────────────────────────────


class ModelMetrics(BaseModel):
    iou: float
    dice: float
    precision: float
    recall: float
    f1: float


class AiModelInfo(BaseModel):
    model_name: str
    model_version: str
    architecture: str
    threshold: float = Field(
        description="Validation-selected flood probability threshold"
    )
    metrics: ModelMetrics


# ─── Infrastructure impact ──────────────────────────────────


class RoadImpact(BaseModel):
    total_roads_km: float
    potentially_affected_roads_km: float
    potentially_affected_roads_percentage: float


class BuildingImpact(BaseModel):
    total_buildings: int
    potentially_affected_buildings: int
    total_building_footprint_m2: int
    potentially_affected_building_footprint_m2: int
    potentially_affected_buildings_percentage: float


class BridgeImpact(BaseModel):
    total_bridges: int
    potentially_affected_bridges: int
    potentially_affected_bridges_percentage: float


class InfrastructureImpact(BaseModel):
    roads: RoadImpact
    buildings: BuildingImpact
    bridges: BridgeImpact


# ─── Connectivity ───────────────────────────────────────────


class SettlementDetail(BaseModel):
    settlement_id: str
    name: str
    location: dict[str, float] = Field(
        description='{"lat": …, "lng": …}'
    )
    type: str = Field(description="town | village | hamlet")
    population: int
    status: str = Field(
        description="connected | potentially road-disconnected"
    )
    relevant_town: str
    relevant_hospital: str
    affected_segments: int
    alternate_route_available: Optional[bool]
    before_route_distance_km: float
    after_route_distance_km: Optional[float] = Field(
        default=None,
        description="Re-routed distance when an alternative exists",
    )
    uncertainty: str = Field(
        description="higher | borderline | lower"
    )


class ConnectivityResult(BaseModel):
    total_settlements: int
    connected_settlements: int
    potentially_road_disconnected_settlements: int
    affected_road_segments: int
    alternative_routes_available: int
    alternative_routes_unavailable: int
    settlements: list[SettlementDetail] = Field(
        description="Representative sample of settlements"
    )


# ─── Validation ─────────────────────────────────────────────


class ComparisonRow(BaseModel):
    name: str
    model: float
    reference: float
    unit: str


class ValidationResult(BaseModel):
    reference_source: str
    reference_area_km2: float
    model_area_km2: float
    overlap_km2: float
    metrics: ModelMetrics
    comparison: list[ComparisonRow]
    interpretation: str


# ─── Processing pipeline ────────────────────────────────────


class ProcessingStage(BaseModel):
    stage: str
    status: str = Field(description="completed | failed | skipped")
    duration_ms: int
    logs: list[str] = Field(default_factory=list)


class ProcessingPipeline(BaseModel):
    data_acquisition: ProcessingStage
    preprocessing: ProcessingStage
    flood_mapping: ProcessingStage
    infrastructure_analysis: ProcessingStage
    connectivity_analysis: ProcessingStage
    validation: ProcessingStage


class AnalysisMetadata(BaseModel):
    analysis_id: str
    generated_at: str
    processing_time_ms: int
    demo: bool = True
    data_source: str = "DEMO / SIMULATED DATA"
    disclaimer: str
