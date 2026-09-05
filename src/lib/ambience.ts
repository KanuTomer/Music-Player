import type { AmbienceFilter, AmbienceProfile, AmbienceStem } from "./rooms.functions";

export type AmbienceStatus = "idle" | "loading" | "playing" | "partial" | "unavailable";

export const ambienceTiming = {
  pauseFadeMs: 300,
  resumeFadeMs: 250,
  defaultSwitchOutMs: 700,
  meanderSeconds: [12, 24] as const,
};

export const musicDuckRatio = 0.5;

export function effectiveMusicVolume(userVolume: number, ambienceActive: boolean) {
  const clamped = Math.min(1, Math.max(0, userVolume));
  return clamped * (ambienceActive ? musicDuckRatio : 1);
}

export function normalizeAmbienceFilter(filter: AmbienceFilter | undefined) {
  if (!filter) return null;
  return {
    highpass_hz: Math.min(2000, Math.max(10, filter.highpass_hz ?? 20)),
    lowpass_hz: Math.min(20000, Math.max(1000, filter.lowpass_hz ?? 20000)),
    peak_hz: Math.min(16000, Math.max(40, filter.peak_hz ?? 1000)),
    peak_gain_db: Math.min(12, Math.max(-12, filter.peak_gain_db ?? 0)),
    peak_q: Math.min(12, Math.max(0.1, filter.peak_q ?? 1)),
  };
}

export function ambienceLoadStatus(loaded: number, expected: number, playing: boolean) {
  if (loaded === 0) return "unavailable" as const;
  if (loaded < expected) return "partial" as const;
  return playing ? ("playing" as const) : ("idle" as const);
}

