/**
 * Procedural ambience engine (Web Audio API).
 * Every room always has a living sound bed, independent of the music player.
 * Layers are synthesised, so nothing needs to be downloaded or buffered.
 */

type Layer = {
  nodes: AudioNode[];
  timers: number[];
  gain: GainNode;
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let layers: Layer[] = [];

function audioContext(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
  }
  return ctx;
}

function noiseBuffer(c: AudioContext): AudioBuffer {
  if (noise) return noise;
  const len = c.sampleRate * 4;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  noise = buf;
  return buf;
}

function noiseSource(c: AudioContext) {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  return src;
}

function filteredNoise(
  c: AudioContext,
  out: AudioNode,
  opts: { type: BiquadFilterType; freq: number; q?: number; gain: number },
): Layer {
  const src = noiseSource(c);
  const filter = c.createBiquadFilter();
  filter.type = opts.type;
  filter.frequency.value = opts.freq;
  filter.Q.value = opts.q ?? 1;
  const gain = c.createGain();
  gain.gain.value = opts.gain;
  src.connect(filter).connect(gain).connect(out);
  src.start();
  return { nodes: [src, filter, gain], timers: [], gain };
}

/** slow amplitude wobble, e.g. a ceiling fan or passing wind */
function wobble(c: AudioContext, target: GainNode, rate: number, depth: number) {
  const lfo = c.createOscillator();
  lfo.frequency.value = rate;
  const amt = c.createGain();
  amt.gain.value = depth;
  lfo.connect(amt).connect(target.gain);
  lfo.start();
  return [lfo, amt];
}

function blip(
  c: AudioContext,
  out: AudioNode,
  opts: {
    freq: number;
    dur: number;
    type?: OscillatorType;
    gain?: number;
    slideTo?: number;
  },
) {
  const osc = c.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.value = opts.freq;
  const g = c.createGain();
  const now = c.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(opts.gain ?? 0.12, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);
  if (opts.slideTo) {
    osc.frequency.exponentialRampToValueAtTime(opts.slideTo, now + opts.dur);
  }
  osc.connect(g).connect(out);
  osc.start(now);
  osc.stop(now + opts.dur + 0.05);
}

function burst(
  c: AudioContext,
  out: AudioNode,
  opts: { freq: number; q: number; dur: number; gain: number },
) {
  const src = noiseSource(c);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = opts.freq;
  f.Q.value = opts.q;
  const g = c.createGain();
  const now = c.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(opts.gain, now + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, now + opts.dur);
  src.connect(f).connect(g).connect(out);
  src.start(now);
  src.stop(now + opts.dur + 0.05);
}

function every(ms: number, jitter: number, fn: () => void): number {
  return window.setInterval(
    () => {
      window.setTimeout(fn, Math.random() * jitter);
    },
    ms,
  ) as unknown as number;
}

