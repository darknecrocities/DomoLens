# Design System Specification

## 1. Design Philosophy

DomoLens uses a purposeful, focused aesthetic: dark charcoal tactile surfaces paired with high-contrast, energetic orange action accents. The interface avoids clutter, emphasizing recorded media and interactive editing controls.

## 2. Color Palette and Design Tokens

All tokens are defined in `packages/theme/theme.css` (Tailwind CSS v4 `@theme` block) and exported as constants in `packages/theme/src/tokens.ts`.

### 2.1 Charcoal Surfaces (Ink Scale)
| Token | Hex Value | Semantic Role |
| --- | --- | --- |
| `--color-ink-950` | `#0f1012` | Deepest base surface, canvas backdrop behind previews |
| `--color-ink-900` | `#16171a` | Primary application window background |
| `--color-ink-800` | `#1e2024` | Surface cards, floating panels, timeline tracks |
| `--color-ink-700` | `#2a2d33` | Raised buttons, input fields, interactive hover states |
| `--color-ink-600` | `#363940` | Subtle structural borders, dividers, bounding outlines |
| `--color-ink-500` | `#4a4e57` | Inactive icons, subtle labels, secondary metadata |

### 2.2 Orange Accents
| Token | Hex Value | Semantic Role |
| --- | --- | --- |
| `--color-orange-500` | `#ff7a1a` | Primary call-to-action buttons, active playhead, focus rings |
| `--color-orange-400` | `#ff8f3d` | Hover state for interactive orange elements |
| `--color-orange-300` | `#ffb27a` | Subtle orange highlights and active slider thumbs |

### 2.3 Accessible Contrast Rule
To satisfy WCAG AAA legibility standards:
- All primary buttons utilizing `--color-orange-500` (`#ff7a1a`) use dark charcoal text (`#0f1012`) rather than white text.
- Focused interactive elements display a distinct `2px solid #ff7a1a` outline with `3px` offset.

## 3. Typography

- Primary Font Family: `Inter Variable`, sans-serif.
- Monospace Family: System monospace stack (`ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`) applied to timecodes, duration counters, coordinate readouts, and hotkey tooltips.
- Scale:
  - Hero display: `text-4xl` to `text-6xl` (bold, tight tracking).
  - Section titles: `text-xl` to `text-2xl` (semibold).
  - Body text: `text-sm` (regular, relaxed leading).
  - Captions and tags: `text-xs` (medium).

## 4. Component Hierarchy and States

### 4.1 Buttons
- `Primary`: Solid orange background (`#ff7a1a`), dark text (`#0f1012`), subtle glow on hover.
- `Secondary`: Raised charcoal surface (`#2a2d33`), border (`#363940`), light text (`#ffffff`).
- `Ghost`: Transparent background, hover tint to `#1e2024`.
- `Danger`: Subtle crimson tint, red text, red border outline on focus.

### 4.2 Modal Dialogs
- Backdrop: Deep dark overlay (`rgba(15, 16, 18, 0.75)`) with backdrop blur (`backdrop-blur-md`).
- Surface: Centered card on desktop; responsive bottom drawer on mobile displays.
- Focus trap: Automatically cycles Tab focus within dialog boundaries and dismisses on `Escape`.

## 5. Motion and Accessibility

- Spring Physics: Framer Motion spring presets (`stiffness: 300, damping: 25`) for fluid drag-and-drop overlays and modal entrances.
- Reduced Motion: The design system respects `@media (prefers-reduced-motion: reduce)` by clamping transition and animation durations to `0.01ms`.
- Safe Area Insets: Utilizes CSS variables `--safe-top`, `--safe-bottom`, `--safe-left`, and `--safe-right` derived from `env(safe-area-inset-*)` for notched displays.
