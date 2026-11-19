export type ThemeTrack = 'lobby' | 'race';

const STORAGE_MUSIC_KEY = 'relic_trail_music_enabled';
const STORAGE_SFX_KEY = 'relic_trail_sfx_enabled';
const STORAGE_MUSIC_VOL_KEY = 'relic_trail_music_volume';

function readBoolPref(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  return raw === 'true';
}

function readNumPref(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(1, parsed));
}

class SoundFxManager {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private _musicEnabled = readBoolPref(STORAGE_MUSIC_KEY, true);
  private _sfxEnabled = readBoolPref(STORAGE_SFX_KEY, true);
  private _musicVolume = readNumPref(STORAGE_MUSIC_VOL_KEY, 0.85);
  private _activeTrack: ThemeTrack = 'lobby';
  private loopTimer: number | null = null;
  private stepIndex = 0;
  private lastBloopAt = 0;

  public get musicEnabled(): boolean {
    return this._musicEnabled;
  }

  public set musicEnabled(enabled: boolean) {
    this._musicEnabled = enabled;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_MUSIC_KEY, String(enabled));
    }
    if (!enabled) {
      this.stopThemeLoop();
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.03);
      }
    } else {
      const ctx = this.ensureContext();
      if (this.musicGain && ctx) {
        this.musicGain.gain.setTargetAtTime(this._musicVolume, ctx.currentTime, 0.03);
      }
      this.startThemeLoop();
    }
  }

  public get musicVolume(): number {
    return this._musicVolume;
  }

  public set musicVolume(vol: number) {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(vol) ? vol : 0.85));
    this._musicVolume = clamped;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_MUSIC_VOL_KEY, String(clamped));
    }
    if (this.musicGain && this.ctx && this._musicEnabled) {
      this.musicGain.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.02);
    }
  }

  public get sfxEnabled(): boolean {
    return this._sfxEnabled;
  }

  public set sfxEnabled(enabled: boolean) {
    this._sfxEnabled = enabled;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_SFX_KEY, String(enabled));
    }
  }

  public get muted(): boolean {
    return !this._sfxEnabled && !this._musicEnabled;
  }

  public set muted(val: boolean) {
    this.sfxEnabled = !val;
    this.musicEnabled = !val;
  }

  public get activeTrack(): ThemeTrack {
    return this._activeTrack;
  }

  private getOrCreateContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-14, ctx.currentTime);
        compressor.knee.setValueAtTime(16, ctx.currentTime);
        compressor.ratio.setValueAtTime(4, ctx.currentTime);
        compressor.attack.setValueAtTime(0.004, ctx.currentTime);
        compressor.release.setValueAtTime(0.16, ctx.currentTime);
        compressor.connect(ctx.destination);

        const musicGain = ctx.createGain();
        musicGain.gain.setValueAtTime(
          this._musicEnabled ? this._musicVolume : 0.0001,
          ctx.currentTime,
        );
        musicGain.connect(compressor);

        const sfxGain = ctx.createGain();
        sfxGain.gain.setValueAtTime(0.9, ctx.currentTime);
        sfxGain.connect(compressor);

        this.ctx = ctx;
        this.compressor = compressor;
        this.musicGain = musicGain;
        this.sfxGain = sfxGain;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * 0.35);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private ensureContext(): AudioContext | null {
    if (!this._sfxEnabled && !this._musicEnabled) return null;
    return this.getOrCreateContext();
  }

  public unlockAudio(): void {
    if (!this._sfxEnabled && !this._musicEnabled) return;
    const ctx = this.getOrCreateContext();
    if (ctx && this._musicEnabled && this.loopTimer === null) {
      this.startThemeLoop();
    }
  }

  public setThemeTrack(track: ThemeTrack): void {
    if (this._activeTrack === track) return;
    this._activeTrack = track;
    this.stepIndex = 0;
    if (this._musicEnabled) {
      this.stopThemeLoop();
      this.startThemeLoop();
    }
  }

  private stopThemeLoop(): void {
    if (this.loopTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  }

  private startThemeLoop(): void {
    if (!this._musicEnabled || typeof window === 'undefined') return;
    if (this.loopTimer !== null) return;

    // 16th-note groove timing: Lobby ~114 BPM (132ms), Race ~139 BPM (108ms)
    const stepMs = this._activeTrack === 'lobby' ? 132 : 108;
    this.loopTimer = window.setInterval(() => {
      if (!this._musicEnabled) {
        this.stopThemeLoop();
        return;
      }
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;

      if (this._activeTrack === 'lobby') {
        this.playLobbyStep(ctx, this.stepIndex);
      } else {
        this.playRaceStep(ctx, this.stepIndex);
      }
      this.stepIndex = (this.stepIndex + 1) % 32;
    }, stepMs);
  }

  private getMusicTarget(ctx: AudioContext): AudioNode {
    return this.musicGain ?? this.compressor ?? ctx.destination;
  }

  private getSfxTarget(ctx: AudioContext): AudioNode {
    return this.sfxGain ?? this.compressor ?? ctx.destination;
  }

  private synthVoice(
    ctx: AudioContext,
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    filterHz?: number,
    detuneCents = 0,
  ): void {
    if (freq <= 0) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (detuneCents !== 0) {
      osc.detune.setValueAtTime(detuneCents, now);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    if (filterHz) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterHz, now);
      filter.Q.setValueAtTime(1.8, now);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(this.getMusicTarget(ctx));
    osc.start(now);
    osc.stop(now + duration + 0.025);
  }

  private synthChord(
    ctx: AudioContext,
    freqs: number[],
    duration: number,
    type: OscillatorType,
    volume: number,
    filterHz = 1600,
  ): void {
    freqs.forEach((f) => {
      this.synthVoice(ctx, f, duration, type, volume, filterHz);
    });
  }

  private synthKick(ctx: AudioContext, punch = 0.28, startHz = 148, endHz = 42): void {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(endHz, now + 0.11);

    gain.gain.setValueAtTime(punch, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.getMusicTarget(ctx));
    osc.start(now);
    osc.stop(now + 0.16);
  }

  private synthSnare(ctx: AudioContext, level = 0.16, toneHz = 195): void {
    const now = ctx.currentTime;
    const target = this.getMusicTarget(ctx);

    // Filtered noise burst
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'highpass';
    bandpass.frequency.setValueAtTime(1250, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(level, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(target);
    noise.start(now);
    noise.stop(now + 0.12);

    // Body punch
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(toneHz, now);
    body.frequency.exponentialRampToValueAtTime(105, now + 0.06);
    bodyGain.gain.setValueAtTime(level * 0.75, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    body.connect(bodyGain);
    bodyGain.connect(target);
    body.start(now);
    body.stop(now + 0.09);
  }

  private synthHat(ctx: AudioContext, level = 0.065, open = false): void {
    const now = ctx.currentTime;
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(6200, now);
    const gain = ctx.createGain();
    const dur = open ? 0.095 : 0.036;
    gain.gain.setValueAtTime(level, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(hp);
    hp.connect(gain);
    gain.connect(this.getMusicTarget(ctx));
    noise.start(now);
    noise.stop(now + dur + 0.01);
  }

  // Lobby Theme Song: "Relic Quest Anthem" (~114 BPM heroic Dm expedition groove)
  private playLobbyStep(ctx: AudioContext, step: number): void {
    // 32 steps across 4 chords: Dm (0-7), Bb (8-15), C (16-23), A7/Dm turnaround (24-31)
    const chords: Record<number, number[]> = {
      0: [293.66, 349.23, 440.0],  // Dm
      8: [233.08, 293.66, 349.23], // Bb
      16: [261.63, 329.63, 392.0], // C
      24: [220.0, 277.18, 329.63], // A
    };
    if (chords[step]) {
      this.synthChord(ctx, chords[step], 0.78, 'triangle', 0.085, 1350);
    }

    // Warm bouncing bassline
    const bassPattern = [
      146.83, 0, 0, 146.83, 0, 0, 174.61, 0,
      116.54, 0, 0, 116.54, 0, 0, 146.83, 0,
      130.81, 0, 0, 130.81, 0, 0, 164.81, 0,
      110.0, 0, 138.59, 0, 164.81, 0, 138.59, 0,
    ];
    const bass = bassPattern[step];
    if (bass > 0) {
      this.synthVoice(ctx, bass, 0.28, 'sawtooth', 0.11, 520);
      this.synthVoice(ctx, bass * 0.5, 0.3, 'sine', 0.13);
    }

    // Adventurous marimba / lead melody
    const leadPattern = [
      587.33, 0, 659.25, 0, 698.46, 0, 880.0, 0,
      783.99, 0, 698.46, 0, 587.33, 0, 523.25, 0,
      523.25, 0, 659.25, 0, 783.99, 0, 880.0, 783.99,
      698.46, 0, 659.25, 0, 554.37, 0, 659.25, 0,
    ];
    const lead = leadPattern[step];
    if (lead > 0) {
      this.synthVoice(ctx, lead, 0.22, 'triangle', 0.125, 2800);
      this.synthVoice(ctx, lead, 0.2, 'sine', 0.09, undefined, 6);
    }

    // Heroic expedition groove drums
    if (step % 8 === 0 || step % 8 === 6) {
      this.synthKick(ctx, 0.24, 132, 42);
    }
    if (step % 8 === 4) {
      this.synthSnare(ctx, 0.11, 210);
    }
    if (step % 2 === 0) {
      this.synthHat(ctx, step % 4 === 2 ? 0.065 : 0.035, step === 30);
    }
  }

  // In-Game Race Theme Song: "Relic Rush Overdrive" (~139 BPM high-octane Em runner anthem)
  private playRaceStep(ctx: AudioContext, step: number): void {
    // Power-chord stabs on Em -> C -> D -> Bm7
    const chordStabs: Record<number, number[]> = {
      0: [329.63, 392.0, 493.88],  // Em
      6: [329.63, 392.0, 493.88],
      8: [261.63, 329.63, 392.0],  // C
      14: [261.63, 329.63, 392.0],
      16: [293.66, 369.99, 440.0], // D
      22: [293.66, 369.99, 440.0],
      24: [246.94, 293.66, 369.99], // Bm
      28: [293.66, 369.99, 493.88], // D/B uplift
    };
    if (chordStabs[step]) {
      this.synthChord(ctx, chordStabs[step], 0.19, 'sawtooth', 0.068, 2100);
    }

    // Driving octave bassline (every 16th pulse for nonstop forward energy)
    const bassRootByBar = [82.41, 65.41, 73.42, 61.74]; // E2, C2, D2, B1
    const root = bassRootByBar[Math.floor(step / 8)];
    const bassFreq = step % 2 === 0 ? root : root * 2;
    this.synthVoice(ctx, bassFreq, 0.125, 'sawtooth', 0.135, 760);
    if (step % 2 === 0) {
      this.synthVoice(ctx, root, 0.13, 'sine', 0.14);
    }

    // Dope adventurous lead synth hook (dual detuned supersaw-style voice)
    const leadPattern = [
      659.25, 0, 783.99, 659.25, 987.77, 0, 880.0, 783.99,
      659.25, 0, 523.25, 659.25, 783.99, 0, 880.0, 783.99,
      587.33, 0, 739.99, 587.33, 880.0, 0, 783.99, 739.99,
      659.25, 739.99, 783.99, 880.0, 987.77, 0, 1174.66, 987.77,
    ];
    const lead = leadPattern[step];
    if (lead > 0) {
      this.synthVoice(ctx, lead, 0.165, 'sawtooth', 0.095, 3400, -7);
      this.synthVoice(ctx, lead, 0.165, 'square', 0.075, 2900, 7);
    }

    // Punchy arcade/trap drum kit
    if (step % 4 === 0 || step === 14 || step === 30) {
      this.synthKick(ctx, 0.3, 152, 40);
    }
    if (step % 8 === 4 || step === 31) {
      this.synthSnare(ctx, step === 31 ? 0.13 : 0.18, 200);
    }
    this.synthHat(ctx, step % 2 === 1 ? 0.08 : 0.042, step % 16 === 10);
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType = 'triangle',
    volume = 0.08,
    delay = 0,
  ): void {
    if (!this._sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.getSfxTarget(ctx));
    osc.start(now);
    osc.stop(now + duration);
  }

  /** Playful bubble bloop sound on selecting icons, tabs, or interactive buttons */
  public playBloop(pitchStep = 0): void {
    if (!this._sfxEnabled) return;
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastBloopAt < 45) return;
    this.lastBloopAt = nowMs;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const base = 440 + (pitchStep % 4) * 55;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.55, now + 0.065);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.getSfxTarget(ctx));
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playModalOpen(): void {
    this.tone(480, 0.07, 'sine', 0.075, 0);
    this.tone(680, 0.09, 'sine', 0.075, 0.05);
  }

  public playModalClose(): void {
    this.tone(540, 0.06, 'sine', 0.065, 0);
    this.tone(360, 0.08, 'sine', 0.065, 0.045);
  }

  public playSpin(): void {
    this.tone(360, 0.07, 'triangle', 0.075, 0);
    this.tone(480, 0.08, 'triangle', 0.075, 0.06);
  }

  public playPerk(): void {
    this.tone(523.25, 0.12, 'sine', 0.095, 0);
    this.tone(659.25, 0.14, 'sine', 0.095, 0.09);
  }

  public playPowerup(): void {
    this.tone(440, 0.1, 'triangle', 0.09, 0);
    this.tone(660, 0.12, 'triangle', 0.095, 0.07);
    this.tone(880, 0.16, 'sine', 0.1, 0.14);
  }

  public playHazard(): void {
    this.tone(240, 0.15, 'sawtooth', 0.065, 0);
    this.tone(160, 0.22, 'sawtooth', 0.065, 0.1);
  }

  public playCoin(): void {
    this.tone(987.77, 0.06, 'sine', 0.08, 0);
    this.tone(1318.51, 0.11, 'sine', 0.085, 0.045);
  }

  public playJump(): void {
    if (!this._sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.11);
    gain.gain.setValueAtTime(0.085, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(this.getSfxTarget(ctx));
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playCountdownBeep(isGo = false): void {
    if (isGo) {
      this.tone(880, 0.14, 'triangle', 0.11, 0);
      this.tone(1174.66, 0.22, 'triangle', 0.11, 0.04);
    } else {
      this.tone(587.33, 0.1, 'sine', 0.09, 0);
    }
  }

  public playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.22, 'triangle', 0.11, idx * 0.11);
    });
  }
}

export const soundFx = new SoundFxManager();
