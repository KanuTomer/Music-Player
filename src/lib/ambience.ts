import type { AmbienceProfile, AmbienceStem } from "./rooms.functions";

export type AmbienceStatus = "idle" | "loading" | "playing" | "partial" | "unavailable";

export const ambienceTiming = {
  pauseFadeMs: 300,
  resumeFadeMs: 250,
  defaultSwitchOutMs: 700,
  firstEventSeconds: [20, 50] as const,
  laterEventSeconds: [35, 110] as const,
  meanderSeconds: [12, 24] as const,
};

export function ambienceLoadStatus(loaded: number, expected: number, playing: boolean) {
  if (loaded === 0) return "unavailable" as const;
  if (loaded < expected) return "partial" as const;
  return playing ? ("playing" as const) : ("idle" as const);
}

export function ambienceGain(level: number, maximum: number) {
  const normalized = Math.min(100, Math.max(0, level)) / 100;
  return normalized * normalized * Math.min(1, Math.max(0, maximum));
}

export function randomBetween(minimum: number, maximum: number, random = Math.random) {
  return minimum + (maximum - minimum) * random();
}

export function randomEventDelayMs(
  minimumSeconds: number,
  maximumSeconds: number,
  random = Math.random,
) {
  return Math.round(randomBetween(minimumSeconds, maximumSeconds, random) * 1000);
}

export function equalPowerFadeCurve(peak: number, fadeIn: boolean, points = 32) {
  const curve = new Float32Array(points);
  for (let index = 0; index < points; index += 1) {
    const phase = (index / (points - 1)) * (Math.PI / 2);
    curve[index] = peak * (fadeIn ? Math.sin(phase) : Math.cos(phase));
  }
  return curve;
}

type BufferedStem = { stem: AmbienceStem; buffer: AudioBuffer };

export class AmbienceEngine {
  private context: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private master: GainNode | null = null;
  private generation = 0;
  private profile: AmbienceProfile | null = null;
  private buffers: BufferedStem[] = [];
  private playing = false;
  private level = 50;
  private sources = new Set<AudioBufferSourceNode>();
  private loopTimers = new Set<number>();
  private eventTimer: number | null = null;
  private cache = new Map<string, BufferedStem[]>();
  private currentKey: string | null = null;
  private previousKey: string | null = null;
  private onStatus: (status: AmbienceStatus) => void = () => undefined;
  private onEvent: () => void = () => undefined;

  private ensureContext() {
    if (this.context) return this.context;
    this.context = new AudioContext();
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 12;
    this.compressor.ratio.value = 4;
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.compressor.connect(this.master).connect(this.context.destination);
    return this.context;
  }

  async resumeFromGesture() {
    const context = this.ensureContext();
    if (context.state === "suspended") await context.resume();
  }

  setCallbacks(onStatus: (status: AmbienceStatus) => void, onEvent: () => void) {
    this.onStatus = onStatus;
    this.onEvent = onEvent;
  }

  async setProfile(key: string, profile: AmbienceProfile | null) {
    const generation = ++this.generation;
    this.stopSources(this.profile?.fade_out_ms ?? ambienceTiming.defaultSwitchOutMs);
    this.profile = profile;
    this.previousKey = this.currentKey;
    this.currentKey = key;
    this.buffers = [];
    if (!profile) {
      this.onStatus("unavailable");
      return;
    }
    this.onStatus("loading");
    const cached = this.cache.get(key);
    if (cached) {
      this.buffers = cached;
    } else {
      const context = this.ensureContext();
      const settled = await Promise.allSettled(
        profile.stems.map(async (stem) => {
          const response = await fetch(stem.url);
          if (!response.ok) throw new Error(`Ambience asset ${response.status}`);
          return { stem, buffer: await context.decodeAudioData(await response.arrayBuffer()) };
        }),
      );
      if (generation !== this.generation) return;
      this.buffers = settled.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      this.cache.set(key, this.buffers);
      for (const cacheKey of [...this.cache.keys()]) {
        if (cacheKey !== this.currentKey && cacheKey !== this.previousKey)
          this.cache.delete(cacheKey);
      }
    }
    if (generation !== this.generation) return;
    const status = ambienceLoadStatus(this.buffers.length, profile.stems.length, false);
    this.onStatus(status);
    if (status === "unavailable") return;
    if (this.playing) this.startSources(profile.fade_in_ms);
  }

  setLevel(level: number) {
    this.level = Math.min(100, Math.max(0, level));
    this.rampMaster(this.playing ? (this.profile?.fade_in_ms ?? 250) : 0);
  }

  setPlaying(playing: boolean) {
    if (this.playing === playing) return;
    this.playing = playing;
    if (playing) this.startSources(ambienceTiming.resumeFadeMs);
    else this.stopSources(ambienceTiming.pauseFadeMs);
  }

  private rampMaster(milliseconds: number) {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    const value =
      this.playing && this.profile ? ambienceGain(this.level, this.profile.max_master_gain) : 0;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(value, now + milliseconds / 1000);
  }