export function ambienceGain(level: number, maximum: number) {
  const normalized = Math.min(100, Math.max(0, level)) / 100;
  const amplified = Math.min(1, normalized * 2);
  return amplified * Math.min(1, Math.max(0, maximum));
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
  private manualEventSource: AudioBufferSourceNode | null = null;
  private cache = new Map<string, BufferedStem[]>();
  private currentKey: string | null = null;
  private previousKey: string | null = null;
  private onStatus: (status: AmbienceStatus) => void = () => undefined;
  private onEvent: () => void = () => undefined;
  private onEventPlaying: (playing: boolean) => void = () => undefined;
  private onEventReady: (ready: boolean) => void = () => undefined;

  private ensureContext() {
    if (this.context) return this.context;
    this.context = new AudioContext();
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -10;
    this.compressor.knee.value = 10;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.01;
    this.compressor.release.value = 0.25;
    this.master = this.context.createGain();
    this.master.gain.value = 0;
    this.compressor.connect(this.master).connect(this.context.destination);
    return this.context;
  }

  async resumeFromGesture() {
    const context = this.ensureContext();
    if (context.state === "suspended") await context.resume();
  }

  setCallbacks(
    onStatus: (status: AmbienceStatus) => void,
    onEvent: () => void,
    onEventPlaying: (playing: boolean) => void,
    onEventReady: (ready: boolean) => void,
  ) {
    this.onStatus = onStatus;
    this.onEvent = onEvent;
    this.onEventPlaying = onEventPlaying;
    this.onEventReady = onEventReady;
  }

  async setProfile(key: string, profile: AmbienceProfile | null) {
    const generation = ++this.generation;
    this.stopSources(this.profile?.fade_out_ms ?? ambienceTiming.defaultSwitchOutMs);
    this.profile = profile;
    this.previousKey = this.currentKey;
    this.currentKey = key;
    this.buffers = [];
    this.onEventReady(false);
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
    this.onEventReady(this.buffers.some(({ stem }) => stem.role === "event"));
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
    for (const buffered of this.buffers.filter(({ stem }) => stem.role === "event"))
      this.scheduleAutomaticEvent(buffered, generation);
    this.onStatus(ambienceLoadStatus(this.buffers.length, this.profile.stems.length, true));
  }

  private scheduleAutomaticEvent(buffered: BufferedStem, generation: number) {
    const stem = buffered.stem;
    const minimum = stem.event_min_seconds ?? 35;
    const maximum = stem.event_max_seconds ?? Math.max(minimum, 110);
    const schedule = () => {
      if (generation !== this.generation || !this.playing) return;
      const timer = window.setTimeout(
        () => {
          this.loopTimers.delete(timer);
          if (generation !== this.generation || !this.playing) return;
          this.playAutomaticEvent(buffered, generation);
          schedule();
        },
        randomEventDelayMs(minimum, maximum),
      );
      this.loopTimers.add(timer);
    };
    schedule();
  }

  private playAutomaticEvent(buffered: BufferedStem, generation: number) {
    const context = this.context;
    const destination = this.compressor;
    if (!context || !destination || generation !== this.generation || !this.playing) return;
    const { stem, buffer } = buffered;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const start = Math.min(stem.loop_start_seconds, Math.max(0, buffer.duration - 0.1));
    const end = Math.min(stem.loop_end_seconds ?? buffer.duration, buffer.duration);
    const duration = Math.max(0.1, end - start);
    source.buffer = buffer;
    source.connect(gain);
    this.connectStem(gain, stem.role, destination);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(stem.default_gain, now + Math.min(0.3, duration / 3));
    gain.gain.setValueAtTime(stem.default_gain, Math.max(now + 0.3, now + duration - 0.8));
    gain.gain.linearRampToValueAtTime(0, now + duration);
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
    source.start(now, start, duration);
    this.onEvent();
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
    let target = Math.min(stem.max_gain, Math.max(stem.min_gain, stem.default_gain));
    source.buffer = buffer;
    source.connect(gain);
    this.connectStem(gain, stem.role, destination);
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

  async triggerEvent() {
    const buffered = this.buffers.find(({ stem }) => stem.role === "event");
    if (!buffered || !this.context || !this.compressor || !this.profile) return false;
    await this.resumeFromGesture();
    if (this.manualEventSource) {
      const outgoing = this.manualEventSource;
      this.manualEventSource = null;
      this.sources.delete(outgoing);
      outgoing.onended = null;
      try {
        outgoing.stop();
      } catch {
        // The previous one-shot may have ended between the click and restart.
      }
      outgoing.disconnect();
    }
    const generation = this.generation;
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
    source.connect(gain);
    this.connectStem(gain, buffered.stem.role, this.compressor);
    if (!this.playing && this.master) {
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(
        ambienceGain(this.level, this.profile.max_master_gain),
        now + 0.12,
      );
    }
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(buffered.stem.default_gain, now + 0.3);
    gain.gain.setValueAtTime(
      buffered.stem.default_gain,
      Math.max(now + 0.3, now + eventDuration - 0.8),
    );
    gain.gain.linearRampToValueAtTime(0, now + eventDuration);
    this.manualEventSource = source;
    this.sources.add(source);
    this.onEventPlaying(true);
    this.onEvent();
    source.onended = () => {
      this.sources.delete(source);
      if (generation !== this.generation || this.manualEventSource !== source) return;
      this.manualEventSource = null;
      this.onEventPlaying(false);
      if (!this.playing) this.rampMaster(180);
    };
    source.start(now, eventStart, eventDuration);
    return true;
  }

  private stopSources(milliseconds: number) {
    for (const timer of this.loopTimers) window.clearTimeout(timer);
    this.loopTimers.clear();
    if (this.eventTimer != null) window.clearTimeout(this.eventTimer);
    this.eventTimer = null;
    this.manualEventSource = null;
    this.onEventPlaying(false);
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

  private connectStem(source: AudioNode, role: AmbienceStem["role"], destination: AudioNode) {
    const context = this.context;
    const settings = normalizeAmbienceFilter(this.profile?.audio_theme?.[role]);
    if (!context || !settings) {
      source.connect(destination);
      return;
    }
    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = settings.highpass_hz;
    highpass.Q.value = 0.7;
    const peak = context.createBiquadFilter();
    peak.type = "peaking";
    peak.frequency.value = settings.peak_hz;
    peak.gain.value = settings.peak_gain_db;
    peak.Q.value = settings.peak_q;
    const lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.frequency.value = settings.lowpass_hz;
    lowpass.Q.value = 0.7;
    source.connect(highpass).connect(peak).connect(lowpass).connect(destination);
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