function buildLayer(key: string, c: AudioContext, out: GainNode): Layer {
  switch (key) {
    case "train": {
      const l = filteredNoise(c, out, { type: "lowpass", freq: 420, gain: 0.5 });
      l.nodes.push(...wobble(c, l.gain, 2.4, 0.16));
      l.timers.push(
        every(9000, 5000, () => burst(c, out, { freq: 180, q: 1.5, dur: 0.6, gain: 0.18 })),
      );
      return l;
    }
    case "engine": {
      const l = filteredNoise(c, out, { type: "lowpass", freq: 240, gain: 0.55 });
      l.nodes.push(...wobble(c, l.gain, 0.4, 0.1));
      return l;
    }
    case "wind":
      return filteredNoise(c, out, { type: "bandpass", freq: 620, q: 0.7, gain: 0.18 });
    case "rain":
      return filteredNoise(c, out, { type: "highpass", freq: 1400, gain: 0.26 });
    case "night":
      return filteredNoise(c, out, { type: "lowpass", freq: 300, gain: 0.22 });
    case "fire": {
      const l = filteredNoise(c, out, { type: "bandpass", freq: 900, q: 0.6, gain: 0.16 });
      l.timers.push(
        every(2600, 1800, () => burst(c, out, { freq: 1600, q: 2, dur: 0.14, gain: 0.1 })),
      );
      return l;
    }
    case "hum": {
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 100;
      const g = c.createGain();
      g.gain.value = 0.05;
      osc.connect(g).connect(out);
      osc.start();
      return { nodes: [osc, g], timers: [], gain: g };
    }
    case "fan": {
      const l = filteredNoise(c, out, { type: "lowpass", freq: 520, gain: 0.2 });
      l.nodes.push(...wobble(c, l.gain, 3.1, 0.14));
      return l;
    }
    case "chatter":
    case "crowd":
    case "street": {
      const base = key === "crowd" ? 0.24 : 0.15;
      const l = filteredNoise(c, out, { type: "bandpass", freq: 780, q: 0.8, gain: base });
      l.nodes.push(...wobble(c, l.gain, 0.7, base * 0.7));
      if (key === "street") {
        l.timers.push(
          every(11000, 7000, () =>
            blip(c, out, { freq: 420, dur: 0.5, type: "square", gain: 0.05, slideTo: 300 }),
          ),
        );
      }
      return l;
    }
    case "paper": {
      const l = filteredNoise(c, out, { type: "highpass", freq: 2600, gain: 0.04 });
      l.timers.push(
        every(6500, 4000, () => burst(c, out, { freq: 3200, q: 1.4, dur: 0.2, gain: 0.07 })),
      );
      return l;
    }
    case "snip": {
      const g = c.createGain();
      g.gain.value = 1;
      g.connect(out);
      const timers = [
        every(4200, 2500, () => {
          burst(c, g, { freq: 5200, q: 6, dur: 0.06, gain: 0.08 });
          window.setTimeout(
            () => burst(c, g, { freq: 4600, q: 6, dur: 0.06, gain: 0.07 }),
            140,
          );
        }),
      ];
      return { nodes: [g], timers, gain: g };
    }
    case "kettle": {
      const g = c.createGain();
      g.gain.value = 1;
      g.connect(out);
      return {
        nodes: [g],
        timers: [
          every(13000, 8000, () =>
            blip(c, g, { freq: 1800, dur: 1.1, type: "triangle", gain: 0.05, slideTo: 2400 }),
          ),
        ],
        gain: g,
      };
    }
    case "dhol": {
      const g = c.createGain();
      g.gain.value = 1;
      g.connect(out);
      const pattern = () => {
        [0, 240, 480, 900].forEach((t, i) =>
          window.setTimeout(
            () =>
              blip(c, g, {
                freq: i % 2 === 0 ? 110 : 180,
                dur: 0.22,
                type: "sine",
                gain: 0.16,
                slideTo: 70,
              }),
            t,
          ),
        );
      };
      return { nodes: [g], timers: [every(1600, 100, pattern)], gain: g };
    }
    case "truck": {
      const g = c.createGain();
      g.gain.value = 1;
      g.connect(out);
      return {
        nodes: [g],
        timers: [
          every(15000, 9000, () =>
            blip(c, g, { freq: 300, dur: 0.9, type: "sawtooth", gain: 0.06, slideTo: 200 }),
          ),
        ],
        gain: g,
      };
    }
    case "sizzle": {
      const l = filteredNoise(c, out, { type: "bandpass", freq: 2600, q: 0.5, gain: 0.09 });
      l.nodes.push(...wobble(c, l.gain, 1.3, 0.05));
      l.timers.push(
        every(5200, 3800, () => burst(c, out, { freq: 3400, q: 1.2, dur: 0.5, gain: 0.09 })),
      );
      return l;
    }
    case "horns": {
      const g = c.createGain();
      g.gain.value = 1;
      g.connect(out);
      return {
        nodes: [g],
        timers: [
          every(9000, 7000, () => {
            const base = 380 + Math.random() * 160;
            blip(c, g, { freq: base, dur: 0.35, type: "square", gain: 0.05 });
            blip(c, g, { freq: base * 1.25, dur: 0.35, type: "square", gain: 0.035 });
          }),
        ],
        gain: g,
      };
    }
    case "clatter": {
      const g = c.createGain();
      g.gain.value = 1;
      g.connect(out);
      return {
        nodes: [g],
        timers: [
          every(4000, 3000, () => {
            burst(c, g, { freq: 2400 + Math.random() * 1800, q: 8, dur: 0.09, gain: 0.07 });
          }),
        ],
        gain: g,
      };
    }
    case "keyboard": {
      const g = c.createGain();
      g.gain.value = 1;
      g.connect(out);
      const runOfKeys = () => {
        const n = 3 + Math.floor(Math.random() * 7);
        for (let i = 0; i < n; i++) {
          window.setTimeout(
            () => burst(c, g, { freq: 2800 + Math.random() * 1200, q: 5, dur: 0.035, gain: 0.05 }),
            i * (70 + Math.random() * 90),
          );
        }
      };
      return { nodes: [g], timers: [every(2200, 1600, runOfKeys)], gain: g };
    }
    case "phone": {
      const g = c.createGain();
      g.gain.value = 1;
      g.connect(out);
      const ring = () => {
        for (let i = 0; i < 2; i++) {
          window.setTimeout(() => {
            blip(c, g, { freq: 1180, dur: 0.4, type: "sine", gain: 0.035 });
            blip(c, g, { freq: 1480, dur: 0.4, type: "sine", gain: 0.03 });
          }, i * 900);
        }
      };
      return { nodes: [g], timers: [every(26000, 18000, ring)], gain: g };
    }
    case "hammer": {
      const g = c.createGain();
      g.gain.value = 1;
      g.connect(out);
      const strikes = () => {
        const n = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < n; i++) {
          window.setTimeout(() => {
            burst(c, g, { freq: 1700, q: 3, dur: 0.09, gain: 0.11 });
            blip(c, g, { freq: 160, dur: 0.12, type: "sine", gain: 0.07, slideTo: 90 });
          }, i * (420 + Math.random() * 180));
        }
      };
      return { nodes: [g], timers: [every(5200, 3400, strikes)], gain: g };
    }
    case "crt": {
      const l = filteredNoise(c, out, { type: "highpass", freq: 5200, gain: 0.05 });
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 15700;
      const g = c.createGain();
      g.gain.value = 0.012;
      osc.connect(g).connect(out);
      osc.start();
      l.nodes.push(osc, g);
      return l;
    }
    case "announce": {
      const g = c.createGain();
      g.gain.value = 1;
      g.connect(out);
      const announce = () => {
        blip(c, g, { freq: 880, dur: 0.5, type: "sine", gain: 0.05 });
        window.setTimeout(
          () => blip(c, g, { freq: 660, dur: 0.7, type: "sine", gain: 0.045 }),
          520,
        );
        // muffled PA voice: bandlimited noise pulses
        for (let i = 0; i < 6; i++) {
          window.setTimeout(
            () => burst(c, g, { freq: 700, q: 2.2, dur: 0.28, gain: 0.05 }),
            1500 + i * (340 + Math.random() * 200),
          );
        }
      };
      return { nodes: [g], timers: [every(24000, 14000, announce)], gain: g };
    }
    case "stamp": {
      const g = c.createGain();
      g.gain.value = 1;
      g.connect(out);
      return {
        nodes: [g],
        timers: [
          every(8000, 6000, () => {
            blip(c, g, { freq: 220, dur: 0.1, type: "sine", gain: 0.09, slideTo: 110 });
            burst(c, g, { freq: 900, q: 2, dur: 0.08, gain: 0.06 });
          }),
        ],
        gain: g,
      };
    }
    case "cicada": {
      const l = filteredNoise(c, out, { type: "bandpass", freq: 4200, q: 6, gain: 0.05 });
      l.nodes.push(...wobble(c, l.gain, 8, 0.03));
      return l;
    }
    default:
      return filteredNoise(c, out, { type: "lowpass", freq: 700, gain: 0.12 });
  }
}


