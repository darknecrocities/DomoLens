# Single Source of Truth (SOT) Documentation

Welcome to the DomoLens Single Source of Truth (SOT) documentation repository. This directory contains authoritative technical specifications, mathematical definitions, interface contracts, and design guidelines for DomoLens.

## Documentation Index

The following specifications serve as the definitive reference for the DomoLens system:

### Core Architecture and Specifications
1. [System Architecture](architecture.md)
   Defines the end-to-end topology, monorepo workspace dependencies, Tauri IPC boundary, and unidirectional state flow.

2. [Auto-Zoom Engine](zoom-engine.md)
   Specifies the spatial-temporal click grouping algorithm, cubic easing interpolation, spring camera motion, and canvas edge clamping.

3. [Recording Pipeline](recording-pipeline.md)
   Details display capture interfaces (screen, window, tab), multi-stream audio capture, coordinate normalization, and event ingestion.

4. [Editor and Timeline](editor-timeline.md)
   Documents the interactive scrubber, multi-track timeline data structures, clip trimming, zoom block manipulation, and undo/redo history.

5. [Looks and Styling](looks-styling.md)
   Specifies the studio canvas framing engine, background presets, corner radiuses, drop shadow profiles, mouse cursor styles, and click ripple shaders.

6. [Export and Rendering](export-rendering.md)
   Defines the video export matrix (1080p, 720p, 4K, animated GIF), bitrate targets, FFmpeg command recipes, and export job lifecycle.

7. [Python Engine Sidecar](engine-sidecar.md)
   Outlines the FastAPI microservice architecture, loopback interface binding (`127.0.0.1`), endpoint contracts, and media probing logic.

8. [Audio and Sound Effects System](audio-system.md)
   Specifies the procedural click bop synthesis, mechanical typing sound engine, background music presets, and dynamic audio ducking.

### Design, Voice, and Security
9. [Design System](design-system.md)
   Defines the charcoal and orange color palettes, Tailwind CSS v4 design tokens, typography, component hierarchies, and responsive breakpoints.

10. [Plain-Language Guidelines](plain-language-guidelines.md)
   Provides the editorial framework, jargon elimination dictionary, and user-facing copy standards across the application.

11. [Security Model](security-model.md)
    Details the local-first security boundary, Content Security Policy (CSP), desktop sandboxing, threat modeling, and local API key management.

12. [Release and Packaging](release-and-packaging.md)
    Documents native bundle formats across platforms (macOS DMG/App, Windows MSI/EXE, Linux DEB/AppImage), version tagging rules, and CI release workflows.


---

## Maintenance and Governance

- Single Point of Authority: Changes to core algorithms or data models must be documented in these files concurrently with code updates.
- Tone and Style: All documentation follows clear, objective engineering prose without decorative emojis or colloquial abbreviations.
- Cross-Linking: Specifications link directly to source modules in the repository for seamless code-to-spec tracing.
