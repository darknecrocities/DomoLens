import {
  CLICK_SOUND_PROFILES,
  TYPING_SOUND_PROFILES,
  type ClickSoundPreset,
  type TypingSoundPreset,
} from "@domolens/core";

class SoundEffectsEngine {
  private ctx: AudioContext | null = null;
  private lastKeystrokeTime = 0;
  private activeBurstTimers: number[] = [];

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
   * Plays a single realistic keystroke sound (thock, creamy, thack, clicky, thick, etc.).
   * Throttled to prevent buzzing or crackle during fast keystrokes.
   */
  public playKeystroke(
    preset: TypingSoundPreset = "creamy",
    volume = 0.55,
    isSpaceOrEnter = false,
  ): void {
    if (preset === "none" || volume <= 0) return;
    const nowTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (nowTime - this.lastKeystrokeTime < 70 && !isSpaceOrEnter) {
      return;
    }
    this.lastKeystrokeTime = nowTime;

    const ctx = this.getContext();
    if (!ctx) return;

    const profile =
      TYPING_SOUND_PROFILES[preset] ||
      TYPING_SOUND_PROFILES.creamy ||
      TYPING_SOUND_PROFILES.mechanical;
    const now = ctx.currentTime;
    const jitter = 1 + (Math.random() - 0.5) * 0.12;

    // 1. High-frequency contact click / switch leaf impulse
    const noiseDuration = profile.clickLeafSnap ? 0.02 : 0.012;
    const bufferSize = Math.floor(ctx.sampleRate * noiseDuration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = profile.resonanceFilter === "bandpass" ? "bandpass" : "highpass";
    noiseFilter.frequency.setValueAtTime(profile.noiseCutoff * jitter, now);
    if (profile.resonanceFilter === "bandpass") {
      noiseFilter.Q.setValueAtTime(profile.resonanceQ || 1.6, now);
    }

    const noiseGain = ctx.createGain();
    const baseNoiseGain = (profile.noiseGain ?? 0.3) * volume;
    noiseGain.gain.setValueAtTime(Math.min(1.0, baseNoiseGain), now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0005, now + noiseDuration);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);

    // If clicky switch, synthesize the distinct click-bar / click-leaf reset snap
    if (profile.clickLeafSnap) {
      const snapOsc = ctx.createOscillator();
      snapOsc.type = "sine";
      snapOsc.frequency.setValueAtTime(4500 * jitter, now + 0.002);
      snapOsc.frequency.exponentialRampToValueAtTime(2000, now + 0.012);

      const snapGain = ctx.createGain();
      snapGain.gain.setValueAtTime(0.0001, now);
      snapGain.gain.setValueAtTime(Math.min(1.0, volume * 0.42), now + 0.002);
      snapGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);
      snapOsc.start(now + 0.002);
      snapOsc.stop(now + 0.014);
    }

    // 2. Primary Body resonance "Thock" / housing impact
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    const baseThock = isSpaceOrEnter ? profile.thockFreq * 0.72 : profile.thockFreq * jitter;
    osc.frequency.setValueAtTime(baseThock, now);
    osc.frequency.exponentialRampToValueAtTime(baseThock * 0.45, now + profile.durationSec);

    const bodyFilter = ctx.createBiquadFilter();
    bodyFilter.type = profile.resonanceFilter || "lowpass";
    bodyFilter.frequency.setValueAtTime((profile.resonanceCutoff || 1400) * jitter, now);
    bodyFilter.Q.setValueAtTime(profile.resonanceQ || 2.0, now);

    const bodyGain = ctx.createGain();
    const peakBody = Math.min(1.0, volume * (isSpaceOrEnter ? 0.68 : 0.5));
    bodyGain.gain.setValueAtTime(peakBody, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + profile.durationSec);

    osc.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + profile.durationSec);

    // 3. Dual-Harmonic Layer for "Creamy Marbly" switches (adds silky tape-mod foam body)
    if (profile.harmonicMultiplier) {
      const harmOsc = ctx.createOscillator();
      harmOsc.type = "sine";
      const harmFreq = baseThock * profile.harmonicMultiplier;
      harmOsc.frequency.setValueAtTime(harmFreq, now);
      harmOsc.frequency.exponentialRampToValueAtTime(harmFreq * 0.55, now + profile.durationSec * 0.8);

      const harmGain = ctx.createGain();
      harmGain.gain.setValueAtTime(Math.min(1.0, volume * 0.22), now);
      harmGain.gain.exponentialRampToValueAtTime(0.0001, now + profile.durationSec * 0.8);

      harmOsc.connect(harmGain);
      harmGain.connect(ctx.destination);
      harmOsc.start(now);
      harmOsc.stop(now + profile.durationSec * 0.8);
    }
  }

  /**
   * Plays a burst of typing keystrokes matching typed text length or count.
   * Cancels prior bursts to avoid chaotic overlapping sound.
   */
  public playTypingBurst(
    count = 3,
    intervalMs = 105,
    preset: TypingSoundPreset = "creamy",
    volume = 0.55,
  ): void {
    if (preset === "none" || volume <= 0) return;
    if (typeof window === "undefined") return;

    this.activeBurstTimers.forEach((t) => window.clearTimeout(t));
    this.activeBurstTimers = [];

    const safeCount = Math.min(4, Math.max(1, count));
    for (let i = 0; i < safeCount; i++) {
      const delay = i * intervalMs;
      const tId = window.setTimeout(() => {
        const isLast = i === safeCount - 1;
        this.playKeystroke(preset, volume, isLast);
      }, delay);
      this.activeBurstTimers.push(tId);
    }
  }

  // Background Music no-ops
  public playMusic(_url?: string, _volume?: number, _loop?: boolean): void {}
  public pauseMusic(): void {}
  public setMusicVolume(_volume?: number): void {}
  public duckMusic(_durationMs?: number, _duckFactor?: number): void {}
}

export const sfx = new SoundEffectsEngine();
