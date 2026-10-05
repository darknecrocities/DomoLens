# DomoLens Engine Sidecar

Local Python media service for DomoLens.

The engine runs as an isolated, localhost-only sidecar process companion to the Tauri desktop application.

## Overview

DomoLens Engine provides backend media probing, background video rendering orchestration, and optional on-device AI titling assistance.

- Network Boundary: Strictly binds to `127.0.0.1` (localhost). Rejects external or wildcard (`0.0.0.0`) bind attempts.
- Documentation Endpoints: Swagger UI (`/docs`) and Redoc (`/redoc`) are explicitly disabled in production.
- CORS Policy: Restrained exclusively to local desktop origins (`tauri://localhost`, `https://tauri.localhost`, and `http://127.0.0.1:1420`).

## Endpoints

- `GET /health`: Returns service health status and version.
- `POST /media/probe`: Safely inspects video file metadata, path existence, file size, and extension.
- `POST /export/render`: Initiates background video export rendering.
- `GET /export/status/{job_id}`: Polls export job completion and artifact output paths.
- `POST /ai/suggest-titles`: Generates demo walkthrough title ideas based on recorded action counts.

## Development

Prerequisites: Python 3.13 or higher, `uv` package manager.

```bash
# Run sidecar service
uv run --project engine python -m domolens_engine

# Run test suite
uv run --project engine pytest engine/tests -q
```
