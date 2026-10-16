// Sound, synthesised with WebAudio rather than loaded from files.
//
// The whole game ships as a few JS files so it can be dropped on any static
// host. Shipping .mp3s for a kick and a whistle would multiply the download
// size for three short noises that an oscillator can make convincingly.

let ctx = null;

function audio() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  // Browsers start suspended until a user gesture; the first click resumes it.
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq, dur, type = 'sine', gain = 0.2, sweepTo = null, delay = 0 }) {
  const ac = audio();
  if (!ac) return;

  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const amp = ac.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);

  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

// Filtered noise — used for the thump of a boot on leather and for the crowd.
function noise({ dur, gain = 0.15, filterFreq = 1200, q = 1, delay = 0 }) {
  const ac = audio();
  if (!ac) return;

  const frames = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    // Fade the noise out so it doesn't click at the end.
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  }

  const src = ac.createBufferSource();
  src.buffer = buffer;

  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = q;

  const amp = ac.createGain();
  amp.gain.value = gain;

  src.connect(filter).connect(amp).connect(ac.destination);
  src.start(ac.currentTime + delay);
}

export const sfx = {
  // Boot on the ball.
  kick() {
    noise({ dur: 0.12, gain: 0.35, filterFreq: 900, q: 0.8 });
    tone({ freq: 160, dur: 0.09, type: 'triangle', gain: 0.25, sweepTo: 70 });
  },

  goal() {
    // A rising horn, then the crowd.
    tone({ freq: 392, dur: 0.18, type: 'square', gain: 0.16 });
    tone({ freq: 523, dur: 0.22, type: 'square', gain: 0.16, delay: 0.14 });
    tone({ freq: 659, dur: 0.5, type: 'square', gain: 0.18, delay: 0.28 });
    noise({ dur: 1.1, gain: 0.14, filterFreq: 700, q: 0.4, delay: 0.2 });
  },

  save() {
    noise({ dur: 0.1, gain: 0.3, filterFreq: 2200, q: 1.4 });
    tone({ freq: 220, dur: 0.2, type: 'sawtooth', gain: 0.14, sweepTo: 140 });
  },

  miss() {
    tone({ freq: 300, dur: 0.35, type: 'sine', gain: 0.14, sweepTo: 130 });
  },

  woodwork() {
    tone({ freq: 880, dur: 0.5, type: 'triangle', gain: 0.22, sweepTo: 420 });
    noise({ dur: 0.2, gain: 0.2, filterFreq: 3000, q: 2 });
  },

  whistle() {
    tone({ freq: 2100, dur: 0.28, type: 'sine', gain: 0.1 });
    tone({ freq: 2600, dur: 0.28, type: 'sine', gain: 0.08, delay: 0.04 });
  },

  // The meter clicking as it fills, so power has a feel without looking at it.
  tick() {
    tone({ freq: 1200, dur: 0.03, type: 'square', gain: 0.05 });
  },
};

// Browsers block audio until the user interacts. Call this from the first click.
export function unlockAudio() {
  audio();
}
