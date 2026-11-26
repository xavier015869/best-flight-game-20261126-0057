// Sound, synthesized live with WebAudio — no audio files, no network. The
// engine is a low sawtooth hum whose pitch follows the throttle, the ring
// chime is a bright two-note ping, and a crash is a filtered noise thud.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let engineFilter = null;
  let muted = false;
  let running = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 62;
      engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      running = true;
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  return {
    // Call on the first user gesture; browsers block audio before that.
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    setMuted(m) {
      muted = m;
      if (engineGain) engineGain.gain.value = m ? 0 : 0.05;
    },
    // Continuous engine note: pitch and loudness follow speed and throttle.
    engine(throttle, speed01) {
      if (!ctx || muted || !running) return;
      const target = 0.028 + throttle * 0.035 + speed01 * 0.012;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(54 + throttle * 46 + speed01 * 22, ctx.currentTime, 0.12);
      engineFilter.frequency.setTargetAtTime(260 + throttle * 500, ctx.currentTime, 0.15);
    },
    ring() {
      tone(880, 0.28, 'sine', 0.16);
      tone(1318, 0.4, 'sine', 0.12, 0.07);
    },
    click() {
      tone(520, 0.08, 'square', 0.06);
    },
    crash() {
      if (!ctx || muted) return;
      const dur = 0.5;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      const g = ctx.createGain();
      g.gain.value = 0.35;
      src.connect(filter);
      filter.connect(g);
      g.connect(ctx.destination);
      src.start();
      tone(70, 0.4, 'sine', 0.25);
    },
    fanfare() {
      tone(523, 0.22, 'triangle', 0.14);
      tone(659, 0.22, 'triangle', 0.14, 0.12);
      tone(784, 0.5, 'triangle', 0.16, 0.24);
    },
  };
}
