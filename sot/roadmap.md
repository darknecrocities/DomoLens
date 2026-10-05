# DomoLens Roadmap Specification

## 1. Roadmap Overview

This document tracks the phased milestones, completed deliverables, and future architectural evolution for DomoLens.

## 2. Completed Milestones (v0.1.0)

### Phase 1: Foundation and Architecture
- Monorepo workspace configuration (`apps/app`, `apps/landing`, `packages/core`, `packages/theme`, `engine`).
- Charcoal and orange design tokens (`packages/theme`).
- Tauri 2 Rust desktop wrapper with secure filesystem dialogs and local persistence.
- Python 3.13 FastAPI engine sidecar bound strictly to loopback (`127.0.0.1`).
- Responsive Home Screen with drag-and-drop import and accessible dialogs.
- Plain-language copy dictionary eliminating technical jargon.

### Phase 2: Recording Pipeline
- Display media capture support: Full Screen, Single Window, and Browser Tab.
- Multi-channel audio mixer for system audio and microphone inputs.
- Non-intrusive recording HUD with live interaction logging and countdown timer.
- Normalized mouse coordinate tracking `[0.0, 1.0]`.

### Phase 3: Auto-Zoom Engine
- Spatio-temporal click clustering algorithm (`packages/core/src/zoom.ts`).
- Cubic Bezier camera interpolation with smooth velocity continuity.
- Edge clamping algorithm guaranteeing zero canvas boundary exposure.

### Phase 4: Non-Destructive Timeline Editor
- Multi-track timeline (Zoom Blocks track, Video Clips track).
- Real-time video canvas preview with dynamic camera transform matrices.
- Timeline operations: Split at playhead (`S`), delete (`Delete`), playhead scrubbing.
- Full undo/redo history state machine (`Cmd+Z` / `Cmd+Shift+Z`).

### Phase 5: Looks and Styling
- Studio background presets (Charcoal Slate, Warm Ember, Midnight, Sunset Mesh, Aurora Night, Solid Dark).
- Configurable canvas padding (0px to 80px) and corner rounding (0px to 48px).
- Elevation shadow profiles (Soft, Lift, Glow).
- Custom pointer styles (Default, macOS Arrow, Minimal Dot, Target Ring) and click ripple shaders.

### Phase 6: Multi-Format Export
- Export profiles: 1080p Full HD, 720p Fast, 4K Ultra HD, and Animated GIF.
- Local background render jobs via Python engine sidecar.
- Optional AI-assisted title generator using on-device API keys.

### Phase 7: Product Landing Page
- Anti-design showcase site (`apps/landing`).
- Kinetic hero section with device detection and live zoom demonstration.
- Interactive split comparison slider and platform compatibility matrix.

### Phase 8: Accessibility and Polish
- Full keyboard navigation and ARIA dialog semantics.
- Reduced-motion query adherence across all animation layers.
- Safe-area insets for notched and mobile viewports.

## 3. Future Roadmap Milestones

### Phase 9: Hardware Acceleration and WebGPU Shaders
- Implement direct WebGPU video composition for faster-than-realtime timeline scrubbing.
- Add hardware-accelerated HEVC and AV1 encoding profiles on supported Apple Silicon and NVIDIA hardware.

### Phase 10: Automatic Keystroke and Shortcut Callouts
- Add global keyboard event interception to display floating shortcut badges during recordings (e.g., displaying `Cmd+P` or `Ctrl+Shift+F`).
- Configurable keystroke styles matching studio looks presets.

### Phase 11: Auto-Transcription and Offline Subtitles
- Integrate local, on-device Whisper model via the Python engine sidecar.
- Generate synchronized caption tracks (`.vtt`, `.srt`) directly on the user's computer with zero cloud transmission.
