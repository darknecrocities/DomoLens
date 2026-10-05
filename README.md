# DomoLens

Record your screen. DomoLens automatically zooms in on every click and keystroke with smooth, cinematic camera motion.

DomoLens is a modern, local-first screen recording and auto-framing suite. It captures your screen, clusters mouse interactions into smooth camera paths, applies studio-grade framing with customizable backgrounds, and provides an interactive timeline editor for fine-tuning before export.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-green.svg)](package.json)
[![Tauri](https://img.shields.io/badge/Tauri-v2-orange.svg)](apps/app/src-tauri)
[![Python](https://img.shields.io/badge/Python-3.13-blue.svg)](engine/pyproject.toml)

---

## Highlights

- Automatic Click-Driven Auto-Zoom: Intelligently clusters cursor clicks and movements into focused camera zooms with cubic easing and spring physics.
- Boundary Clamping: Intelligent edge protection guarantees that zoomed camera frames never reveal empty canvas borders.
- Non-Destructive Timeline Editor: Live canvas playback with draggable zoom blocks, clip slicing, audio muting, playhead scrubbing, and full undo/redo history.
- Studio Looks and Framing: Customizable canvas padding, border radius, drop shadows, custom mouse pointers, animated click ripple effects, and studio backgrounds (Charcoal Slate, Warm Ember, Midnight, Sunset Mesh, Aurora Night).
- Flexible Export Formats: Render exports in 1080p Full HD, 720p Fast, 4K Ultra HD, and Animated GIF.
- Local-First Privacy: Recordings and projects remain entirely on your local machine. No telemetry or video data is sent to external servers.
- Python Engine Sidecar: High-performance microservice bound strictly to 127.0.0.1 for media analysis, video probing, and rendering tasks.
- Optional AI Assistance: Connect your own Gemini or OpenAI API key for title suggestions and captions. Key storage is strictly local.
- Cross-Platform Desktop Shell: Packaged with Tauri 2 and Rust for lightweight system resource usage and high rendering performance on macOS, Windows, and Linux.

---

## Monorepo Architecture

The DomoLens codebase is structured as a monorepo:

```text
domolens/
|-- apps/
|   |-- app/                # React 19 + TypeScript + Vite + Tailwind v4 desktop UI
|   |   `-- src-tauri/      # Tauri 2 Rust desktop application shell
|   `-- landing/            # High-performance static showcase and landing page
|-- packages/
|   |-- core/               # Shared domain logic, zoom planner, clustering, formatters
|   `-- theme/              # Design tokens (charcoal and orange palettes), Tailwind v4 theme
|-- engine/                 # Python 3.13 FastAPI sidecar microservice
|-- sot/                    # Single Source of Truth architectural and engineering specifications
|-- public/                 # Static visual assets and product demonstration clips
`-- scripts/                # Synthetic media generation and test automation utilities
```

---

## Prerequisites

Before building or developing DomoLens, ensure your system has the following dependencies installed:

- Node.js (version 20.0.0 or higher) and npm
- Rust toolchain (stable edition, installed via rustup)
- Python (version 3.13 or higher)
- uv (Python package and environment manager)
- FFmpeg (version 6.0 or higher, available on system PATH)

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/darknecrocities/DomoLens.git
cd DomoLens
```

### 2. Install dependencies

```bash
# Install Node.js monorepo workspace dependencies
npm install

# Initialize Python engine virtual environment and dependencies
uv sync --project engine
```

### 3. Run in development mode

You can run DomoLens in different target environments:

```bash
# Run the Tauri desktop application with live reload
npm run app

# Run the frontend application in web browser mode
npm run dev

# Run the standalone landing page
npm run landing

# Run the Python sidecar engine standalone
npm run engine
```

---

## Available Scripts

The following commands are available from the root repository workspace:

| Script | Purpose |
| --- | --- |
| `npm run app` | Launches the desktop application using the Tauri development shell |
| `npm run dev` | Runs the `@domolens/app` React frontend in browser development mode |
| `npm run build` | Compiles the production build for `@domolens/app` |
| `npm run package` | Builds native production desktop binaries via Tauri CLI |
| `npm run landing` | Runs the `@domolens/landing` showcase site in development mode |
| `npm run landing:build` | Generates the static production bundle for the landing site |
| `npm run test` | Runs all Vitest unit tests across workspace packages |
| `npm run typecheck` | Executes TypeScript type checking across all packages |
| `npm run engine` | Starts the Python FastAPI engine sidecar |
| `npm run engine:test` | Executes Pytest test suite for the Python engine |
| `npm run check:all` | Runs full suite of typechecks, JS unit tests, and Python engine tests |

---

## Testing and Quality Assurance

DomoLens enforces strict automated testing across all packages:

```bash
# Run all automated verification checks
npm run check:all

# Check Rust shell compilation and linting
cargo check --manifest-path apps/app/src-tauri/Cargo.toml
```

---

## Single Source of Truth Documentation

Detailed technical design documents, algorithmic specifications, and interface contracts are maintained in the `sot/` directory:

- [System Architecture](sot/architecture.md): Topology, IPC boundary, monorepo workspaces, and state flow.
- [Auto-Zoom Engine](sot/zoom-engine.md): Temporal clustering, cubic easing formulas, and boundary clamping.
- [Recording Pipeline](sot/recording-pipeline.md): Screen and window capture, audio mixers, and coordinate ingestion.
- [Editor and Timeline](sot/editor-timeline.md): Interactive scrubber, multi-track timeline, and undo/redo state machine.
- [Looks and Styling](sot/looks-styling.md): Studio backgrounds, canvas padding, shadow levels, and ripple shaders.
- [Export and Rendering](sot/export-rendering.md): Multi-resolution export pipeline, GIF generator, and sidecar IPC.
- [Python Engine Sidecar](sot/engine-sidecar.md): FastAPI service, loopback binding security, and media probing.
- [Design System](sot/design-system.md): Color tokens, typography, accessible contrast, and component inventory.
- [Plain-Language Guidelines](sot/plain-language-guidelines.md): Editorial voice, terminology rules, and copy strings.
- [Security Model](sot/security-model.md): Threat modeling, network isolation, CSP configuration, and key management.
- [Release and Packaging](sot/release-and-packaging.md): Build targets, GitHub release workflow, and version tags.

See the complete index in [sot/index.md](sot/index.md).

---

## Packaging and Releases

Desktop binaries for macOS (.dmg, .app), Windows (.msi, .exe), and Linux (.deb, .AppImage) are packaged using Tauri:

```bash
npm run package
```

Release artifacts, checksums, and version notes are tracked under GitHub Releases. For release procedures, refer to [sot/release-and-packaging.md](sot/release-and-packaging.md).

---

## Security

For vulnerability disclosure and security architecture details, please read [SECURITY.md](SECURITY.md).

---

## Contributing

Contributions, bug reports, and pull requests are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) for conventions and review processes.

---

## License

DomoLens is licensed under the [MIT License](LICENSE).
