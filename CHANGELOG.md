# Changelog

All notable changes to DomoLens are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-05

### Added
- Monorepo architecture with npm workspaces for `@domolens/core`, `@domolens/theme`, `@domolens/app`, and `@domolens/landing`.
- Tauri 2 Rust desktop wrapper with secure filesystem storage and native dialog integrations.
- Local Python 3.13 FastAPI engine sidecar strictly bound to `127.0.0.1` for media probing, video rendering, and optional AI features.
- Spatio-temporal click clustering algorithm in `packages/core` for intelligent auto-zoom generation.
- Cubic Hermite camera path planning with continuous velocity and zero speed jumps.
- Viewport edge clamping algorithm guaranteeing zero canvas border exposure.
- Multi-source screen recording pipeline supporting Entire Screen, Application Window, and Browser Tab capture.
- Multi-stream audio capture mixing microphone input and system audio.
- Non-intrusive floating recording HUD with countdown timer, click logging, and normalized coordinates.
- Non-destructive multi-track timeline editor with playhead scrubbing, zoom block manipulation, and clip slicing.
- Command history state machine supporting undo and redo (`Cmd+Z` / `Cmd+Shift+Z`).
- Studio Looks styling with background presets (Charcoal Slate, Warm Ember, Midnight, Sunset Mesh, Aurora Night, Solid Dark).
- Configurable canvas padding, corner radiuses, drop shadow profiles, and custom mouse cursors.
- Animated click ripple shaders rendered in DomoLens orange.
- Multi-resolution video export pipeline (1080p Full HD, 720p Fast, 4K Ultra HD, and 2-pass animated GIF).
- Optional AI assistance with on-device API key storage for demo walkthrough title suggestions.
- Kinetic anti-design product landing page with interactive comparison split slider.
- Full accessibility support including keyboard navigation, ARIA dialog roles, safe area insets, and reduced-motion adherence.
- Complete Single Source of Truth (SOT) engineering documentation suite under `sot/`.
