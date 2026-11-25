/**
 * Pure Web Audio API procedural rain synthesizer (zero external audio files).
 * Layers a warm lowpass rain bed with a subtle high-frequency drizzle patter.
 */
export class RainAudioController {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private drizzleFilter: BiquadFilterNode | null = null;
  private drizzleGain: GainNode | null = null;
  private bedSource: AudioBufferSourceNode | null = null;
  private drizzleSource: AudioBufferSourceNode | null = null;
  private enabled = false;
  private intensity = 1.0;
  private disposed = false;

  private ensureGraph(): void {
    if (this.ctx || this.disposed) return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 3;
    const buffer = ctx.createBuffer(2, length, sampleRate);

    // Generate stereo pink-ish noise using Voss-style 7-pole approximation
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        b6 = white * 0.115926;
        data[i] = Math.max(-1, Math.min(1, pink * 0.08));
      }
    }

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;
    masterGain.connect(ctx.destination);

    // Layer 1: Low-mid ambient rain bed
    const bedSource = ctx.createBufferSource();
    bedSource.buffer = buffer;
    bedSource.loop = true;

    const bedFilter = ctx.createBiquadFilter();
    bedFilter.type = 'lowpass';
    bedFilter.frequency.value = 460;
    bedFilter.Q.value = 0.5;

    const bedGain = ctx.createGain();
    bedGain.gain.value = 0.65;

    bedSource.connect(bedFilter);
    bedFilter.connect(bedGain);
    bedGain.connect(masterGain);

    // Layer 2: Crisp drizzle / pavement patter
    const drizzleSource = ctx.createBufferSource();
    drizzleSource.buffer = buffer;
    drizzleSource.loop = true;
    drizzleSource.playbackRate.value = 1.07;

    const drizzleFilter = ctx.createBiquadFilter();
    drizzleFilter.type = 'bandpass';
    drizzleFilter.frequency.value = 2400;
    drizzleFilter.Q.value = 0.75;

    const drizzleGain = ctx.createGain();
    drizzleGain.gain.value = 0.24;

    drizzleSource.connect(drizzleFilter);
    drizzleFilter.connect(drizzleGain);
    drizzleGain.connect(masterGain);

    bedSource.start(0);
    drizzleSource.start(0);

    this.ctx = ctx;
    this.masterGain = masterGain;
    this.drizzleFilter = drizzleFilter;
    this.drizzleGain = drizzleGain;
    this.bedSource = bedSource;
    this.drizzleSource = drizzleSource;
  }

  private applyGainRamp(): void {
    if (!this.ctx || !this.masterGain || this.disposed) return;
    const now = this.ctx.currentTime;
    const targetGain = this.enabled
      ? Math.min(0.32, 0.14 * Math.max(0.18, this.intensity))
      : 0.0;

    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(targetGain, now + 0.28);

    if (this.drizzleFilter && this.drizzleGain) {
      const freq = this.intensity > 1.3 ? 2800 : 2300;
      const dGain = this.intensity > 1.3 ? 0.34 : 0.22;
      this.drizzleFilter.frequency.setTargetAtTime(freq, now, 0.2);
      this.drizzleGain.gain.setTargetAtTime(dGain, now, 0.2);
    }
  }

  setEnabled(enabled: boolean): void {
    if (this.disposed) return;
    this.enabled = enabled;
    if (enabled) {
      this.ensureGraph();
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
    }
    this.applyGainRamp();
  }

  setIntensity(intensity: number): void {
    if (this.disposed) return;
    this.intensity = intensity;
    this.applyGainRamp();
  }

  dispose(): void {
    this.disposed = true;
    try {
      this.bedSource?.stop();
    } catch {
      // Ignore already-stopped source
    }
    try {
      this.drizzleSource?.stop();
    } catch {
      // Ignore already-stopped source
    }
    this.bedSource?.disconnect();
    this.drizzleSource?.disconnect();
    this.masterGain?.disconnect();
    if (this.ctx && this.ctx.state !== 'closed') {
      void this.ctx.close();
    }
    this.ctx = null;
    this.masterGain = null;
    this.drizzleFilter = null;
    this.drizzleGain = null;
    this.bedSource = null;
    this.drizzleSource = null;
  }
}
