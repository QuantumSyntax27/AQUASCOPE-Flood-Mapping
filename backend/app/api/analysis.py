"""Analysis API routes.

Routes are deliberately thin: they validate input,
delegate to :class:`AnalysisService` and shape the
response. No business logic lives here.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..core.config import settings
from ..schemas.analysis import AnalysisRequest, AnalysisResult
from ..services import AnalysisService

router = APIRouter()

# One orchestrator instance; each stage uses a mock
# service that can later be swapped for a real one.
analysis_service = AnalysisService()


@router.get("/health")
def analysis_health() -> dict[str, str]:
    """Health of the analysis API."""
    return {
        "status": "healthy",
        "service": "AQUASCOPE Analysis API",
        "version": settings.app_version,
        "data_source": "DEMO / SIMULATED DATA",
    }


@router.post("/run", response_model=AnalysisResult)
def run_analysis(request: AnalysisRequest) -> AnalysisResult:
    """Run a (mock) flood-impact analysis.

    Accepts only the three primary inputs — location,
    AOI and event date. Scene selection, orbit
    selection, model parameters and preprocessing are
    decided by the backend.
    """
    try:
        return analysis_service.run_analysis(request)
    except ValueError as exc:
        raise HTTPException(
            status_code=422, detail=str(exc)
        ) from exc
