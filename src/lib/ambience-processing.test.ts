import { describe, expect, test } from "bun:test";
import {
  ambienceProcessing,
  decodePcm16Wav,
  prepareAmbienceWav,
  suggestedWindow,
} from "./ambience-processing";

function pcmWav(samples: number[], sampleRate = 8000) {
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
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) => view.setInt16(44 + index * 2, sample, true));
  return buffer;
}

describe("ambience playback preparation", () => {
  test("decodes PCM WAV and uses a center selection for looping layers", () => {
    const decoded = decodePcm16Wav(pcmWav(new Array(8000 * 120).fill(100)));
    expect(decoded.durationSeconds).toBe(120);
    expect(suggestedWindow(decoded, "base")).toEqual({ startSeconds: 15, durationSeconds: 90 });
  });

  test("limits and resamples a prepared playback WAV", async () => {
    const decoded = decodePcm16Wav(pcmWav(new Array(8000 * 20).fill(500)));
    const prepared = prepareAmbienceWav(decoded, "event", 0, 20);
    expect(prepared.durationSeconds).toBe(15);
    expect(prepared.blob.size).toBeLessThan(ambienceProcessing.maxPlaybackBytes);
    const verified = decodePcm16Wav(await prepared.blob.arrayBuffer());
    expect(verified.sampleRate).toBe(32000);
    expect(verified.durationSeconds).toBeCloseTo(15, 2);
  });
});
