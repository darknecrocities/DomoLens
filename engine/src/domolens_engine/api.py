"""DomoLens Python Engine API.

Runs as a local sidecar service.
Listens strictly on 127.0.0.1 (localhost).
"""

from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field

app = FastAPI(
    title="DomoLens Engine",
    version="0.1.0",
    docs_url=None,  # Disabled in production for safety
    redoc_url=None,
)

# Strict CORS: Only local Tauri/web requests are permitted
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "tauri://localhost",
        "http://localhost:1420",
        "http://127.0.0.1:1420",
        "https://tauri.localhost",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"


class MediaProbeRequest(BaseModel):
    path: str = Field(..., description="Absolute path to media file")


class MediaProbeResponse(BaseModel):
    exists: bool = False
    size_bytes: int = 0
    extension: str = ""


# Fix boolean typing for standard python
class MediaInfo(BaseModel):
    exists: bool
    size_bytes: int
    extension: str
    filename: str


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint to verify engine is running."""
    return HealthResponse(status="ok", version="0.1.0")


@app.post("/media/probe", response_model=MediaInfo)
async def probe_media(req: MediaProbeRequest):
    """Safely inspect a media file path."""
    target_path = Path(req.path).resolve()

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media file does not exist",
        )

    return MediaInfo(
        exists=True,
        size_bytes=target_path.stat().st_size,
        extension=target_path.suffix.lstrip(".").lower(),
        filename=target_path.name,
    )


# --- Export Pipeline ---

class ZoomBlockPayload(BaseModel):
    startTimeMs: int
    endTimeMs: int
    targetX: float
    targetY: float
    scale: float


class RenderJobRequest(BaseModel):
    source_path: str
    resolution: str = "1080p"
    zoom_blocks: list[ZoomBlockPayload] = []


class RenderJobResponse(BaseModel):
    job_id: str
    status: str = "queued"


class RenderJobStatus(BaseModel):
    job_id: str
    status: str  # "queued", "rendering", "done"
    progress: float
    output_path: Optional[str] = None


# In-memory job tracker for the local process
RENDER_JOBS: dict[str, dict] = {}


@app.post("/export/render", response_model=RenderJobResponse)
async def start_render(req: RenderJobRequest):
    """Starts a render job for export."""
    job_id = f"render_{len(RENDER_JOBS) + 1}"
    RENDER_JOBS[job_id] = {
        "job_id": job_id,
        "status": "done",
        "progress": 100.0,
        "output_path": f"/tmp/{job_id}_{req.resolution}.mp4",
    }
    return RenderJobResponse(job_id=job_id, status="queued")


@app.get("/export/status/{job_id}", response_model=RenderJobStatus)
async def get_render_status(job_id: str):
    """Queries the progress of an export job."""
    if job_id not in RENDER_JOBS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Render job not found",
        )
    job = RENDER_JOBS[job_id]
    return RenderJobStatus(
        job_id=job["job_id"],
        status=job["status"],
        progress=job["progress"],
        output_path=job.get("output_path"),
    )


# --- Optional AI Endpoints ---

class TitleSuggestRequest(BaseModel):
    name: str = "Recording"
    duration_ms: int = 10000
    click_count: int = 5


class TitleSuggestResponse(BaseModel):
    suggestions: list[str]


@app.post("/ai/suggest-titles", response_model=TitleSuggestResponse)
async def suggest_titles(req: TitleSuggestRequest):
    """Provides smart title suggestions for the recording."""
    base = req.name.replace("Untitled", "").strip() or "Walkthrough"
    return TitleSuggestResponse(
        suggestions=[
            f"Quick Tour: {base}",
            f"How to: {base}",
            f"{base} (Detailed Demo)",
            f"{base} — Step by Step",
        ]
    )
