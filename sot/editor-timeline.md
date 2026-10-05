# Editor and Timeline Specification

## 1. Editor Overview

The DomoLens Editor (`apps/app/src/screens/EditorScreen.tsx`) provides non-destructive video manipulation, real-time camera previewing, and precise timeline editing.

```text
+------------------------------------------------------------------------+
| Top Bar: Project Name, Back, Undo, Redo, Looks Button, Export Button   |
+------------------------------------------------------------------------+
|                                                                        |
|                       Live Preview Viewport                            |
|          [Studio Framing: Padding + Shadow + Background]               |
|            [Video with Real-time Camera Matrix Transform]              |
|                                                                        |
+------------------------------------------------------------------------+
| Playback Controls: Play/Pause, Current Time / Duration, Timeline Zoom  |
+------------------------------------------------------------------------+
| Timeline Tracks:                                                       |
|  [Zoom Track]   : [== Zoom Block 1 ==]     [==== Zoom Block 2 ====]    |
|  [Clips Track]  : [============== Clip 1 ===============] [ Clip 2 ]    |
+------------------------------------------------------------------------+
```

## 2. Multi-Track Timeline Architecture

The timeline displays synchronized horizontal tracks driven by the current `playheadMs` position.

### 2.1 Zoom Track
- Visual Blocks: Each `ZoomBlock` is rendered as an interactive bounding block indicating its start time, duration, and target scale.
- Drag to Move: Dragging a block translates both `startTimeMs` and `endTimeMs` while preserving block length.
- Resize Handles: Left and right edge handles allow micro-adjustment of lead-in and hold durations.
- Inspector Panel: Selecting a zoom block reveals granular controls for target coordinates `(x, y)` and zoom factor `scale`.
- Enable/Disable Toggle: Individual zoom blocks can be muted without permanent deletion.

### 2.2 Clips Track
- Video Segments: Represents continuous video playback ranges.
- Split at Playhead: Pressing `S` splits the clip currently under the playhead into two distinct segments.
- Clip Deletion: Pressing `Delete` or `Backspace` removes the selected clip, automatically shifting remaining footage leftwards.
- Audio Mute: Individual clips can be muted to silence background noise during specific demo sequences.

## 3. Real-Time Viewport Rendering

During playback or playhead scrubbing, the preview viewport updates at the display refresh rate (up to 60fps/120fps):

1. The editor queries `calculateCameraAtTime(currentTimeMs, zoomBlocks)`.
2. The returned camera state provides `scale`, `focusX`, and `focusY`.
3. The video element receives an accelerated 2D transform:
   ```css
   transform: scale(${scale}) translate(${(0.5 - focusX) * 100}%, ${(0.5 - focusY) * 100}%);
   transform-origin: center center;
   transition: transform 0ms linear;
   ```
4. Background, padding, and corner radius styling layers are applied outside the transform matrix, preventing background warping.

## 4. Non-Destructive Editing Model

All edits made in the timeline are strictly non-destructive:
- Source video files on disk remain untouched.
- All cuts, splits, zoom adjustments, and style modifications are stored as metadata transformations.
- Full resolution and fidelity are preserved until the user explicitly triggers export rendering.

## 5. Command History (Undo / Redo)

The editor utilizes a history stack state machine inside `useEditor`:

```typescript
interface HistoryState {
  past: EditorSnapshot[];
  present: EditorSnapshot;
  future: EditorSnapshot[];
}
```

- Pushing State: Timeline actions (clip splits, zoom block shifts, styling changes) record the prior `present` state into `past` (capped at 50 snapshots).
- Undo (`Cmd+Z` / `Ctrl+Z`): Reverts to the previous snapshot from `past`, pushing current state into `future`.
- Redo (`Cmd+Shift+Z` / `Ctrl+Shift+Z`): Re-applies the next state from `future`.

## 6. Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Toggle Playback (Play / Pause) |
| `S` | Split active clip at playhead position |
| `Delete` / `Backspace` | Delete currently selected clip or zoom block |
| `Left Arrow` | Step backward 100ms |
| `Right Arrow` | Step forward 100ms |
| `Shift + Left Arrow` | Jump backward 1000ms |
| `Shift + Right Arrow` | Jump forward 1000ms |
| `Cmd + Z` / `Ctrl + Z` | Undo last edit |
| `Cmd + Shift + Z` / `Ctrl + Y` | Redo previously undone edit |
| `Esc` | Clear selection or close open modal |
