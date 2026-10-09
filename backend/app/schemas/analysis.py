"""Analysis request / response schemas.

The public API accepts ONLY the three primary inputs:
location, AOI and event date. All technical parameters
(scene selection, orbit, model, threshold, preprocessing)
are decided by the backend and never exposed to callers.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator

from .results import (
    AiModelInfo,
    AnalysisMetadata,
    ConnectivityResult,
    FloodAnalysisResult,
    InfrastructureImpact,
    ProcessingPipeline,
    ValidationResult,
)
from .satellite import SatelliteSceneSelection


class AnalysisRequest(BaseModel):
    """Primary analysis request — the only public input contract."""

    location: str = Field(
        min_length=2,
        max_length=200,
        description="Human-readable location, e.g. 'Trishuli, Nepal'",
    )
    aoi: Optional[dict[str, Any]] = Field(
        default=None,
        description=(
            "Area of interest as a GeoJSON polygon "
            '({"type": "Polygon", "coordinates": […]}). '
            "Optional — the backend derives a default corridor "
            "around the location when omitted."
        ),
    )
    event_date: str = Field(
        description="Flood event date, ISO 8601 (YYYY-MM-DD)"
    )

    @field_validator("event_date")
    @classmethod
    def validate_event_date(cls, value: str) -> str:
        """Reject malformed and future dates."""
        try:
            parsed = date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError(
                "event_date must be a valid ISO 8601 date (YYYY-MM-DD)"
            ) from exc
        if parsed > date.today():
            raise ValueError("event_date cannot be in the future")
        return value


class AnalysisResult(BaseModel):
    """Complete (mock) analysis result — structured for the frontend."""

    analysis_id: str
    status: str = Field(description="completed")
    location: str
    aoi: dict[str, Any]
    event_date: str

    satellite: SatelliteSceneSelection
    flood: FloodAnalysisResult
    ai: AiModelInfo
    infrastructure: InfrastructureImpact
    connectivity: ConnectivityResult
    validation: ValidationResult
    processing: ProcessingPipeline

    limitations: list[str]
    metadata: AnalysisMetadata
