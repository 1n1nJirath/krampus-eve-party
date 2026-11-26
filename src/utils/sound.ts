// High-Impact Web Audio API Synthesizer for "The Krampus Eve"
// Zero external asset dependency, DynamicsCompressorNode-protected against clipping,
// with high-tension countdown risers, unmistakable 00:00 Timeout Gong/Buzzer,
// 3D Mansion Door creak/latch SFX, and MC Soundboard effects.

import { bgmEngine } from './bgm';

export type SoundboardSfxId = 'DRUMROLL' | 'FANFARE' | 'KRAMPUS_LAUGH' | 'FAIL_HORN' | 'TIMEOUT_GONG';

class SoundManager {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private subBeatTimeout: ReturnType<typeof setTimeout> | null = null;
  public enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getOutputNode(): AudioNode | null {
    const ctx = this.getContext();
    if (!ctx) return null;
    if (!this.compressor || !this.masterGain) {
      try {
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.setValueAtTime(-14, ctx.currentTime);
        comp.knee.setValueAtTime(12, ctx.currentTime);
        comp.ratio.setValueAtTime(8, ctx.currentTime);
        comp.attack.setValueAtTime(0.002, ctx.currentTime);
        comp.release.setValueAtTime(0.16, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.95, ctx.currentTime);

        gain.connect(comp);
        comp.connect(ctx.destination);

        this.compressor = comp;
        this.masterGain = gain;
      } catch {
        return ctx.destination;
      }
    }
    return this.masterGain;
  }

  public cancelScheduledCountdown() {
    if (this.subBeatTimeout) {
      clearTimeout(this.subBeatTimeout);
      this.subBeatTimeout = null;
    }
  }

