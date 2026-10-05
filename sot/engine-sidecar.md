# Python Engine Sidecar Specification

## 1. Architectural Role

The DomoLens Python Engine (`engine/src/domolens_engine`) operates as an isolated, localhost-only sidecar microservice companion to the desktop shell. It handles compute-intensive operations, media inspection, rendering orchestration, and optional AI features.

```text
+-----------------------+              +-----------------------+
|  Tauri Desktop Shell  |              |  Python FastAPI Sidecar|
|  (Frontend / WebView) |              |  (Uvicorn on 127.0.0.1)|
+-----------+-----------+              +-----------+-----------+
            |                                      |
            |--- HTTP POST /media/probe ---------->|
            |<-- Media Properties & Metadata ------|
            |                                      |
            |--- HTTP POST /export/render -------->|
            |<-- Job ID & Initial Status ----------|
            |                                      |
            |--- HTTP GET /export/status/{id} ---->|
            |<-- Progress Percentage & Output -----|
```

## 2. Security and Network Isolation Guarantees

The engine enforces strict operational security boundaries:

### 2.1 Loopback Interface Enforcement
The entrypoint (`__main__.py`) validates the bind host before starting the server. If any host other than `127.0.0.1` or `localhost` is specified (such as `0.0.0.0` or external network adapters), the engine logs a fatal error and terminates immediately with exit code 1.

### 2.2 Locked-Down CORS
Cross-Origin Resource Sharing is locked to Tauri desktop and local development origins:
- `tauri://localhost`
- `https://tauri.localhost`
- `http://127.0.0.1:1420`
- `http://localhost:1420`

All wildcard origins (`*`) are disallowed.

### 2.3 Documentation Route Disablement
Swagger UI (`/docs`) and ReDoc (`/redoc`) endpoints are disabled in production to eliminate unnecessary attack surfaces and prevent schema exposure.

## 3. API Contract Reference

### 3.1 Health Check
- Method: `GET`
- Route: `/health`
- Response:
  ```json
  {
    "status": "ok",
    "version": "0.1.0"
  }
  ```

### 3.2 Media Probe
- Method: `POST`
- Route: `/media/probe`
- Purpose: Safely inspects video file metadata, path existence, file size, and extension without executing arbitrary external commands.
- Request Payload:
  ```json
  {
    "path": "/Users/name/Movies/recording.mp4"
  }
  ```
- Response (200 OK):
  ```json
  {
    "exists": true,
    "size_bytes": 10485760,
    "extension": "mp4",
    "filename": "recording.mp4"
  }
  ```
- Errors:
  - `404 Not Found`: If target file does not exist on local filesystem.
  - `422 Unprocessable Entity`: If payload schema is invalid.

### 3.3 Export Rendering
- Method: `POST`
- Route: `/export/render`
- Purpose: Queues a video export task.
- Response (200 OK):
  ```json
  {
    "job_id": "render_1",
    "status": "queued"
  }
  ```

### 3.4 Export Job Status
- Method: `GET`
- Route: `/export/status/{job_id}`
- Response (200 OK):
  ```json
  {
    "job_id": "render_1",
    "status": "done",
    "progress": 100.0,
    "output_path": "/tmp/render_1_1080p.mp4"
  }
  ```

### 3.5 AI Title Suggestions (Optional)
- Method: `POST`
- Route: `/ai/suggest-titles`
- Purpose: Generates candidate titles for demo recordings based on interaction metrics.
- Request:
  ```json
  {
    "name": "Project Dashboard",
    "duration_ms": 15000,
    "click_count": 8
  }
  ```
- Response (200 OK):
  ```json
  {
    "suggestions": [
      "Quick Tour: Project Dashboard",
      "How to: Project Dashboard",
      "Project Dashboard (Detailed Demo)",
      "Project Dashboard — Step by Step"
    ]
  }
  ```

## 4. Verification and Testing

Automated verification is conducted using `pytest` and `httpx`:

```bash
uv run --project engine pytest engine/tests -q
```

All 5 core test cases must pass:
1. `test_health_endpoint`: Validates loopback response and version.
2. `test_media_probe_valid_file`: Confirms metadata extraction on test artifacts.
3. `test_media_probe_missing_file`: Verifies 404 response on non-existent targets.
4. `test_export_render_and_status`: Tests render queuing and polling cycle.
5. `test_suggest_titles`: Tests walkthrough title heuristics.
