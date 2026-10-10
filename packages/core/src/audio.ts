import type { ClickSoundPreset, TypingSoundPreset } from "./project";

export interface SoundSynthesisProfile {
  startFreq: number;
  endFreq: number;
  durationSec: number;
  decayType: "exponential" | "linear";
  filterCutoff?: number;
  qFactor?: number;
}

export const CLICK_SOUND_PROFILES: Record<Exclude<ClickSoundPreset, "none">, SoundSynthesisProfile> = {
  bop: {
    startFreq: 540,
    endFreq: 140,
    durationSec: 0.055,
    decayType: "exponential",
    filterCutoff: 950,
    qFactor: 2.5,
  },
  click: {
    startFreq: 1950,
    endFreq: 450,
    durationSec: 0.025,
    decayType: "exponential",
    filterCutoff: 3000,
    qFactor: 1.2,
  },
  tap: {
    startFreq: 360,
    endFreq: 90,
    durationSec: 0.045,
    decayType: "exponential",
    filterCutoff: 600,
    qFactor: 1.8,
  },
};

export interface MechanicalAcousticProfile {
  name: string;
  description: string;
  noiseCutoff: number;
  thockFreq: number;
  durationSec: number;
  resonanceFilter: "lowpass" | "bandpass" | "highpass";
  resonanceCutoff: number;
  resonanceQ: number;
  noiseGain: number;
  harmonicMultiplier?: number;
  clickLeafSnap?: boolean;
}

export const TYPING_SOUND_PROFILES: Record<Exclude<TypingSoundPreset, "none">, MechanicalAcousticProfile> = {
  thock: {
    name: "Deep Thock",
    description: "Deep, wooden bubble acoustics (POM/Nylon switch)",
    noiseCutoff: 1800,
    thockFreq: 175,
    durationSec: 0.052,
    resonanceFilter: "lowpass",
    resonanceCutoff: 1100,
    resonanceQ: 2.8,
    noiseGain: 0.22,
  },
  creamy: {
    name: "Creamy Marbly",
    description: "Silky, lubed linear switches with PE foam acoustics",
    noiseCutoff: 2400,
    thockFreq: 275,
    durationSec: 0.046,
    resonanceFilter: "lowpass",
    resonanceCutoff: 1650,
    resonanceQ: 3.6,
    noiseGain: 0.18,
    harmonicMultiplier: 2.0, // Dual-harmonic marbly tone
  },
  thack: {
    name: "Crisp Thack (Clack)",
    description: "High-pitched crisp top-out snap on aluminum plate",
    noiseCutoff: 4200,
    thockFreq: 420,
    durationSec: 0.038,
    resonanceFilter: "bandpass",
    resonanceCutoff: 2600,
    resonanceQ: 1.6,
    noiseGain: 0.35,
  },
  clicky: {
    name: "Tactile Clicky",
    description: "Crisp mechanical click-bar snap (Cherry Blue / Box White)",
    noiseCutoff: 5200,
    thockFreq: 310,
    durationSec: 0.042,
    resonanceFilter: "highpass",
    resonanceCutoff: 4400,
    resonanceQ: 2.2,
    noiseGain: 0.45,
    clickLeafSnap: true,
  },
  thick: {
    name: "Thick Heavy",
    description: "Heavy dampened sub-bass thud (Silenced tactile switch)",
    noiseCutoff: 1200,
    thockFreq: 140,
    durationSec: 0.065,
    resonanceFilter: "lowpass",
    resonanceCutoff: 780,
    resonanceQ: 2.2,
    noiseGain: 0.15,
  },
  mechanical: {
    name: "Classic Mechanical",
    description: "Balanced standard mechanical keyboard typing",
    noiseCutoff: 3600,
    thockFreq: 220,
    durationSec: 0.045,
    resonanceFilter: "lowpass",
    resonanceCutoff: 1400,
    resonanceQ: 2.0,
    noiseGain: 0.3,
  },
  laptop: {
    name: "Modern Laptop",
    description: "Flat, tight aluminum scissor-switch chiclet key",
    noiseCutoff: 4800,
    thockFreq: 340,
    durationSec: 0.028,
    resonanceFilter: "highpass",
    resonanceCutoff: 3200,
    resonanceQ: 1.2,
    noiseGain: 0.25,
  },
  typewriter: {
    name: "Vintage Typewriter",
    description: "Heavy mechanical strike with resonant metallic chime",
    noiseCutoff: 2800,
    thockFreq: 160,
    durationSec: 0.065,
    resonanceFilter: "bandpass",
    resonanceCutoff: 2800,
    resonanceQ: 3.0,
    noiseGain: 0.4,
  },
};

