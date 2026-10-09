"""Service layer — thin business logic between the
API routes and the (currently mocked) data providers.

Each domain exposes a Protocol (the future real
interface) and a Mock implementation. Replace a mock
with a real service to move from DEMO / SIMULATED
DATA to live satellite processing.
"""

from .analysis_service import AnalysisService
from .connectivity_service import (
    ConnectivityService,
    MockConnectivityService,
    RealConnectivityService,
)
from .flood_detection_service import (
    FloodDetectionService,
    MockFloodDetectionService,
)
from .infrastructure_service import (
    MockOsmService,
    OsmService,
    RealOsmService,
)
from .satellite_service import (
    MockCopernicusService,
    CopernicusDataService,
)
from .validation_service import (
    MockValidationService,
    ValidationService,
    RealValidationService,
)

__all__ = [
    "AnalysisService",
    "MockCopernicusService",
    "FloodDetectionService",
    "MockFloodDetectionService",
    "OsmService",
    "MockOsmService",
    "ConnectivityService",
    "MockConnectivityService",
    "ValidationService",
    "MockValidationService",
]
