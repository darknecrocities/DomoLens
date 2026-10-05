# Audio System Specification

## 1. System Overview

The DomoLens Audio System manages procedural sound effects (click bops, mechanical typing bursts) and background music playback, providing tactile auditory feedback synchronized with recorded video footage.

```text
+------------------------------------------------------------------------+
|                          Audio Engine Roles                            |
|                                                                        |
|  [Procedural Click SFX]     [Typing Burst SFX]     [Background Music]  |
|   Sine Sweep Oscillator      Noise Burst + Thock    HTML5 Audio Node   |
|   (Bop / Click / Tap)        (Mech / Laptop / Type) (Ambient Presets)  |
|            |                         |                     |           |
|            +-------------------------+                     |           |
|                                      |                     |           |
|                                      v                     v           |
|                         [Dynamic Ducking Controller]-------+           |
|                          (Attenuates music by -6dB during SFX)         |
|                                      |                                 |
|                                      v                                 |
|                       [Web Audio Destination / Master Mix]             |
+------------------------------------------------------------------------+
```

## 2. Procedural Sound Effects Synthesis

Sound effects are synthesized in real time via the Web Audio API without requiring bulky audio file downloads or network dependencies.

### 2.1 Click "Bop" Sound Effect
- Synthesis Pipeline:
  - Oscillator: Sine wave sweeping rapidly from `540 Hz` down to `140 Hz` over `55 ms`.
  - Gain Envelope: Linear ramp to peak gain over `2 ms`, followed by exponential decay over `50 ms`.
  - Resonant Filter: Low-pass biquad filter with `950 Hz` cutoff and Q-factor `2.5`.
  - Pitch Jitter: Micro-randomization of `±4%` applied to the fundamental frequency on each trigger to ensure natural variation.
- Preset Profiles:
  - `Bop`: Soft bubbly pop.
  - `Modern Click`: High-frequency crisp switch impulse (`1950 Hz` down to `450 Hz`).
  - `Wooden Tap`: Tactile acoustic knock (`360 Hz` down to `90 Hz`).

### 2.2 Mechanical Typing Sound Effect
- Synthesis Pipeline:
  - Contact Impulse: High-pass filtered white noise burst (`3600 Hz` cutoff) lasting `15 ms`.
  - Body Resonance ("Thock"): Triangle oscillator at `220 Hz` decaying over `45 ms`.
  - Spacebar / Enter Accent: Lower frequency resonance (`165 Hz`) with increased decay duration (`60 ms`).
- Preset Profiles:
  - `Mechanical Thock`: Heavy tactile mechanical keyboard switch.
  - `Laptop Chiclet`: Subtle low-travel scissor switch tap.
  - `Typewriter`: Crisp metal impact and body resonance.

## 3. Background Music Engine

### 3.1 Curated Presets
- `Ambient Lo-Fi Chill`: Warm, relaxed Rhodes piano chords and soft beat.
- `Modern Tech Flow`: Modern synthesizer groove.
- `Energetic Upbeat Beat`: Rhythmic product demo beat.
- `Deep Focus Minimal`: Subtle atmospheric drone.

### 3.2 Custom Audio Import
- Users can import custom music tracks (`.mp3`, `.wav`, `.m4a`, `.ogg`).
- Audio files are indexed in the `audioTracks` array of the project state.

### 3.3 Dynamic Audio Ducking
- When enabled, the audio ducking controller automatically attenuates background music volume by `45%` (approx `-6 dB` to `-10 dB`) whenever a click bop or typing burst occurs.
- Music smoothly recovers to nominal volume over `400 ms - 600 ms`.

## 4. Playback and Timeline Synchronization

- During playback in `VideoCanvas.tsx`, timestamps are monitored against recorded click events (`c.timestampMs`) and typing interactions (`i.timestampMs`).
- When the playhead crosses an interaction event within a 65ms evaluation window without re-triggering, the corresponding sound effect is fired.
- Timeline scrubbing directly updates background music playback positions.