/**
 * Converts linear volume multiplier (0.0 to 2.0+) to decibels (dB).
 * Unity gain (1.0) = 0.0 dB. 0.5 ≈ -6.0 dB. 2.0 ≈ +6.0 dB.
 */
export function volumeToDb(volume: number): number {
  if (volume <= 0.0001) return -48;
  const db = 20 * Math.log10(volume);
  return Math.round(db * 10) / 10;
}

/**
 * Converts decibels (dB) to linear volume multiplier.
 * 0.0 dB = 1.0. -6.0 dB ≈ 0.5. +6.0 dB ≈ 2.0. <= -48 dB = 0.
 */
export function dbToVolume(db: number): number {
  if (db <= -45) return 0;
  const linear = Math.pow(10, db / 20);
  return Math.round(linear * 1000) / 1000;
}

/**
 * Background music preset definitions with acoustic styles.
 */
export interface MusicPreset {
  id: string;
  name: string;
  description: string;
  tempoBpm: number;
  durationMs: number;
  genre: "lofi" | "ambient" | "cinematic" | "tech" | "corporate";
}

export const BACKGROUND_MUSIC_PRESETS: MusicPreset[] = [
  {
    id: "lofi-focus",
    name: "Lo-Fi Warmth",
    description: "Warm mellow keys, gentle vinyl crackle, and soft hip-hop groove",
    tempoBpm: 82,
    durationMs: 60000,
    genre: "lofi",
  },
  {
    id: "ambient-tech",
    name: "Ambient Tech Glow",
    description: "Subtle futuristic synthesizer pad with crystal reverb",
    tempoBpm: 95,
    durationMs: 60000,
    genre: "ambient",
  },
  {
    id: "cinematic-pulse",
    name: "Cinematic Pulse",
    description: "Deep driving minimalist pulse building steady momentum",
    tempoBpm: 110,
    durationMs: 60000,
    genre: "cinematic",
  },
  {
    id: "clean-presentation",
    name: "Clean Minimal",
    description: "Crisp neutral acoustic background tailored for product walkthroughs",
    tempoBpm: 100,
    durationMs: 60000,
    genre: "corporate",
  },
];

/**
 * Computes instantaneous track volume at any given time (ms) factoring in:
 * - Base track volume
 * - Decibel gain adjustment
 * - Fade-In envelope
 * - Fade-Out envelope
 * - Mute state
 */
export function calculateTrackVolumeAtTime(
  track: import("./project").AudioTrack,
  timeMs: number,
): number {
  if (track.muted) return 0;
  const trackStart = track.startTimeMs;
  const trackEnd = track.startTimeMs + track.durationMs;

  if (timeMs < trackStart || timeMs > trackEnd) {
    return 0;
  }

  // Base gain from volume or gainDb
  let baseGain = track.volume ?? 1.0;
  if (typeof track.gainDb === "number") {
    baseGain = dbToVolume(track.gainDb);
  }

  const fadeInMs = Math.max(0, track.fadeInMs ?? 0);
  const fadeOutMs = Math.max(0, track.fadeOutMs ?? 0);

  let fadeMultiplier = 1.0;

  // Fade In calculation
  if (fadeInMs > 0 && timeMs < trackStart + fadeInMs) {
    const elapsed = timeMs - trackStart;
    fadeMultiplier = Math.min(fadeMultiplier, Math.max(0, elapsed / fadeInMs));
  }

  // Fade Out calculation
  if (fadeOutMs > 0 && timeMs > trackEnd - fadeOutMs) {
    const remaining = trackEnd - timeMs;
    fadeMultiplier = Math.min(fadeMultiplier, Math.max(0, remaining / fadeOutMs));
  }

  return Math.max(0, Math.min(2.0, baseGain * fadeMultiplier));
}
