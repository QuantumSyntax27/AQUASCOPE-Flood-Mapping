# AQUASCOPE Backend

Flood damage and road-connectivity analysis platform —
backend foundation with **mock services (DEMO / SIMULATED DATA)**.

> **Current stage:** foundation + mock services only.
> All values returned by this backend are **DEMO / SIMULATED DATA**
> and must not be presented as real satellite observations.

## Purpose

AQUASCOPE takes three primary inputs — **location**, **area of
interest (AOI)** and **event date** — and produces a structured
flood-impact analysis:

```
Location + AOI + Event Date
        ↓
Sentinel-1 / Sentinel-2 data discovery
        ↓
Satellite preprocessing
        ↓
AI flood segmentation (flood mask)
        ↓
OSM infrastructure overlay
        ↓
Affected roads / buildings / bridges
        ↓
Road network connectivity analysis
        ↓
Potentially road-disconnected settlements
        ↓
Validation (EMSR927 comparison)
        ↓
Dashboard + Situation Report
```

The public API exposes **only** the three primary inputs.
Technical parameters (scene selection, orbit, model, threshold,
preprocessing) are decided by the backend and are never part of
the request contract.

## Requirements

- **Python 3.11** (required — do not use Python 3.14 for this backend)
- pip

## Setup

```bash
cd backend

# 1. Create a Python 3.11 virtual environment
py -3.11 -m venv venv        # Windows
python3.11 -m venv venv      # macOS / Linux

# 2. Activate it
venv\Scripts\activate        # Windows PowerShell
source venv/bin/activate     # macOS / Linux

# 3. Install dependencies
pip install -r requirements.txt
```

## Running the server

```bash
# from the backend directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- API: <http://localhost:8000>
- Interactive docs (Swagger UI): <http://localhost:8000/docs>
- ReDoc: <http://localhost:8000/redoc>
- Health check: <http://localhost:8000/api/v1/analysis/health>

## API overview

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET`  | `/api/v1/analysis/health` | Health of the analysis API |
| `POST` | `/api/v1/analysis/run` | Run a (mock) flood-impact analysis |
| `GET`  | `/api/v1/satellite/status` | Satellite data service status |
| `GET`  | `/api/v1/infrastructure/status` | Infrastructure service status |
| `GET`  | `/api/v1/connectivity/status` | Connectivity service status |

### Run an analysis

```bash
curl -X POST http://localhost:8000/api/v1/analysis/run \
  -H "Content-Type: application/json" \
  -d '{
    "location": "Trishuli, Nepal",
    "aoi": {
      "type": "Polygon",
      "coordinates": [[[85.239, 27.851], [85.184, 27.873], [85.129, 27.851], [85.184, 27.829], [85.239, 27.851]]]
    },
    "event_date": "2026-08-26"
  }'
```

The `aoi` field is optional — when omitted, the backend derives
the default demo corridor around the location.

### Response structure

`analysis_id`, `status`, `location`, `aoi`, `event_date` ·
satellite scene selection (`before_scene`, `event_scene`,
`after_scene`, `relative_orbit`, `coverage_status`) ·
flood analysis (`flood_mapped_area_km2`, confidence split,
`flood_mask` GeoJSON) · AI model info (`model_name`,
`model_version`, `threshold`, metrics: IoU / Dice / Precision /
Recall / F1) · infrastructure impact (roads / buildings /
bridges — totals and *potentially affected* counts) ·
connectivity (settlement counts, *potentially road-disconnected*
settlements, alternative-route availability, settlement details) ·
validation (EMSR927 comparison, metrics, interpretation) ·
processing stage log · limitations.

## Scientific language

Results use careful wording: areas are **"potentially affected"**
and settlements are **"potentially road-disconnected"**. Flood
overlap does **not** automatically mean destruction, and an
affected road does **not** automatically mean a settlement is
cut off.

## Architecture

```
app/
├── main.py                  FastAPI app, CORS, router wiring
├── api/                     thin route layer (validation only)
│   ├── analysis.py          POST /analysis/run, GET /analysis/health
│   ├── satellite.py         GET /satellite/status
│   ├── infrastructure.py    GET /infrastructure/status
│   └── connectivity.py      GET /connectivity/status
├── core/
│   └── config.py            environment settings (python-dotenv)
├── schemas/                 Pydantic request/response models
│   ├── analysis.py
│   ├── satellite.py
│   └── results.py
└── services/                business logic (injectable interfaces)
    ├── analysis_service.py      pipeline orchestrator
    ├── satellite_service.py     CopernicusService (Protocol) + mock
    ├── flood_detection_service.py  FloodDetectionService + mock
    ├── infrastructure_service.py   OsmService + mock
    ├── connectivity_service.py     ConnectivityService + mock
    └── validation_service.py       ValidationService + mock
```

Each domain service is defined by a `Protocol`. The API depends
only on the orchestrator (`AnalysisService`), which accepts the
services via constructor injection — any mock can be replaced by
a real implementation (Copernicus Data Space, ohsome/OSM,
PyTorch model, NetworkX) **without rewriting the API**.

Mock data lives in [`data/demo_scenario.json`](data/demo_scenario.json)
(Trishuli, Nepal · 26 August 2026 scenario).

## Testing

```bash
pytest
```

Covers: health endpoint, analysis endpoint, invalid event date,
future event date, missing required fields, and scientific
language guarantees.

## Configuration

Copy `.env.example` to `.env` (never commit real credentials):

```
COPERNICUS_CLIENT_ID=
COPERNICUS_CLIENT_SECRET=
DATABASE_URL=
REDIS_URL=
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

CORS origins are configurable — the frontend dev server
(`http://localhost:5173`) is allowed by default.

## Planned real-data pipeline

- [ ] Copernicus Data Space authentication (client credentials)
- [ ] Sentinel-1 scene discovery & automatic fallback logic
- [ ] Sentinel-2 optical cross-reference
- [ ] SAR preprocessing (Gamma / SNAP or pure-Python equivalent)
- [ ] Copernicus DEM terrain correction
- [ ] PyTorch Siamese/SNUNet flood segmentation
- [ ] ohsome / OpenStreetMap infrastructure extraction
- [ ] NetworkX road-graph connectivity analysis
- [ ] EMSR927 / reference validation
- [ ] PostgreSQL + PostGIS persistence
- [ ] Redis + Celery asynchronous jobs
- [ ] GIS stack: GeoPandas, Rasterio/GDAL, Shapely, pyproj

These dependencies are intentionally **not** installed yet —
`requirements.txt` contains only what this stage needs.
