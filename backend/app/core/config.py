"""Application configuration.

Reads environment variables from ``backend/.env`` (if present).
All sensitive values default to empty strings — the application
runs without credentials in this mock stage and never embeds
secrets in source code.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# backend/app/core/config.py -> backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load .env next to the backend root (if it exists)
_dotenv_path = BASE_DIR / ".env"
if _dotenv_path.exists():
    load_dotenv(_dotenv_path)


class Settings:
    """Runtime settings sourced from the environment."""

    app_name: str = "AQUASCOPE Backend"
    app_version: str = "0.1.0"
    api_prefix: str = "/api/v1"

    # CORS — configurable frontend origin(s), never hardcoded
    # production assumptions.
    cors_origins: list[str] = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    ]

    # Planned future integrations (empty in this stage)
    copernicus_client_id: str = os.getenv("COPERNICUS_CLIENT_ID", "")
    copernicus_client_secret: str = os.getenv("COPERNICUS_CLIENT_SECRET", "")
    database_url: str = os.getenv("DATABASE_URL", "")
    redis_url: str = os.getenv("REDIS_URL", "")

    # Path to the mock scenario dataset (DEMO / SIMULATED DATA)
    demo_scenario_path: Path = BASE_DIR / "data" / "demo_scenario.json"


settings = Settings()
