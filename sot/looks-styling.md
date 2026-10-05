# Looks and Styling Specification

## 1. Visual Presentation Model

DomoLens transforms plain screen captures into polished product walk-throughs using its Looks and Framing subsystem (`packages/core/src/looks.ts` and `apps/app/src/components/editor/LooksPanel.tsx`).

```text
+-------------------------------------------------------------+
| Background Canvas (Studio Preset Gradient / Solid Fill)    |
|                                                             |
|   +-[ Outer Padding Margin ]----------------------------+   |
|   |                                                     |   |
|   |   +-[ Rounded Video Card with Drop Shadow ]-----+   |   |
|   |   |                                             |   |   |
|   |   |   Video Content (Zoomed / Panned)           |   |   |
|   |   |   + Mouse Pointer Overlay                   |   |   |
|   |   |   + Animated Click Ripple Shaders           |   |   |
|   |   |                                             |   |   |
|   |   +---------------------------------------------+   |   |
|   |                                                     |   |
|   +-----------------------------------------------------+   |
|                                                             |
+-------------------------------------------------------------+
```

## 2. Studio Background Presets

Backgrounds are rendered via GPU-accelerated CSS linear/radial gradients or solid color fills:

1. Charcoal Slate:
   ```css
   background: linear-gradient(135deg, #1e2024 0%, #16171a 100%);
   ```
   Default professional slate backdrop matching the DomoLens primary theme.

2. Warm Ember:
   ```css
   background: linear-gradient(135deg, #2b1704 0%, #16171a 100%);
   ```
   Subtle warm ember tint reflecting the DomoLens orange branding.

3. Midnight:
   ```css
   background: linear-gradient(135deg, #090a0f 0%, #141724 100%);
   ```
   Deep navy-charcoal tone optimized for high-contrast white UI walk-throughs.

4. Sunset Mesh:
   ```css
   background: radial-gradient(at 0% 0%, #3d1c06 0%, transparent 50%),
               radial-gradient(at 100% 100%, #1e2024 0%, #0f1012 100%);
   ```
   Subtle multi-point gradient with rich depth.

5. Aurora Night:
   ```css
   background: linear-gradient(135deg, #0c1a1a 0%, #16171a 100%);
   ```
   Cool cyan-charcoal night sky tone.

6. Solid Dark:
   ```css
   background: #0f1012;
   ```
   Minimalist pure charcoal base (`--color-ink-950`).

## 3. Framing and Edge Adjustments

The video card is framed within the outer background canvas using configurable geometry tokens:

- Padding (0px to 80px): Adjusts the breathing room between the outer canvas boundary and the video element. Default: `32px`.
- Border Radius (0px to 48px): Rounds the corners of the recording. Default: `16px`.
- Aspect Ratio Formats:
  - `16:9`: Standard widescreen landscape (YouTube, desktop presentations).
  - `9:16`: Vertical portrait framing (Shorts, Reels, TikTok).
  - `1:1`: Square format (Social feeds).
  - `4:3`: Classic software presentation format.

## 4. Shadow Profiles

Shadow levels add natural three-dimensional depth between the video footage and the canvas backdrop:

| Preset | CSS Implementation | Visual Characteristic |
| --- | --- | --- |
| None | `box-shadow: none` | Flat, borderless integration |
| Soft | `box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4)` | Subtle elevation |
| Lift | `box-shadow: 0 20px 45px -12px rgba(0, 0, 0, 0.65)` | Pronounced floating card |
| Glow | `box-shadow: 0 0 50px rgba(255, 122, 26, 0.15)` | DomoLens branded orange luminescence |

## 5. Mouse Pointer Styling and Click Ripples

To ensure cursor actions remain visible across all display resolutions:

- Pointer Styles:
  - Default: Standard system cursor.
  - macOS Arrow: High-contrast vector arrow.
  - Minimal Dot: Clean circular dot, reducing visual clutter.
  - Target Ring: Highlighting reticle for precision UI actions.
- Click Ripples: When enabled, clicks generate an expanding concentric ring animation (`transform: scale(0.5) -> scale(2.2)`, `opacity: 0.8 -> 0.0`) rendered in DomoLens orange (`#ff7a1a`) with a 400ms duration.
