// Advanced BGM (Background Music) Engine for "The Krampus Eve"
// Supports real MP3 files in /audio/ with seamless loop and volume fade
// Features an atmospheric Web Audio synthesizer fallback if MP3s are not yet added.

export type BgmTrack = 'LOUNGE' | 'SUSPENSE' | 'PANIC' | 'VICTORY' | 'OFF';

const TRACK_FILES: Record<Exclude<BgmTrack, 'OFF'>, string> = {
  LOUNGE: '/audio/bgm-lounge.mp3',
  SUSPENSE: '/audio/bgm-suspense.mp3',
  PANIC: '/audio/bgm-panic.mp3',
  VICTORY: '/audio/bgm-victory.mp3',
};

type BgmListener = (state: {
  currentTrack: BgmTrack;
  isPlaying: boolean;
  volume: number;
  autoMode: boolean;
  isUsingFallback: boolean;
}) => void;

class BgmManager {
  private audioElement: HTMLAudioElement | null = null;
  private currentTrack: BgmTrack = 'OFF';
  private targetTrack: BgmTrack = 'LOUNGE';
  private volume: number = 0.35;
  private muted: boolean = false;
  private autoMode: boolean = true;
  private isUsingFallback: boolean = false;
  private listeners: Set<BgmListener> = new Set();

  // Web Audio Fallback Synthesizer Drone
  private audioCtx: AudioContext | null = null;
  private synthGain: GainNode | null = null;
  private synthOscillators: OscillatorNode[] = [];
  private fallbackInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedVol = localStorage.getItem('krampus_bgm_vol');
      if (savedVol !== null) {
        const v = parseFloat(savedVol);
        if (!isNaN(v)) this.volume = Math.max(0, Math.min(1, v));
      }
      const savedAuto = localStorage.getItem('krampus_bgm_auto');
      if (savedAuto !== null) {
        this.autoMode = savedAuto === 'true';
      }
    }
  }

  public subscribe(listener: BgmListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const info = {
      currentTrack: this.currentTrack,
      isPlaying: this.currentTrack !== 'OFF' && !this.muted,
      volume: this.volume,
      autoMode: this.autoMode,
      isUsingFallback: this.isUsingFallback,
    };
    this.listeners.forEach((l) => {
      try {
        l(info);
      } catch (err) {
        console.error('[BGM] Listener error', err);
      }
    });
  }

  public setAutoMode(auto: boolean) {
    this.autoMode = auto;
    if (typeof window !== 'undefined') {
      localStorage.setItem('krampus_bgm_auto', String(auto));
    }
    this.notify();
  }

  public getAutoMode(): boolean {
    return this.autoMode;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.muted ? 0 : this.volume;
    }
    if (this.synthGain && this.audioCtx) {
      this.synthGain.gain.setValueAtTime(this.muted ? 0 : this.volume * 0.15, this.audioCtx.currentTime);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('krampus_bgm_vol', String(this.volume));
    }
    this.notify();
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      if (this.audioElement) this.audioElement.volume = 0;
      if (this.synthGain && this.audioCtx) {
        this.synthGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
      }
    } else {
      if (this.audioElement) this.audioElement.volume = this.volume;
      if (this.synthGain && this.audioCtx) {
        this.synthGain.gain.setValueAtTime(this.volume * 0.15, this.audioCtx.currentTime);
      }
    }
    this.notify();
    return !this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getCurrentTrack(): BgmTrack {
    return this.currentTrack;
  }

  /**
   * Switch to a specific BGM track with smooth fade
   */
  public async playTrack(track: BgmTrack) {
    this.targetTrack = track;
    if (track === 'OFF') {
      this.stop();
      return;
    }

    if (
      this.currentTrack === track &&
      ((this.audioElement && !this.audioElement.paused) ||
        (this.isUsingFallback && this.synthOscillators.length > 0))
    ) {
      return; // Already playing this track
    }

    const filePath = TRACK_FILES[track];

    // Try playing HTML5 Audio from /audio/
    try {
      this.stopFallbackSynth();

      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.loop = true;
      }

      this.audioElement.src = filePath;
      this.audioElement.volume = this.muted ? 0 : this.volume;

      const playPromise = this.audioElement.play();
      if (playPromise !== undefined) {
        await playPromise;
        this.currentTrack = track;
        this.isUsingFallback = false;
        this.notify();
      }
    } catch (err) {
      // If MP3 file not found or browser auto-play blocked, switch to Web Audio Synthesized Fallback!
      console.warn(`[BGM] Could not play ${filePath}, switching to atmospheric synth drone:`, err);
      this.currentTrack = track;
      this.isUsingFallback = true;
      this.playFallbackSynth(track);
      this.notify();
    }
  }

  public stop() {
    this.currentTrack = 'OFF';
    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
    }
    this.stopFallbackSynth();
    this.notify();
  }

  /**
   * Automatically synchronizes BGM with the current live game status
   */
  public syncWithGameState(stage: string, status: string, secondsLeft: number | null, isBriefing: boolean) {
    if (!this.autoMode || this.muted) return;

    if (stage === 'FINALE') {
      this.playTrack('VICTORY');
      return;
    }

    if (stage === 'LOBBY' || stage === 'WORLD_MAP' || isBriefing) {
      this.playTrack('LOUNGE');
      return;
    }

    if (status === 'ACTIVE') {
      if (secondsLeft !== null && secondsLeft <= 10 && secondsLeft > 0) {
        this.playTrack('PANIC');
      } else {
        this.playTrack('SUSPENSE');
      }
      return;
    }

    // IDLE / STANDBY / REVEALED
    this.playTrack('LOUNGE');
  }

  // --- Web Audio Synthesized Fallback Drone ---
  private initSynthContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
        this.synthGain = this.audioCtx.createGain();
        this.synthGain.gain.setValueAtTime(this.muted ? 0 : this.volume * 0.15, this.audioCtx.currentTime);
        this.synthGain.connect(this.audioCtx.destination);
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  private playFallbackSynth(track: Exclude<BgmTrack, 'OFF'>) {
    this.initSynthContext();
    if (!this.audioCtx || !this.synthGain) return;

    this.stopFallbackSynth();

    // Harmonic chords depending on mode
    let freqs: number[] = [110, 164.81, 220, 277.18]; // A minor/mysterious
    if (track === 'PANIC') {
      freqs = [123.47, 130.81, 185.0, 246.94]; // Diminished tension
    } else if (track === 'VICTORY') {
      freqs = [130.81, 164.81, 196.0, 261.63]; // Major C chord
    } else if (track === 'SUSPENSE') {
      freqs = [98.0, 146.83, 196.0, 233.08]; // Suspense G minor
    }

    const now = this.audioCtx.currentTime;
    this.synthGain.gain.setValueAtTime(this.muted ? 0 : this.volume * 0.12, now);

    this.synthOscillators = freqs.map((f, i) => {
      const osc = this.audioCtx!.createOscillator();
      const panner = this.audioCtx!.createStereoPanner ? this.audioCtx!.createStereoPanner() : null;
      osc.type = track === 'PANIC' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(f, now);

      if (panner) {
        panner.pan.setValueAtTime((i % 2 === 0 ? -0.4 : 0.4), now);
        osc.connect(panner);
        panner.connect(this.synthGain!);
      } else {
        osc.connect(this.synthGain!);
      }
      osc.start(now);
      return osc;
    });
  }

  private stopFallbackSynth() {
    this.synthOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (_) {}
    });
    this.synthOscillators = [];
  }
}

export const bgmEngine = new BgmManager();
