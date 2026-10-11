// Synthesized applause (no audio asset): a crowd of short band-passed noise claps.
// Best-effort — browsers may block audio without a prior user gesture.
export function playApplause(durationSec = 2.6): void {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    ctx.resume().catch(() => {});
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.9, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSec);
    master.connect(ctx.destination);

    const clapLen = 0.05;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * clapLen), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);

    const claps = Math.floor(durationSec * 28);
    for (let i = 0; i < claps; i++) {
      // Dense in the middle of the window, thinning out at the ends.
      const t = ctx.currentTime + durationSec * (0.5 + (Math.random() - 0.5) * (Math.random() + Math.random()));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1200 + Math.random() * 2600;
      bp.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.value = 0.35 + Math.random() * 0.65;
      src.connect(bp).connect(g).connect(master);
      src.start(t);
    }
    setTimeout(() => { ctx.close().catch(() => {}); }, (durationSec + 0.5) * 1000);
  } catch { /* silent */ }
}
