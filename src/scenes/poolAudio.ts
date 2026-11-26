/**
 * Procedural Web Audio API water soundscapes & splash synthesizer.
 * Zero external audio files; muted by default until user enables Sound.
 */
export class PoolAudioController {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private ambientGain: GainNode | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private enabled = false;
  private disposed = false;
  private lastWakeMs = 0;

  private ensureContext(): AudioContext | null {
    if (this.disposed) return null;
    if (this.ctx) return this.ctx;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;

    const ctx = new AudioCtx();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 3;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.95 * b2 + white * 0.048;
        b3 = 0.85 * b3 + white * 0.095;
        data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + b3) * 0.35));
      }
    }

    const ambientGain = ctx.createGain();
    ambientGain.gain.value = 0;
    ambientGain.connect(ctx.destination);

    const ambientFilter = ctx.createBiquadFilter();
    ambientFilter.type = 'lowpass';
    ambientFilter.frequency.value = 320;
    ambientFilter.Q.value = 0.6;
    ambientFilter.connect(ambientGain);

    const ambientSource = ctx.createBufferSource();
    ambientSource.buffer = buffer;
    ambientSource.loop = true;
    ambientSource.connect(ambientFilter);
    ambientSource.start(0);

    this.ctx = ctx;
    this.noiseBuffer = buffer;
    this.ambientGain = ambientGain;
    this.ambientSource = ambientSource;
    return ctx;
  }

  setEnabled(enabled: boolean): void {
    if (this.disposed) return;
    this.enabled = enabled;
    if (enabled) {
      const ctx = this.ensureContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
    }

    if (this.ctx && this.ambientGain) {
      const now = this.ctx.currentTime;
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, now);
      this.ambientGain.gain.linearRampToValueAtTime(
        enabled ? 0.042 : 0.0,
        now + 0.25
      );
    }
  }

  playPlop(scale = 1.0): void {
    if (!this.enabled || this.disposed) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;
    const s = Math.max(0.5, Math.min(1.5, scale));

    // Tactile upward-sweeping droplet sine
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    const startFreq = 220 + Math.random() * 60;
    const endFreq = (620 + Math.random() * 150) * (1.05 - 0.1 * s);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.085);

    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.linearRampToValueAtTime(0.095 * s, now + 0.012);
    oscGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);

    // Brief filtered splash noise burst
    const splashSrc = ctx.createBufferSource();
    splashSrc.buffer = this.noiseBuffer;
    const splashFilter = ctx.createBiquadFilter();
    splashFilter.type = 'bandpass';
    splashFilter.frequency.setValueAtTime(1150, now);
    splashFilter.Q.value = 1.2;

    const splashGain = ctx.createGain();
    splashGain.gain.setValueAtTime(0.001, now);
    splashGain.gain.linearRampToValueAtTime(0.065 * s, now + 0.015);
    splashGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.11);

    splashSrc.connect(splashFilter);
    splashFilter.connect(splashGain);
    splashGain.connect(ctx.destination);
    splashSrc.start(now, Math.random() * 1.5, 0.13);
  }

  playWakeTick(): void {
    if (!this.enabled || this.disposed) return;
    const nowMs = performance.now();
    if (nowMs - this.lastWakeMs < 160) return;
    this.lastWakeMs = nowMs;

    const ctx = this.ensureContext();
    if (!ctx || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(750 + Math.random() * 350, now);
    filter.Q.value = 1.6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.022, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.1);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now, Math.random() * 1.8, 0.11);
  }

  dispose(): void {
    this.disposed = true;
    try {
      this.ambientSource?.stop();
    } catch {
      // Ignore already-stopped source
    }
    this.ambientSource?.disconnect();
    this.ambientGain?.disconnect();
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
    this.ctx = null;
    this.noiseBuffer = null;
    this.ambientGain = null;
    this.ambientSource = null;
  }
}
