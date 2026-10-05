# Recording Pipeline Specification

## 1. Capture Architecture

The recording subsystem is orchestrated by the `useRecorder` store (`apps/app/src/store/recorder.ts`), coordinating display media capture, audio stream multiplexing, input event capture, and project persistence.

```text
[User Triggers "New Recording"]
              |
              v
[Source Selection: Screen / Window / Tab]
              |
              v
[Audio Selection: Mic + System Audio Streams]
              |
              v
[3-2-1 Countdown Overlay]
              |
              v
[Active Capture & Global Event Tracking]
  - MediaRecorder encodes WebM / MP4 video stream
  - Coordinate Tracker samples (x, y) events
  - Audio Mixer combines stereo tracks
              |
              v
[User Triggers "Finish Recording"]
              |
              v
[Post-Processing & Automatic Clustering]
  - Media stream finalized and flushed to disk
  - Clicks clustered via zoom engine
  - Project record created in local storage
  - Immediate handoff to Editor
```

## 2. Capture Sources and Permissions

DomoLens supports three primary capture modes via native screen capture APIs:

1. Entire Screen: Captures the primary or selected monitor display, ideal for multi-app workflows.
2. Application Window: Isolates a specific OS application window.
3. Browser Tab: Targets an individual browser tab with dedicated system audio loopback.

### Audio Configuration
- System Audio: Captured directly from the display media stream when supported by the OS.
- Microphone Audio: Captured via `navigator.mediaDevices.getUserMedia({ audio: true })`.
- Audio Mixing: Both streams are passed through an internal Web Audio `AudioContext` to normalize volume peaks and avoid audio clipping.

## 3. Coordinate Tracking and Normalization

To ensure auto-zoom functions accurately across all monitor resolutions and high-DPI displays (Retina, 4K), mouse coordinates are strictly normalized.

### 3.1 Normalization Formula
```text
NormalizedX = (RawClickX - CaptureWindowLeft) / CaptureWindowWidth
NormalizedY = (RawClickY - CaptureWindowTop) / CaptureWindowHeight
```

Both values are clamped to the unit range `[0.0, 1.0]`.

### 3.2 Recorded Event Schema
```typescript
interface RecordedClick {
  id: string;
  timestampMs: number;
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
  button: 'left' | 'right' | 'middle';
  targetType?: string;
}
```

## 4. Recording HUD (Heads-Up Display)

While capture is active, DomoLens minimizes intrusive UI and renders a floating recording HUD:

- Time Counter: Live display formatted using plain-language MM:SS strings (`formatDuration`).
- Pulsing Indicator: Visual feedback confirming active frame encoding.
- Interaction Counter: Live tally of captured clicks and interaction events.
- Quick Actions: "Finish Recording" and "Cancel" buttons with keyboard shortcuts (`Esc` to cancel, `Enter` to finish).

## 5. Post-Capture Pipeline

When capture finishes:
1. The active `MediaRecorder` receives a `stop` command, generating the final media blob.
2. The blob is written to the user's local application data directory via Tauri desktop commands.
3. The raw click log is processed through `deriveZoomBlocksFromClicks()`.
4. A new `ProjectSummary` is persisted with source metadata, duration, creation timestamp, and derived zoom blocks.
5. The UI automatically transitions the active route to `editor` with the new project loaded.
