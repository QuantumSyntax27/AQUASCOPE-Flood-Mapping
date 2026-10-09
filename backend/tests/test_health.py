"""Health and status endpoint tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/api/v1/analysis/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert "AQUASCOPE" in body["service"]
    assert body["version"] == "0.1.0"


def test_root_endpoint() -> None:
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "running"
    assert "/docs" in body["docs"]


def test_satellite_status() -> None:
    response = client.get("/api/v1/satellite/status")
    assert response.status_code == 200
    body = response.json()
    assert body["demo"] is True
    assert "DEMO / SIMULATED DATA" in body["data_source"]


def test_infrastructure_status() -> None:
    response = client.get("/api/v1/infrastructure/status")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "Infrastructure Analysis Service"


def test_connectivity_status() -> None:
    response = client.get("/api/v1/connectivity/status")
    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "Road Connectivity Service"


def test_openapi_docs_available() -> None:
    response = client.get("/docs")
    assert response.status_code == 200
    schema = client.get("/openapi.json")
    assert schema.status_code == 200
    paths = schema.json()["paths"]
    assert "/api/v1/analysis/run" in paths
    assert "/api/v1/analysis/health" in paths
