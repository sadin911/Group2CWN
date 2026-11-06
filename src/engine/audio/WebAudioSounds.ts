/**
 * WebAudioSounds.ts
 * High-fidelity, zero-latency procedural Web Audio sound synthesizer for Pokémon TCG Playmat V3.
 * Requires 0 external audio files; generates pristine haptic audio natively.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Card Draw / Card Slide (Subtle paper swoosh)
   */
  public playCardDraw() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Filtered white noise burst simulating sliding paper
      const bufferSize = Math.floor(ctx.sampleRate * 0.12);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(700, now + 0.12);
      filter.Q.setValueAtTime(1.8, now);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.12);
    } catch {
      // Ignore audio context errors
    }
  }

  /**
   * Card Snap / Table Slap (Crisp mechanical placement)
   */
  public playCardSnap() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  /**
   * Deck Shuffle / Riffle Cascade (Authentic multi-card fluttering sequence + final bridge tap)
   */
  public playDeckShuffle() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const startTime = ctx.currentTime;
      const numFlutters = 9;
      const flutterDuration = 0.04;
      const stagger = 0.038;

      // 1. Rapid interleaved card fluttering snaps
      for (let i = 0; i < numFlutters; i++) {
        const time = startTime + i * stagger;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Alternating pitch between left and right packet cards
        const baseFreq = i % 2 === 0 ? 520 + i * 18 : 460 + i * 15;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, time);
        osc.frequency.exponentialRampToValueAtTime(120, time + flutterDuration);

        gain.gain.setValueAtTime(0.01, time);
        gain.gain.linearRampToValueAtTime(0.18, time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, time + flutterDuration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + flutterDuration);
      }

      // 2. Cascade Waterfall Bridge & Deck Snap
      const snapTime = startTime + numFlutters * stagger + 0.08;
      const snapOsc = ctx.createOscillator();
      const snapGain = ctx.createGain();

      snapOsc.type = 'sine';
      snapOsc.frequency.setValueAtTime(360, snapTime);
      snapOsc.frequency.exponentialRampToValueAtTime(60, snapTime + 0.1);

      snapGain.gain.setValueAtTime(0.4, snapTime);
      snapGain.gain.exponentialRampToValueAtTime(0.001, snapTime + 0.1);

      snapOsc.connect(snapGain);
      snapGain.connect(ctx.destination);

      snapOsc.start(snapTime);
      snapOsc.stop(snapTime + 0.1);
    } catch {}
  }

  /**
   * Energy Attachment (Harmonic power-up chime)
   */
  public playEnergyAttach() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.035);

        gain.gain.setValueAtTime(0.01, now + idx * 0.035);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.035 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.035 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.035);
        osc.stop(now + idx * 0.035 + 0.28);
      });
    } catch {}
  }

  /**
   * Attack Strike / Damage Blast (Impact thump + punch)
   */
  public playAttackStrike() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /**
   * Coin Flip (High metallic ringing spin)
   */
  public playCoinFlip() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, now);
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.45);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch {}
  }

  /**
   * Dice Roll (Rapid wood/marble clicks)
   */
  public playDiceRoll() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const clicks = 5;
      for (let i = 0; i < clicks; i++) {
        const timeOffset = i * 0.05 + Math.random() * 0.02;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(600 + Math.random() * 400, now + timeOffset);

        gain.gain.setValueAtTime(0.12, now + timeOffset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.03);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.035);
      }
    } catch {}
  }

  /**
   * Prize Card Claim (Celebratory arpeggio)
   */
  public playPrizeClaim() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [587.33, 739.99, 880.0, 1174.66]; // D5, F#5, A5, D6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.01, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.22, now + idx * 0.07 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.35);
      });
    } catch {}
  }

  /**
   * Undo Action (Soft reverse pitch slide)
   */
  public playUndo() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }
}

export const sounds = new SoundEngine();
