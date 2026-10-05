# Auto-Zoom Engine Specification

## 1. Algorithmic Overview

The DomoLens Auto-Zoom Engine translates raw user input events (mouse clicks, taps, key focus triggers) into smooth, cinematic camera transitions. It operates through three sequential phases:

```text
[Raw Input Stream] 
        | (Click Event Coordinates: x, y, timestamp)
        v
[Phase 1: Spatio-Temporal Clustering]
        | (Derives Zoom Blocks with Start, End, and Target Focus)
        v
[Phase 2: Camera Trajectory Planner]
        | (Applies Cubic Easing and Continuous Velocity Transitions)
        v
[Phase 3: Viewport Boundary Clamping]
        | (Enforces Zero Canvas Border Exposure)
        v
[Live Transform Matrix: scale(s) translate(x, y)]
```

## 2. Spatio-Temporal Clustering Specification

Located in `packages/core/src/zoom.ts`, the clustering algorithm aggregates discrete clicks into unified zoom blocks to prevent jarring, rapid camera shifts.

### 2.1 Threshold Constants
- `SPATIAL_THRESHOLD`: `0.15` (normalized coordinate distance across viewport width/height).
- `TEMPORAL_WINDOW_MS`: `2500 ms` (clicks occurring within this window around an active cluster are merged).
- `DEFAULT_ZOOM_SCALE`: `1.85` (default zoom magnification).
- `MAX_ZOOM_SCALE`: `3.0`.
- `MIN_ZOOM_SCALE`: `1.2`.
- `LEAD_IN_MS`: `450 ms` (lead time before click occurs to begin camera travel).
- `MIN_HOLD_MS`: `1200 ms` (minimum duration camera remains focused on target).
- `EASE_OUT_MS`: `500 ms` (duration for camera to glide back to baseline 1.0x).

### 2.2 Clustering Logic
1. Clicks are sorted in ascending temporal order: `T_0, T_1, ..., T_n`.
2. For each click `C_i = (x_i, y_i, t_i)`:
   - If an active cluster exists, compute euclidean distance `D = sqrt((x_i - x_c)^2 + (y_i - y_c)^2)`.
   - If `D <= SPATIAL_THRESHOLD` and `(t_i - t_end) <= TEMPORAL_WINDOW_MS`:
     - Merge `C_i` into the current cluster.
     - Recompute weighted centroid `(x_c, y_c) = (sum(x) / count, sum(y) / count)`.
     - Extend `t_end = max(t_end, t_i + MIN_HOLD_MS)`.
   - Otherwise, finalize the previous cluster into a `ZoomBlock` and initialize a new cluster at `C_i`.
3. Contiguous zoom blocks with gaps smaller than `EASE_OUT_MS` are linked to produce smooth pan transitions rather than zooming out to 1.0x and immediately zooming back in.

## 3. Mathematical Camera Path Interpolation

For any given time `t` in milliseconds:

```text
Target Camera State: C(t) = (Scale(t), FocusX(t), FocusY(t))
```

### 3.1 Cubic Easing Formula
To eliminate abrupt acceleration changes, transitions utilize cubic Hermite easing curves:

```text
EaseInOutCubic(u):
  If u < 0.5:
    return 4 * u * u * u
  Else:
    return 1 - pow(-2 * u + 2, 3) / 2
```

Where `u` is the normalized progress in `[0.0, 1.0]` across transition intervals:
- Lead-in phase: `u = (t - startTime) / LEAD_IN_MS`
- Hold phase: `u = 1.0` (static zoom or gentle drift)
- Recovery phase: `u = 1.0 - ((t - holdEndTime) / EASE_OUT_MS)`

### 3.2 Continuous Velocity Guarantee
When transitioning between consecutive clicks at different coordinates without zooming out:
- DomoLens computes a linear-to-cubic pan trajectory between `(FocusX_1, FocusY_1)` and `(FocusX_2, FocusY_2)`.
- The first derivative (velocity) matches across keyframe boundaries, eliminating visible camera speed stutter.

## 4. Spatial Distance-Adaptive Transitions

When camera transitions occur across different screen regions, DomoLens computes euclidean distance `D = hypot(x2 - x1, y2 - y1)` and classifies the motion:

1. **Anchor Hold (`D < 0.12`)**:
   - The user interacts within the same logical UI widget or dialog.
   - Scale remains steady at target zoom depth; micro-pan without zooming out.

2. **Lateral Glide (`0.12 <= D <= 0.38`)**:
   - The user navigates to an adjacent widget.
   - Camera applies a smooth lateral cubic pan with continuous velocity.

3. **Cinematic Crane / Dolly Pull-Back (`D > 0.38`)**:
   - Wide cross-screen jump (e.g. top-left toolbar to bottom-right submit button).
   - Direct panning at 2.0x causes motion blur and nausea.
   - The camera pulls back slightly at midpoint (e.g. down to 1.25x), reveals the travel path, and smoothly plunges into the destination target.

## 5. 2D Deadzone Inertial Auto-Tracking

During active zoom holds, DomoLens enforces a 2D camera deadzone bounding box (35% of the zoomed viewport):
- **Inside Deadzone**: Hand tremor or minor mouse wiggles produce zero camera shift (rock-solid stability).
- **Outside Deadzone**: Damped spring tracking gently displaces the camera to keep the pointer framed with golden-ratio margins.

## 6. Viewport Boundary Clamping

When zooming into corners or edges, naive centering would reveal black letterbox voids. DomoLens enforces strict bounding constraints:

```text
HalfWidth  = 0.5 / Scale
HalfHeight = 0.5 / Scale

ClampedX = clamp(TargetX, HalfWidth,  1.0 - HalfWidth)
ClampedY = clamp(TargetY, HalfHeight, 1.0 - HalfHeight)
```

### Invariant Guarantee
For all `t`:
```text
(ClampedX - HalfWidth)  >= 0.0
(ClampedX + HalfWidth)  <= 1.0
(ClampedY - HalfHeight) >= 0.0
(ClampedY + HalfHeight) <= 1.0
```
This guarantees that 100% of the rendered video frame is filled with original recording footage, with zero black border leakage.

## 7. Automated Verification

The auto-zoom module is verified via `packages/core/src/zoom.test.ts`:
- Centroid calculation accuracy across dense click bursts.
- Edge clamping at boundary extremes `(0.0, 0.0)` and `(1.0, 1.0)`.
- Spatial distance classification (Anchor, Glide, Crane).
- 2D deadzone position stability and exterior tracking.
- Parabolic crane pull-back scale dips during wide cross-screen jumps.
- Trajectory continuity across overlapping zoom intervals.
- Fallback behavior for recordings with zero clicks (maintains smooth 1.0x baseline).

