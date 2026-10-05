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

export const TYPING_SOUND_PROFILES: Record<Exclude<TypingSoundPreset, "none">, {
  noiseCutoff: number;
  thockFreq: number;
  durationSec: number;
}> = {
  mechanical: {
    noiseCutoff: 3600,
    thockFreq: 220,
    durationSec: 0.045,
  },
  laptop: {
    noiseCutoff: 4800,
    thockFreq: 340,
    durationSec: 0.028,
  },
  typewriter: {
    noiseCutoff: 2800,
    thockFreq: 160,
    durationSec: 0.065,
  },
};
