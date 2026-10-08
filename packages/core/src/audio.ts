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
