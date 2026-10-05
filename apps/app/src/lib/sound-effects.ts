import {
  CLICK_SOUND_PROFILES,
  TYPING_SOUND_PROFILES,
  type ClickSoundPreset,
  type TypingSoundPreset,
} from "@domolens/core";

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private bgAudio: HTMLAudioElement | null = null;
  private currentMusicUrl: string | null = null;
  private isDucked = false;
  private musicVolume = 0.5;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Plays a procedural click sound (bop, crisp click, or tactile tap).
   */
  public playClickBop(preset: ClickSoundPreset = "bop", volume = 0.7): void {
    if (preset === "none" || volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const profile = CLICK_SOUND_PROFILES[preset] || CLICK_SOUND_PROFILES.bop;
    const now = ctx.currentTime;

    // Organic micro-pitch variation (±4%)
    const pitchJitter = 1 + (Math.random() - 0.5) * 0.08;
    const startF = profile.startFreq * pitchJitter;
    const endF = profile.endFreq * pitchJitter;

    // Oscillator
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(startF, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endF), now + profile.durationSec);

    // Filter
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(profile.filterCutoff || 1000, now);
    filter.Q.setValueAtTime(profile.qFactor || 2.0, now);

    // Gain Envelope
    const gain = ctx.createGain();
    const peakGain = Math.min(1.0, Math.max(0.01, volume * 0.8));
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(peakGain, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.durationSec);

    // Routing
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + profile.durationSec);
  }

  /**
   * Plays a single realistic keystroke sound (mechanical thock, laptop chiclet, or typewriter).
   */
  public playKeystroke(
    preset: TypingSoundPreset = "mechanical",
    volume = 0.6,
    isSpaceOrEnter = false,
  ): void {
    if (preset === "none" || volume <= 0) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const profile = TYPING_SOUND_PROFILES[preset] || TYPING_SOUND_PROFILES.mechanical;
    const now = ctx.currentTime;
    const jitter = 1 + (Math.random() - 0.5) * 0.12;

    // 1. High-frequency click impulse (key switch contact)
    const bufferSize = Math.floor(ctx.sampleRate * 0.015);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.setValueAtTime(profile.noiseCutoff * jitter, now);

    const noiseGain = ctx.createGain();
    const peakNoise = Math.min(1.0, volume * 0.45);
    noiseGain.gain.setValueAtTime(peakNoise, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.015);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);

    // 2. Body resonance "thock"
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    const baseThock = isSpaceOrEnter ? profile.thockFreq * 0.75 : profile.thockFreq * jitter;
    osc.frequency.setValueAtTime(baseThock, now);
    osc.frequency.exponentialRampToValueAtTime(baseThock * 0.5, now + profile.durationSec);

    const bodyGain = ctx.createGain();
    const peakBody = Math.min(1.0, volume * (isSpaceOrEnter ? 0.7 : 0.5));
    bodyGain.gain.setValueAtTime(peakBody, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + profile.durationSec);

    osc.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + profile.durationSec);
  }

  /**
   * Plays a burst of typing keystrokes matching typed text length or count.
   */
  public playTypingBurst(
    count = 4,
    intervalMs = 95,
    preset: TypingSoundPreset = "mechanical",
    volume = 0.6,
  ): void {
    if (preset === "none" || volume <= 0) return;
    for (let i = 0; i < count; i++) {
      const delay = i * intervalMs + (Math.random() - 0.5) * 35;
      setTimeout(() => {
        const isLast = i === count - 1;
        this.playKeystroke(preset, volume, isLast);
      }, Math.max(0, delay));
    }
  }

  /**
   * Background Music: play or update background music playback.
   */
  public playMusic(url: string, volume = 0.5, loop = true): void {
    if (typeof window === "undefined") return;
    this.musicVolume = volume;

    if (!this.bgAudio || this.currentMusicUrl !== url) {
      if (this.bgAudio) {
        this.bgAudio.pause();
        this.bgAudio = null;
      }
      this.currentMusicUrl = url;
      this.bgAudio = new Audio(url);
      this.bgAudio.loop = loop;
    }

    this.bgAudio.volume = this.isDucked ? this.musicVolume * 0.4 : this.musicVolume;
    this.bgAudio.play().catch(() => {});
  }

  public pauseMusic(): void {
    if (this.bgAudio) {
      this.bgAudio.pause();
    }
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = volume;
    if (this.bgAudio) {
      this.bgAudio.volume = this.isDucked ? this.musicVolume * 0.4 : this.musicVolume;
    }
  }

  /**
   * Dynamically ducks background music volume during speech or rapid actions.
   */
  public duckMusic(durationMs = 600, duckFactor = 0.4): void {
    if (!this.bgAudio || this.isDucked) return;
    this.isDucked = true;
    this.bgAudio.volume = this.musicVolume * duckFactor;

    setTimeout(() => {
      this.isDucked = false;
      if (this.bgAudio) {
        this.bgAudio.volume = this.musicVolume;
      }
    }, durationMs);
  }
}

export const sfx = new SoundEffectsEngine();
