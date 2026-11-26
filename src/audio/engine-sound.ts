/**
 * Bunyi enjin motor kapcai dijana dengan Web Audio (tiada fail audio):
 * dua osilator gigi gergaji (asas + oktaf bawah) melalui penapis lulus rendah.
 * Pic dan kelantangan mengikut laju dan pendikit.
 */

/** Pic (Hz) bagi nisbah laju 0…1: melahu 38 Hz hingga 150 Hz. */
export function enginePitch(speedRatio: number, throttle: number): number {
  const r = Math.max(0, Math.min(1, speedRatio));
  return 38 + 112 * r + (throttle > 0.15 ? 10 : 0);
}

/** Kelantangan 0…1: rendah semasa melahu, naik dengan pendikit dan laju. */
export function engineGain(speedRatio: number, throttle: number): number {
  const r = Math.max(0, Math.min(1, speedRatio));
  return 0.05 + 0.08 * r + (throttle > 0.15 ? 0.04 : 0);
}

export interface EngineSound {
  /** Kemas kini setiap frame. `running` false = senyap (berjalan kaki atau bunyi dimatikan). */
  update(running: boolean, speedRatio: number, throttle: number): void;
  dispose(): void;
}

type AudioCtor = typeof AudioContext;

export function createEngineSound(): EngineSound | null {
  const Ctor: AudioCtor | undefined =
    globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!Ctor) return null;

  const ctx = new Ctor();
  const out = ctx.createGain();
  out.gain.value = 0;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;
  filter.Q.value = 4;
  const base = ctx.createOscillator();
  base.type = "sawtooth";
  const sub = ctx.createOscillator();
  sub.type = "square";
  const subGain = ctx.createGain();
  subGain.gain.value = 0.5;
  base.connect(filter);
  sub.connect(subGain).connect(filter);
  filter.connect(out).connect(ctx.destination);
  base.start();
  sub.start();

  return {
    update(running, speedRatio, throttle) {
      // Pelayar menahan audio sehingga ada gerak isyarat pengguna; cuba sambung semula.
      if (running && ctx.state === "suspended") void ctx.resume();
      const t = ctx.currentTime;
      const hz = enginePitch(speedRatio, throttle);
      base.frequency.setTargetAtTime(hz, t, 0.08);
      sub.frequency.setTargetAtTime(hz / 2, t, 0.08);
      filter.frequency.setTargetAtTime(400 + hz * 6, t, 0.1);
      out.gain.setTargetAtTime(running ? engineGain(speedRatio, throttle) : 0, t, 0.15);
    },
    dispose() {
      base.stop();
      sub.stop();
      void ctx.close();
    },
  };
}