  private scheduleTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.25,
    startOffset = 0,
    endFreq?: number
  ) {
    const ctx = this.getContext();
    const out = this.getOutputNode();
    if (!ctx || !out) return;

    const start = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (typeof endFreq === 'number' && endFreq > 0) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    }

    gain.gain.setValueAtTime(Math.max(0.001, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(out);

    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  private scheduleNoiseBurst(
    duration: number,
    volume: number,
    startOffset: number = 0,
    bandpassFreq: number = 1400,
    q: number = 2.0
  ) {
    const ctx = this.getContext();
    const out = this.getOutputNode();
    if (!ctx || !out || typeof ctx.createBuffer !== 'function') return;

    try {
      const sampleRate = ctx.sampleRate || 44100;
      const frameCount = Math.max(1, Math.floor(sampleRate * duration));
      const buffer = ctx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(bandpassFreq, ctx.currentTime + startOffset);
      filter.Q.setValueAtTime(q, ctx.currentTime + startOffset);

      const gain = ctx.createGain();
      const start = ctx.currentTime + startOffset;
      gain.gain.setValueAtTime(Math.max(0.001, volume), start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(out);

      noise.start(start);
      noise.stop(start + duration + 0.02);
    } catch {
      // Fallback if buffer creation unsupported in test mock
    }
  }

  // Legacy 1-arg tick wrapper preserved for backwards compatibility
  public playTick(urgent = false) {
    this.playCountdownTick(urgent ? 4 : 8);
  }

  /**
   * Escalating High-Tension Countdown Engine (<= 10 seconds remaining):
   * - 10s to 6s: Deep rhythmic dual-pulse heartbeat + crisp metallic clock tick (gradually rising pitch & volume).
   * - 5s to 1s: Double-time metallic ticking + rising synth tension riser + subtle snare rattle build-up.
   */
  public playCountdownTick(secondsLeft: number) {
    if (!this.enabled || secondsLeft <= 0) return;
    this.cancelScheduledCountdown();

    const clamped = Math.max(1, Math.min(10, Math.round(secondsLeft)));
    const progress = (10 - clamped) / 9; // 0.0 at 10s -> 1.0 at 1s

    if (clamped >= 6) {
      // 10s..6s: Deep suspenseful heartbeat (lub-dub) + crisp metallic clock tick
      const basePitch = 780 + Math.round(progress * 320);
      const tickVol = 0.22 + progress * 0.14;

      // Primary metallic clock tick
      this.scheduleTone(basePitch, 0.055, 'triangle', tickVol, 0);
      this.scheduleTone(basePitch * 2.1, 0.028, 'sine', tickVol * 0.5, 0);

      // Heartbeat "Lub-Dub" sub-thump
      this.scheduleTone(68, 0.12, 'sine', 0.34, 0.01, 38);
      this.scheduleTone(58, 0.14, 'sine', 0.26, 0.17, 34);
    } else {
      // 5s..1s: Double-time urgency + rising synth tension riser + snare rattle
      const urgency = (6 - clamped) / 5; // 0.2 at 5s -> 1.0 at 1s
      const tickPitch = 1080 + Math.round(urgency * 520);
      const tickVol = 0.34 + urgency * 0.22;

      // Beat 1 (t = 0s)
      this.scheduleTone(tickPitch, 0.055, 'square', tickVol, 0);
      this.scheduleTone(tickPitch * 1.5, 0.035, 'triangle', tickVol * 0.65, 0);
      // Heavy heartbeat thump
      this.scheduleTone(78, 0.11, 'sine', 0.42, 0, 40);
      // Snare drum roll rattle
      this.scheduleNoiseBurst(0.09, 0.14 + urgency * 0.14, 0.02, 1600 + urgency * 900, 1.8);

      // Rising synth tension riser sweep across the second
      const riserStart = 240 + urgency * 320;
      const riserEnd = riserStart * (1.35 + urgency * 0.35);
      this.scheduleTone(riserStart, 0.46, 'sawtooth', 0.14 + urgency * 0.12, 0.03, riserEnd);

      // Beat 2: Double-time sub-beat at +480ms
      this.subBeatTimeout = setTimeout(() => {
        this.subBeatTimeout = null;
        if (!this.enabled) return;
        this.scheduleTone(tickPitch * 1.12, 0.05, 'square', tickVol * 0.88, 0);
        this.scheduleTone(66, 0.1, 'sine', 0.32, 0, 36);
        this.scheduleNoiseBurst(0.07, 0.12 + urgency * 0.12, 0, 1900 + urgency * 900, 2.0);
      }, 480);
    }
  }

  /**
   * Loud, Unmistakable Timeout Alarm (00:00):
   * Immediately ducks BGM for 1.6s and fires a layered Game-Show Buzzer + Heavy Gothic Bell/Gong Impact
   * routed through the DynamicsCompressorNode at high gain (0.95).
   */
  public playTimeUp() {
    if (!this.enabled) return;
    this.cancelScheduledCountdown();

    // Immediately duck BGM so everyone in a noisy party room hears time is up
    try {
      bgmEngine.duck(1650);
    } catch {
      // ignore if BGM engine not active
    }

    // Layer 1: Low-end sub-bass gong impact (95Hz -> 32Hz)
    this.scheduleTone(95, 1.35, 'sine', 0.85, 0, 32);
    this.scheduleTone(130.81, 1.1, 'triangle', 0.6, 0, 65.4);

    // Layer 2: Unmistakable Game-Show Brass/Sawtooth Buzzer (two-stage punch)
    this.scheduleTone(146.83, 0.42, 'sawtooth', 0.55, 0, 138.59);
    this.scheduleTone(207.65, 0.42, 'sawtooth', 0.48, 0, 196.0);
    this.scheduleTone(146.83, 0.78, 'sawtooth', 0.62, 0.44, 110.0);
    this.scheduleTone(220.0, 0.78, 'square', 0.45, 0.44, 164.81);

    // Layer 3: Heavy Gothic Cathedral Bell / Metallic Gong harmonics (long resonant tail)
    const bellPartials = [523.25, 659.25, 783.99, 1046.5, 1244.5];
    bellPartials.forEach((freq, idx) => {
      this.scheduleTone(
        freq,
        1.45 - idx * 0.15,
        idx % 2 === 0 ? 'triangle' : 'sine',
        0.38 / (idx * 0.55 + 1),
        0.01
      );
    });

    // Layer 4: Initial metallic crash transient
    this.scheduleNoiseBurst(0.28, 0.42, 0, 2400, 1.2);
  }

  /**
   * 3D Mansion Door Opening SFX:
   * Realistic wooden door creak + heavy iron latch click + Safe Golden Chime or Krampus Doom Impact.
   */
  public playDoorOpen(isSafe: boolean) {
    if (!this.enabled) return;

    // 1. Heavy iron latch click at t = 0
    this.scheduleNoiseBurst(0.045, 0.35, 0, 2800, 3.0);
    this.scheduleTone(420, 0.045, 'square', 0.25, 0, 180);

    // 2. Eerie wooden door creak (low sawtooth pitch bend) at t = 0.05s..0.38s
    this.scheduleTone(165, 0.16, 'sawtooth', 0.22, 0.05, 235);
    this.scheduleTone(235, 0.18, 'sawtooth', 0.2, 0.2, 145);

    // 3. Reveal payoff inside doorway at t = 0.28s
    if (isSafe) {
      // Warm Golden Light & Holy Coins Chime
      const safeNotes = [523.25, 659.25, 783.99, 1046.5];
      safeNotes.forEach((f, idx) => {
        this.scheduleTone(f, 0.45, 'triangle', 0.3, 0.26 + idx * 0.065);
      });
    } else {
      // Krampus Danger / Trap Door Strobe Impact
      this.scheduleTone(110, 0.55, 'sawtooth', 0.5, 0.25, 42);
      this.scheduleTone(155.56, 0.5, 'square', 0.38, 0.27, 58);
      this.scheduleNoiseBurst(0.24, 0.36, 0.26, 950, 1.4);
    }
  }

  // Team submits an answer
  public playSubmit() {
    this.scheduleTone(523.25, 0.08, 'triangle', 0.25, 0);
    this.scheduleTone(659.25, 0.12, 'triangle', 0.28, 0.06);
  }

  // Team presses the Speed Buzzer
  public playBuzzer(rank: number = 1) {
    const base = rank === 1 ? 880 : 587.33;
    this.scheduleTone(base, 0.15, 'sawtooth', 0.38, 0);
    this.scheduleTone(base * 1.25, 0.25, 'sawtooth', 0.38, 0.09);
  }

  // GM reveals the answer / wheel result
  public playReveal() {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((n, idx) => {
      this.scheduleTone(n, 0.35, 'triangle', 0.32, idx * 0.08);
    });
  }

  // Holy Coin gain or Krampus penalty
  public playCoinChange(positive: boolean) {
    if (positive) {
      this.scheduleTone(987.77, 0.09, 'sine', 0.3, 0);
      this.scheduleTone(1318.51, 0.24, 'sine', 0.34, 0.08);
    } else {
      this.scheduleTone(196.0, 0.22, 'sawtooth', 0.38, 0, 146.83);
      this.scheduleTone(146.83, 0.38, 'sawtooth', 0.42, 0.14, 98.0);
    }
  }

  // ==============================================================
  // MC SOUNDBOARD EFFECTS (Triggered from /admin -> played on /display)
  // ==============================================================
  public playDrumroll() {
    if (!this.enabled) return;
    try {
      bgmEngine.duck(1400);
    } catch {}
    const hits = 16;
    for (let i = 0; i < hits; i++) {
      const offset = i * 0.065;
      const vol = 0.16 + (i / hits) * 0.28;
      this.scheduleNoiseBurst(0.055, vol, offset, 1500 + i * 45, 1.8);
      this.scheduleTone(115 + i * 3, 0.05, 'triangle', vol * 0.8, offset, 70);
    }
    // Final cymbal/rimshot accent
    this.scheduleNoiseBurst(0.35, 0.45, hits * 0.065, 3200, 1.1);
    this.scheduleTone(220, 0.25, 'sine', 0.5, hits * 0.065, 65);
  }

  public playFanfare() {
    if (!this.enabled) return;
    try {
      bgmEngine.duck(1600);
    } catch {}
    // Royal Victory Brass Fanfare: C5 - E5 - G5 - C6 (hold) - G5 - C6!
    const seq: Array<{ f: number; d: number; t: number; v: number }> = [
      { f: 523.25, d: 0.14, t: 0.0, v: 0.42 },
      { f: 659.25, d: 0.14, t: 0.13, v: 0.44 },
      { f: 783.99, d: 0.14, t: 0.26, v: 0.46 },
      { f: 1046.5, d: 0.32, t: 0.39, v: 0.55 },
      { f: 783.99, d: 0.14, t: 0.73, v: 0.45 },
      { f: 1046.5, d: 0.65, t: 0.88, v: 0.62 },
    ];
    seq.forEach((n) => {
      this.scheduleTone(n.f, n.d, 'sawtooth', n.v, n.t);
      this.scheduleTone(n.f * 0.5, n.d, 'triangle', n.v * 0.7, n.t);
    });
  }

  public playKrampusLaugh() {
    if (!this.enabled) return;
    try {
      bgmEngine.duck(1600);
    } catch {}
    // Sinister descending demonic chuckle ("MWUA-HA-HA-HA-HAAA!")
    const laughs = [290, 260, 230, 195, 160];
    laughs.forEach((f, idx) => {
      const t = idx * 0.21;
      const dur = idx === laughs.length - 1 ? 0.5 : 0.16;
      this.scheduleTone(f, dur, 'sawtooth', 0.52, t, f * 0.68);
      this.scheduleTone(f * 0.5, dur, 'square', 0.42, t, f * 0.34);
    });
  }

  public playFailHorn() {
    if (!this.enabled) return;
    try {
      bgmEngine.duck(1500);
    } catch {}
    // Classic "Wah-Wah-Wah-Waaaaah" sad trombone
    const notes = [
      { f: 311.13, e: 293.66, d: 0.26, t: 0.0 },
      { f: 293.66, e: 277.18, d: 0.26, t: 0.28 },
      { f: 277.18, e: 261.63, d: 0.26, t: 0.56 },
      { f: 261.63, e: 185.0, d: 0.75, t: 0.84 },
    ];
    notes.forEach((n) => {
      this.scheduleTone(n.f, n.d, 'sawtooth', 0.48, n.t, n.e);
      this.scheduleTone(n.f * 0.5, n.d, 'triangle', 0.35, n.t, n.e * 0.5);
    });
  }

  public playSoundboard(sfx: SoundboardSfxId) {
    switch (sfx) {
      case 'DRUMROLL':
        this.playDrumroll();
        break;
      case 'FANFARE':
        this.playFanfare();
        break;
      case 'KRAMPUS_LAUGH':
        this.playKrampusLaugh();
        break;
      case 'FAIL_HORN':
        this.playFailHorn();
        break;
      case 'TIMEOUT_GONG':
        this.playTimeUp();
        break;
    }
  }
}

export const soundFX = new SoundManager();
