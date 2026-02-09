class AudioService {
  private currentBgm: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.audioCtx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
    }
  }

  resume() {
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume();
    }
  }

  getCurrentBgmUrl(): string | null {
    return this.currentBgm?.src?.split("?")[0] ?? null;
  }

  async playBgm(filename: string) {
    if (this.currentBgm) {
      this.fadeOut(this.currentBgm);
    }

    const audio = new Audio(filename);
    audio.loop = true;
    audio.volume = 0;
    this.currentBgm = audio;

    try {
      await audio.play();
      this.fadeIn(audio);
    } catch {
      // Autoplay blocked by browser or file missing; resume() on first click handles policy
    }
  }

  async fadeOutBgmThenPlay(nextUrl: string) {
    if (this.currentBgm) {
      await new Promise<void>((resolve) => {
        const a = this.currentBgm!;
        let vol = a.volume;
        const iv = setInterval(() => {
          vol -= 0.02;
          a.volume = Math.max(0, vol);
          if (vol <= 0.02) {
            clearInterval(iv);
            a.pause();
            resolve();
          }
        }, 50);
      });
    }
    this.currentBgm = null;
    await this.playBgm(nextUrl);
  }

  playSfx(filename: string) {
    const a = new Audio(filename);
    a.volume = 0.5;
    a.play().catch(() => {});
  }

  private fadeIn(audio: HTMLAudioElement) {
    let vol = 0;
    const interval = setInterval(() => {
      if (vol < 0.4) {
        vol += 0.02;
        audio.volume = vol;
      } else {
        clearInterval(interval);
      }
    }, 50);
  }

  private fadeOut(audio: HTMLAudioElement) {
    let vol = audio.volume;
    const interval = setInterval(() => {
      if (vol > 0.02) {
        vol -= 0.02;
        audio.volume = vol;
      } else {
        audio.pause();
        clearInterval(interval);
      }
    }, 50);
  }

  // Synthesize a retro "beep" for typing sounds
  playTypingSound() {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = "square";
    osc.frequency.setValueAtTime(
      250 + Math.random() * 50,
      this.audioCtx.currentTime,
    );
    gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioCtx.currentTime + 0.05,
    );

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.05);
  }

  // Synthesize a gunfire sound effect
  playGunfireSound() {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = "sawtooth";
    // Gunfire: short burst, lower pitch, quick decay
    osc.frequency.setValueAtTime(
      80 + Math.random() * 40,
      this.audioCtx.currentTime,
    );
    gain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.audioCtx.currentTime + 0.12,
    );

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start();
    osc.stop(this.audioCtx.currentTime + 0.12);
  }
}

export const audioService = new AudioService();
