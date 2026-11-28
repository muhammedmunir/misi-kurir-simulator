export function createRainSound(ctx: AudioContext) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1350;
  filter.Q.value = 0.45;
  const out = ctx.createGain();
  out.gain.value = 0;
  noise.connect(filter).connect(out).connect(ctx.destination);
  noise.start();

  let wasAudible = false;
  return {
    update(audible: boolean) {
      if (audible === wasAudible) return;
      wasAudible = audible;
      out.gain.setTargetAtTime(audible ? 0.19 : 0, ctx.currentTime, 0.28);
    },
    dispose() {
      noise.stop();
    },
  };
}
