from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)


@dataclass
class Settings:
    database_url: str = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'app.db'}")
    admin_username: str = os.getenv("ADMIN_USERNAME", "admin")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "admin123")
    token_secret: str = os.getenv("TOKEN_SECRET", "alires-secret")
    legacy_config_file: str = os.getenv("LEGACY_CONFIG_FILE", "/opt/scripts/config.json")
    mock_aliyun: bool = os.getenv("MOCK_ALIYUN", "0") == "1"
    cors_origin: str = os.getenv("CORS_ORIGIN", "http://localhost:5173")


settings = Settings()
