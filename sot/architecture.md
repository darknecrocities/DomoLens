# System Architecture Specification

## 1. System Topology Overview

DomoLens is architected as a local-first desktop application combining modern web technologies, a native desktop shell, and a dedicated local media processing engine.

```text
+------------------------------------------------------------------------+
|                            User Interface                              |
|   React 19 + TypeScript + Tailwind v4 + Framer Motion (apps/app)       |
+------------------------------------+-----------------------------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v (Tauri IPC Boundary)                      v (Loopback HTTP: 127.0.0.1)
+-------------------------------+             +-------------------------------+
|       Desktop Shell           |             |     Python Media Engine       |
|    Rust / Tauri 2 Runtime     |             |      FastAPI / Uvicorn        |
|     (apps/app/src-tauri)      |             |           (engine)            |
+---------------+---------------+             +---------------+---------------+
                |                                             |
                +---------------------+-----------------------+
                                      |
                                      v
                        +---------------------------+
                        |     Local Filesystem      |
                        | Recordings, Projects, JSON|
                        +---------------------------+
```

## 2. Workspace Layout

The repository uses npm workspaces for TypeScript packages and applications, supplemented by a Python project managed via `uv`:

- `packages/core`: Shared pure TypeScript business logic, math calculations, and domain types. No browser or DOM-specific dependencies to allow portability.
- `packages/theme`: Central design tokens, Tailwind CSS v4 variables, charcoal surfaces, and orange accent constants.
- `apps/app`: The primary desktop client application (React 19, Vite, Zustand, Lucide icons).
- `apps/app/src-tauri`: The native application wrapper built with Tauri 2 and Rust. Handles native file dialogues, window controls, and local persistent storage.
- `apps/landing`: The standalone landing page and marketing site, featuring anti-design styling, interactive comparison sliders, and download links.
- `engine`: Python 3.13 service providing video stream inspection, frame-by-frame auto-framing renders, and optional AI metadata generation.

## 3. Communication Boundaries

### 3.1 Frontend to Desktop Shell (Tauri IPC)
Communication between the web view and native host occurs through Tauri's type-safe invoke channel:

- `list_projects`: Queries local application directory for project summaries and thumbnails.
- `import_video`: Receives file paths from drag-and-drop or file pickers, validates file headers, and indexes the recording into the local database.
- `rename_project`: Modifies project metadata while preserving original source references.
- `delete_project`: Permanently deletes recorded files and project metadata from local storage.

### 3.2 Frontend to Media Engine (Local HTTP)
Communication with the Python sidecar occurs over a local loopback HTTP interface:

- Host Address: Strictly bound to `127.0.0.1`. Requests from other network interfaces are rejected.
- CORS Enforcement: Only origins with `tauri://localhost`, `https://tauri.localhost`, or `http://127.0.0.1:1420` are permitted.
- Endpoints:
  - `GET /health`: Healthcheck probe verifying worker readiness.
  - `POST /media/probe`: Extracts video duration, dimensions, codecs, and stream properties.
  - `POST /export/render`: Submits render requests with zoom block parameters.
  - `GET /export/status/{job_id}`: Polls export progress.
  - `POST /ai/suggest-titles`: Generates walkthrough titles based on interaction profiles.

## 4. State Management and Unidirectional Data Flow

The client application utilizes Zustand for distinct functional domains:

1. `useNav`: Routing and view orchestration (`home`, `record`, `project`, `editor`, `landing`).
2. `useProjects`: Local project inventory, sorting, imports, and metadata updates.
3. `useRecorder`: Active capture state, source selection (Screen, Window, Tab), audio input flags, elapsed time, and real-time click stream capture.
4. `useEditor`: Active video timeline state, playhead position, zoom blocks, video cuts, visual styling options, and undo/redo stacks.
5. `useToast`: Transient user feedback notifications and system status messages.

State mutations trigger deterministic updates in the rendering pipeline, ensuring that preview canvases reflect exact transform parameters applied during export.
