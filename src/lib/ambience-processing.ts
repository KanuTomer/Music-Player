export type AmbienceRole = "base" | "texture" | "event";

export const ambienceProcessing = {
  sampleRate: 32000,
  maxSourceBytes: 64 * 1024 * 1024,
  maxPlaybackBytes: 12 * 1024 * 1024,
  maxDurationSeconds: { base: 90, texture: 60, event: 15 } as Record<AmbienceRole, number>,
};

export type DecodedWav = { samples: Float32Array; sampleRate: number; durationSeconds: number };
export type PreparedAmbience = {
  blob: Blob;
  durationSeconds: number;
  selectedStartSeconds: number;
  selectedDurationSeconds: number;
};

function fourcc(view: DataView, offset: number) {
  return String.fromCharCode(...[0, 1, 2, 3].map((index) => view.getUint8(offset + index)));
}

export function decodePcm16Wav(buffer: ArrayBuffer): DecodedWav {
  const view = new DataView(buffer);
  if (view.byteLength < 44 || fourcc(view, 0) !== "RIFF" || fourcc(view, 8) !== "WAVE")
    throw new Error("Choose a PCM WAV file.");
  let offset = 12;
  let channels = 0;
  let sampleRate = 0;
  let dataOffset = 0;
  let dataLength = 0;
  while (offset + 8 <= view.byteLength) {
    const id = fourcc(view, offset);
    const length = view.getUint32(offset + 4, true);
    const start = offset + 8;
    if (start + length > view.byteLength) throw new Error("The WAV file is truncated.");
    if (id === "fmt ") {
      if (
        length < 16 ||
        view.getUint16(start, true) !== 1 ||
        view.getUint16(start + 14, true) !== 16
      )
        throw new Error("Only 16-bit PCM WAV files are supported.");
      channels = view.getUint16(start + 2, true);
      sampleRate = view.getUint32(start + 4, true);
    }
    if (id === "data") {
      dataOffset = start;
      dataLength = length;
    }
    offset = start + length + (length % 2);
  }
  if (!channels || !sampleRate || !dataLength || dataLength % (channels * 2))
    throw new Error("The WAV file has no usable audio data.");
  const frames = dataLength / (channels * 2);
  const samples = new Float32Array(frames);
  for (let frame = 0; frame < frames; frame += 1) {
    let total = 0;
    for (let channel = 0; channel < channels; channel += 1)
      total += view.getInt16(dataOffset + (frame * channels + channel) * 2, true) / 32768;
    samples[frame] = total / channels;
  }
  return { samples, sampleRate, durationSeconds: frames / sampleRate };
}

export function suggestedWindow(decoded: DecodedWav, role: AmbienceRole) {
  const duration = Math.min(decoded.durationSeconds, ambienceProcessing.maxDurationSeconds[role]);
  if (decoded.durationSeconds <= duration) return { startSeconds: 0, durationSeconds: duration };
  if (role !== "event")
    return { startSeconds: (decoded.durationSeconds - duration) / 2, durationSeconds: duration };
  const windowFrames = Math.round(duration * decoded.sampleRate);
  let bestStart = 0;
  let bestEnergy = -1;
  for (let start = 0; start + windowFrames <= decoded.samples.length; start += decoded.sampleRate) {
    let energy = 0;
    for (let i = start; i < start + windowFrames; i += 32) energy += (decoded.samples[i] ?? 0) ** 2;
    if (energy > bestEnergy) {
      bestEnergy = energy;
      bestStart = start;
    }
  }
  return { startSeconds: bestStart / decoded.sampleRate, durationSeconds: duration };
}

function resample(samples: Float32Array, fromRate: number) {
  const length = Math.floor((samples.length * ambienceProcessing.sampleRate) / fromRate);
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const position = (i * fromRate) / ambienceProcessing.sampleRate;
    const left = Math.floor(position);
    const fraction = position - left;
    output[i] =
      (samples[left] ?? 0) * (1 - fraction) + (samples[left + 1] ?? samples[left] ?? 0) * fraction;
  }
  return output;
}

function fadeAndNormalize(samples: Float32Array, role: AmbienceRole) {
  const output = samples.slice();
  const fadeIn = Math.min(
    output.length / 2,
    Math.round(ambienceProcessing.sampleRate * (role === "event" ? 0.3 : 1)),
  );
  const fadeOut = Math.min(
    output.length / 2,
    Math.round(ambienceProcessing.sampleRate * (role === "event" ? 0.8 : 1)),
  );
  for (let i = 0; i < fadeIn; i += 1) output[i] = (output[i] ?? 0) * (i / fadeIn);
  for (let i = 0; i < fadeOut; i += 1) {
    const index = output.length - 1 - i;
    output[index] = (output[index] ?? 0) * (i / fadeOut);
  }
  let peak = 0;
  for (const sample of output) peak = Math.max(peak, Math.abs(sample ?? 0));
  const gain = peak > 0 ? Math.min(1, 0.794 / peak) : 1;
  if (gain !== 1) for (let i = 0; i < output.length; i += 1) output[i] = (output[i] ?? 0) * gain;
  return output;
}

function encodeWav(samples: Float32Array) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  for (const [offset, value] of [
    [0, "RIFF"],
    [8, "WAVE"],
    [12, "fmt "],
    [36, "data"],
  ] as const)
    for (let i = 0; i < 4; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  view.setUint32(4, buffer.byteLength - 8, true);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, ambienceProcessing.sampleRate, true);
  view.setUint32(28, ambienceProcessing.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1)
    view.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, samples[i] ?? 0)) * 32767), true);
  return new Blob([buffer], { type: "audio/wav" });
}

export function prepareAmbienceWav(
  decoded: DecodedWav,
  role: AmbienceRole,
  startSeconds: number,
  durationSeconds: number,
): PreparedAmbience {
  const maximum = ambienceProcessing.maxDurationSeconds[role];
  const start = Math.max(0, Math.min(startSeconds, decoded.durationSeconds - 0.1));
  const duration = Math.max(
    0.1,
    Math.min(durationSeconds, maximum, decoded.durationSeconds - start),
  );
  const first = Math.floor(start * decoded.sampleRate);
  const last = Math.min(decoded.samples.length, Math.ceil((start + duration) * decoded.sampleRate));
  const blob = encodeWav(
    fadeAndNormalize(resample(decoded.samples.slice(first, last), decoded.sampleRate), role),
  );
  if (blob.size > ambienceProcessing.maxPlaybackBytes)
    throw new Error("The prepared playback file exceeds 12 MiB.");
  return {
    blob,
    durationSeconds: (last - first) / decoded.sampleRate,
    selectedStartSeconds: start,
    selectedDurationSeconds: duration,
  };
}

export async function sha256Hex(blob: Blob) {
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(hash)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}
