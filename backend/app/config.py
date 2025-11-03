"""Configuration settings for the media center backend."""
import os
from pathlib import Path
from typing import Optional


class Settings:
    """Application settings from environment variables."""
    
    API_PORT: int = int(os.getenv("API_PORT", "1699"))
    MEDIA_ROOT: Path = Path(os.getenv("MEDIA_ROOT", "/media/static/artists"))
    DB_PATH: str = os.getenv("DB_PATH", "/data/media.db")
    ENABLE_PERIODIC_SCAN: bool = os.getenv("ENABLE_PERIODIC_SCAN", "false").lower() == "true"
    SCAN_INTERVAL_MINUTES: int = int(os.getenv("SCAN_INTERVAL_MINUTES", "120"))
    
    # Allowed video extensions
    VIDEO_EXTENSIONS = {".mp4", ".mkv", ".mov", ".wmv", ".avi", ".m4v"}
    
    @property
    def media_root_str(self) -> str:
        """Return media root as string for SQLite storage."""
        return str(self.MEDIA_ROOT)


settings = Settings()