  private startSources(fadeInMilliseconds: number) {
    if (!this.context || !this.compressor || !this.profile || !this.buffers.length || !this.playing)
      return;
    this.stopSources(0);
    this.playing = true;
    this.rampMaster(fadeInMilliseconds);
    const generation = this.generation;
    for (const buffered of this.buffers.filter(({ stem }) => stem.role !== "event")) {
      this.scheduleLoop(buffered, this.context.currentTime + 0.05, generation);
    }
    const event = this.buffers.find(({ stem }) => stem.role === "event");
    if (event) this.scheduleEvent(event, generation, true);
    this.onStatus(ambienceLoadStatus(this.buffers.length, this.profile.stems.length, true));
  }

  private scheduleLoop(buffered: BufferedStem, when: number, generation: number) {
    const context = this.context;
    const destination = this.compressor;
    if (!context || !destination || generation !== this.generation || !this.playing) return;
    const { stem, buffer } = buffered;
    const loopStart = Math.min(stem.loop_start_seconds, Math.max(0, buffer.duration - 0.1));
    const loopEnd = Math.min(stem.loop_end_seconds ?? buffer.duration, buffer.duration);
    const loopDuration = Math.max(0.1, loopEnd - loopStart);
    const crossfade = Math.min(loopDuration / 3, stem.crossfade_ms / 1000);
    const source = context.createBufferSource();
    const gain = context.createGain();
    let target = randomBetween(stem.min_gain, stem.max_gain);
    source.buffer = buffer;
    source.connect(gain).connect(destination);
    gain.gain.setValueCurveAtTime(equalPowerFadeCurve(target, true), when, crossfade);
    const fadeOutAt = Math.max(when + crossfade, when + loopDuration - crossfade);
    let meanderAt = when + crossfade + randomBetween(...ambienceTiming.meanderSeconds);
    while (meanderAt < fadeOutAt) {
      target = randomBetween(stem.min_gain, stem.max_gain);
      gain.gain.linearRampToValueAtTime(target, meanderAt);
      meanderAt += randomBetween(...ambienceTiming.meanderSeconds);
    }
    gain.gain.setValueCurveAtTime(equalPowerFadeCurve(target, false), fadeOutAt, crossfade);
    source.start(when, loopStart, loopDuration);
    source.stop(when + loopDuration + 0.05);
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
    const nextAt = when + loopDuration - crossfade;
    const timer = window.setTimeout(
      () => {
        this.loopTimers.delete(timer);
        this.scheduleLoop(buffered, nextAt, generation);
      },
      Math.max(0, (nextAt - context.currentTime - 0.4) * 1000),
    );
    this.loopTimers.add(timer);
  }

  private scheduleEvent(buffered: BufferedStem, generation: number, first: boolean) {
    const minimum = first
      ? ambienceTiming.firstEventSeconds[0]
      : (buffered.stem.event_min_seconds ?? ambienceTiming.laterEventSeconds[0]);
    const maximum = first
      ? ambienceTiming.firstEventSeconds[1]
      : (buffered.stem.event_max_seconds ?? ambienceTiming.laterEventSeconds[1]);
    this.eventTimer = window.setTimeout(
      () => {
        if (!this.context || !this.compressor || !this.playing || generation !== this.generation)
          return;
        const source = this.context.createBufferSource();
        const gain = this.context.createGain();
        const now = this.context.currentTime;
        const eventStart = Math.min(
          buffered.stem.loop_start_seconds,
          Math.max(0, buffered.buffer.duration - 0.1),
        );
        const eventEnd = Math.min(
          buffered.stem.loop_end_seconds ?? buffered.buffer.duration,
          buffered.buffer.duration,
        );
        const eventDuration = Math.max(0.1, eventEnd - eventStart);
        source.buffer = buffered.buffer;
        source.connect(gain).connect(this.compressor);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(buffered.stem.default_gain, now + 0.3);
        gain.gain.setValueAtTime(
          buffered.stem.default_gain,
          Math.max(now + 0.3, now + eventDuration - 0.8),
        );
        gain.gain.linearRampToValueAtTime(0, now + eventDuration);
        source.start(now, eventStart, eventDuration);
        this.sources.add(source);
        source.onended = () => this.sources.delete(source);
        this.onEvent();
        this.scheduleEvent(buffered, generation, false);
      },
      randomEventDelayMs(minimum, maximum),
    );
  }

  private stopSources(milliseconds: number) {
    for (const timer of this.loopTimers) window.clearTimeout(timer);
    this.loopTimers.clear();
    if (this.eventTimer != null) window.clearTimeout(this.eventTimer);
    this.eventTimer = null;
    if (this.context && this.master) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(0, now + milliseconds / 1000);
    }
    const sources = [...this.sources];
    window.setTimeout(() => {
      for (const source of sources) {
        try {
          source.stop();
        } catch {
          /* already stopped */
        }
        source.disconnect();
        this.sources.delete(source);
      }
    }, milliseconds + 40);
  }

  destroy() {
    this.generation += 1;
    this.playing = false;
    this.stopSources(0);
    void this.context?.close();
    this.context = null;
    this.cache.clear();
  }
}
