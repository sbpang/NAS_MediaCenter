"""FastAPI main application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, artists, items, streams
from app.scanner import run_scan
from app.schemas import ScanResponse
from app.config import settings

app = FastAPI(
    title="LAN Media Center API",
    description="Private media center API for NAS",
    version="1.0.0",
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(artists.router)
app.include_router(items.router)
app.include_router(streams.router)


@app.post("/api/scan", response_model=ScanResponse)
async def trigger_scan():
    """Trigger a media scan."""
    scan_log = run_scan()
    
    errors = None
    if scan_log.errors_json:
        import json
        errors = json.loads(scan_log.errors_json)
    
    return {
        "status": "completed",
        "scan_id": scan_log.id,
        "added": scan_log.added_count,
        "updated": scan_log.updated_count,
        "errors": errors,
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "LAN Media Center API",
        "version": "1.0.0",
        "docs": "/docs",
    }

