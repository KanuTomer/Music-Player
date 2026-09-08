import { describe, expect, test } from "bun:test";
import { ambienceMp3, inspectMp3, validateAmbienceMp3 } from "./mp3-audio";

function frame({ bitrateIndex = 5, bitrateKbps = 64, channelMode = 3, padding = 0 } = {}) {
  const length = Math.floor((144000 * bitrateKbps) / ambienceMp3.sampleRate) + padding;
  const bytes = new Uint8Array(length);
  const header =
    0xffe00000 |
    (3 << 19) |
    (1 << 17) |
    (1 << 16) |
    (bitrateIndex << 12) |
    (2 << 10) |
    (padding << 9) |
    (channelMode << 6);
  new DataView(bytes.buffer).setUint32(0, header, false);
  return bytes;
}

function mp3(frameCount = 10, options = {}) {
  const frames = Array.from({ length: frameCount }, (_, index) =>
    frame({ ...options, padding: index % 2 }),
  );
  const size = frames.reduce((total, item) => total + item.length, 0);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const item of frames) {
    bytes.set(item, offset);
    offset += item.length;
  }
  return bytes;
}

describe("MP3 playback validation", () => {
  test("accepts 64 kbps mono MPEG-1 frames at 32 kHz", () => {
    const result = validateAmbienceMp3(mp3(), 1);
    expect(result.bitrateKbps).toBe(64);
    expect(result.sampleRate).toBe(32000);
    expect(result.channels).toBe(1);
    expect(result.durationSeconds).toBeCloseTo(0.36);
  });

  test("rejects the wrong bitrate and stereo audio", () => {
    expect(() =>
      validateAmbienceMp3(mp3(10, { bitrateIndex: 6, bitrateKbps: 80 }), 1),
    ).toThrow(
      "32 kHz mono MP3 at 64 kbps CBR",
    );
    expect(() => validateAmbienceMp3(mp3(10, { channelMode: 0 }), 1)).toThrow(
      "32 kHz mono MP3 at 64 kbps CBR",
    );
  });

  test("rejects mixed frame formats and unbounded trailing data", () => {
    const mixed = new Uint8Array([
      ...mp3(2),
      ...mp3(2, { bitrateIndex: 6, bitrateKbps: 80 }),
    ]);
    expect(() => inspectMp3(mixed)).toThrow("constant audio format and bitrate");
    const trailing = new Uint8Array([...mp3(), ...new Uint8Array([1, 2, 3])]);
    expect(() => inspectMp3(trailing)).toThrow("unsupported trailing data");
  });
});
