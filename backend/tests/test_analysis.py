"""Analysis endpoint tests."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

TRISHULI_INPUT = {
    "location": "Trishuli, Nepal",
    "aoi": {
        "type": "Polygon",
        "coordinates": [
            [
                [85.239, 27.851],
                [85.2348, 27.8594],
                [85.2229, 27.8666],
                [85.2051, 27.8713],
                [85.184, 27.873],
                [85.1629, 27.8713],
                [85.1451, 27.8666],
                [85.1332, 27.8594],
                [85.129, 27.851],
                [85.1332, 27.8426],
                [85.1451, 27.8354],
                [85.1629, 27.8307],
                [85.184, 27.829],
                [85.2051, 27.8307],
                [85.2229, 27.8354],
                [85.2348, 27.8426],
                [85.239, 27.851],
            ]
        ],
    },
    "event_date": "2026-08-26",
}


def test_run_analysis_success() -> None:
    response = client.post("/api/v1/analysis/run", json=TRISHULI_INPUT)
    assert response.status_code == 200
    body = response.json()

    # core identity
    assert body["status"] == "completed"
    assert body["location"] == "Trishuli, Nepal"
    assert body["event_date"] == "2026-08-26"
    assert body["analysis_id"].startswith("AQS-20260826-")

    # satellite section
    assert body["satellite"]["relative_orbit"] == 143
    assert body["satellite"]["fallback_used"] is True
    assert body["satellite"]["event_scene"]["status"] == "unavailable"
    assert body["satellite"]["after_scene"]["platform"] == "Sentinel-1B"

    # flood section
    assert body["flood"]["flood_mapped_area_km2"] == 24.6
    assert body["flood"]["flood_mask"]["type"] == "FeatureCollection"

    # AI section
    assert body["ai"]["threshold"] == 0.52
    assert body["ai"]["metrics"]["f1"] == 0.874

    # infrastructure section
    assert body["infrastructure"]["roads"]["potentially_affected_roads_km"] == 17.6
    assert body["infrastructure"]["buildings"]["potentially_affected_buildings"] == 680
    assert body["infrastructure"]["bridges"]["potentially_affected_bridges"] == 11

    # connectivity section
    assert body["connectivity"]["total_settlements"] == 124
    assert (
        body["connectivity"]["potentially_road_disconnected_settlements"] == 27
    )

    # processing pipeline stages all present
    stages = body["processing"]
    for key in (
        "data_acquisition",
        "preprocessing",
        "flood_mapping",
        "infrastructure_analysis",
        "connectivity_analysis",
        "validation",
    ):
        assert stages[key]["status"] == "completed"

    # demo labelling
    assert body["metadata"]["demo"] is True
    assert body["metadata"]["data_source"] == "DEMO / SIMULATED DATA"


def test_response_uses_scientific_language() -> None:
    response = client.post("/api/v1/analysis/run", json=TRISHULI_INPUT)
    assert response.status_code == 200
    body = response.json()

    forbidden = ("destroyed", "people trapped", "people are trapped")
    text = str(body).lower()
    for word in forbidden:
        assert word not in text

    # required scientific phrasing is present
    assert "potentially_affected" in text or "potentially affected" in text
    assert "potentially road-disconnected" in text
    assert "flood mapped area" in text or "flood_mapped_area" in text


def test_run_analysis_without_aoi_uses_default_corridor() -> None:
    payload = {k: v for k, v in TRISHULI_INPUT.items() if k != "aoi"}
    response = client.post("/api/v1/analysis/run", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["aoi"]["type"] == "Polygon"
    assert len(body["aoi"]["coordinates"][0]) > 0


def test_invalid_event_date() -> None:
    payload = dict(TRISHULI_INPUT, event_date="2026-13-45")
    response = client.post("/api/v1/analysis/run", json=payload)
    assert response.status_code == 422


def test_future_event_date_rejected() -> None:
    payload = dict(TRISHULI_INPUT, event_date="2099-01-01")
    response = client.post("/api/v1/analysis/run", json=payload)
    assert response.status_code == 422


def test_missing_required_fields() -> None:
    response = client.post("/api/v1/analysis/run", json={})
    assert response.status_code == 422
    errors = response.json()["detail"]
    missing = {err["loc"][-1] for err in errors}
    assert "location" in missing
    assert "event_date" in missing


def test_location_too_short() -> None:
    payload = dict(TRISHULI_INPUT, location="x")
    response = client.post("/api/v1/analysis/run", json=payload)
    assert response.status_code == 422