export function startAmbience(keys: string[], volume: number) {
  const c = audioContext();
  void c.resume();
  stopAmbience();
  layers = keys.map((k) => buildLayer(k, c, master!));
  setAmbienceVolume(volume);
}

export function stopAmbience() {
  layers.forEach((l) => {
    l.timers.forEach((t) => window.clearInterval(t));
    l.nodes.forEach((n) => {
      try {
        (n as OscillatorNode).stop?.();
      } catch {
        /* already stopped */
      }
      n.disconnect();
    });
  });
  layers = [];
}

export function setAmbienceVolume(volume: number) {
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.6);
}

/** One-off scene gag (horn, dhol hit, stamp thud…). */
export function playGag(kind: string) {
  const c = audioContext();
  void c.resume();
  const out = master ?? c.destination;
  if (!master) return;
  switch (kind) {
    case "horn":
      blip(c, out, { freq: 320, dur: 1.1, type: "sawtooth", gain: 0.22, slideTo: 240 });
      blip(c, out, { freq: 400, dur: 1.1, type: "square", gain: 0.12, slideTo: 300 });
      break;
    case "bell":
      blip(c, out, { freq: 1200, dur: 1.8, type: "sine", gain: 0.2, slideTo: 900 });
      break;
    case "thud":
      blip(c, out, { freq: 140, dur: 0.35, type: "sine", gain: 0.3, slideTo: 60 });
      break;
    default:
      burst(c, out, { freq: 2200, q: 3, dur: 0.3, gain: 0.22 });
  }
}
