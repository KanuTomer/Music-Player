export const ambienceMp3 = {
  mimeType: "audio/mpeg",
  sampleRate: 32000,
  bitrateKbps: 64,
  channels: 1,
  maxMetadataBytes: 64 * 1024,
  maxPlaybackBytes: 1024 * 1024,
};

export type Mp3Inspection = {
  durationSeconds: number;
  frameCount: number;
  audioBytes: number;
  metadataBytes: number;
  bitrateKbps: number;
  sampleRate: number;
  channels: number;
};

const mpeg1Layer3Bitrates = [
  0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320,
];
const mpeg2Layer3Bitrates = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
const baseSampleRates = [44100, 48000, 32000];

function bytesFrom(data: ArrayBuffer | ArrayBufferView) {
  return data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function uint32be(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset]! * 0x1000000 +
    bytes[offset + 1]! * 0x10000 +
    bytes[offset + 2]! * 0x100 +
    bytes[offset + 3]!
  );
}

function ascii(bytes: Uint8Array, offset: number, length: number) {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function synchsafe(bytes: Uint8Array, offset: number) {
  for (let index = 0; index < 4; index += 1)
    if ((bytes[offset + index]! & 0x80) !== 0) throw new Error("The MP3 has an invalid ID3 tag.");
  return (
    (bytes[offset]! << 21) |
    (bytes[offset + 1]! << 14) |
    (bytes[offset + 2]! << 7) |
    bytes[offset + 3]!
  );
}

function frameHeader(bytes: Uint8Array, offset: number) {
  if (offset + 4 > bytes.length) return null;
  const header = uint32be(bytes, offset);
  if (Math.floor(header / 0x200000) !== 0x7ff) return null;
  const versionBits = (header >>> 19) & 0x3;
  const layerBits = (header >>> 17) & 0x3;
  const bitrateIndex = (header >>> 12) & 0xf;
  const sampleRateIndex = (header >>> 10) & 0x3;
  const padding = (header >>> 9) & 0x1;
  const channelMode = (header >>> 6) & 0x3;
  if (
    versionBits === 1 ||
    layerBits !== 1 ||
    bitrateIndex === 0 ||
    bitrateIndex === 15 ||
    sampleRateIndex === 3
  )
    return null;
  const version = versionBits === 3 ? 1 : versionBits === 2 ? 2 : 2.5;
  const bitrateKbps = (version === 1 ? mpeg1Layer3Bitrates : mpeg2Layer3Bitrates)[
    bitrateIndex
  ]!;
  const sampleRate =
    baseSampleRates[sampleRateIndex]! / (version === 1 ? 1 : version === 2 ? 2 : 4);
  const length =
    Math.floor(((version === 1 ? 144000 : 72000) * bitrateKbps) / sampleRate) + padding;
  return {
    version,
    bitrateKbps,
    sampleRate,
    channels: channelMode === 3 ? 1 : 2,
    samples: version === 1 ? 1152 : 576,
    length,
    channelMode,
  };
}

function isInfoFrame(bytes: Uint8Array, offset: number, frame: NonNullable<ReturnType<typeof frameHeader>>) {
  const sideInfoBytes = frame.version === 1 ? (frame.channelMode === 3 ? 17 : 32) : frame.channelMode === 3 ? 9 : 17;
  const markerOffset = offset + 4 + sideInfoBytes;
  const marker = ascii(bytes, markerOffset, 4);
  return marker === "Xing" || marker === "Info";
}

export function inspectMp3(data: ArrayBuffer | ArrayBufferView): Mp3Inspection {
  const bytes = bytesFrom(data);
  if (bytes.length < 4) throw new Error("The MP3 file is empty or truncated.");
  let offset = 0;
  let leadingMetadata = 0;
  if (bytes.length >= 10 && ascii(bytes, 0, 3) === "ID3") {
    const tagLength = 10 + synchsafe(bytes, 6) + ((bytes[5]! & 0x10) !== 0 ? 10 : 0);
    if (tagLength > ambienceMp3.maxMetadataBytes || tagLength >= bytes.length)
      throw new Error("The MP3 metadata is invalid or too large.");
    offset = tagLength;
    leadingMetadata = tagLength;
  }

  let frames = 0;
  let audioBytes = 0;
  let totalSamples = 0;
  let expected: ReturnType<typeof frameHeader> = null;
  while (offset + 4 <= bytes.length) {
    const frame = frameHeader(bytes, offset);
    if (!frame || offset + frame.length > bytes.length) break;
    if (frames === 0 && !expected && isInfoFrame(bytes, offset, frame)) {
      leadingMetadata += frame.length;
      offset += frame.length;
      continue;
    }
    if (!expected) expected = frame;
    else if (
      frame.version !== expected.version ||
      frame.bitrateKbps !== expected.bitrateKbps ||
      frame.sampleRate !== expected.sampleRate ||
      frame.channels !== expected.channels
    )
      throw new Error("The MP3 must use one constant audio format and bitrate.");
    frames += 1;
    audioBytes += frame.length;
    totalSamples += frame.samples;
    offset += frame.length;
  }
  if (!expected || frames < 2) throw new Error("The file does not contain valid MP3 audio frames.");

  let trailingMetadata = bytes.length - offset;
  if (trailingMetadata === 128 && ascii(bytes, offset, 3) === "TAG") {
    // ID3v1 is accepted as small, bounded metadata.
  } else if (trailingMetadata > 0) {
    const tail = bytes.subarray(offset);
    if (trailingMetadata > 4096 || tail.some((value) => value !== 0))
      throw new Error("The MP3 contains unsupported trailing data.");
  }
  const metadataBytes = leadingMetadata + trailingMetadata;
  if (metadataBytes > ambienceMp3.maxMetadataBytes)
    throw new Error("The MP3 metadata is too large.");
  return {
    durationSeconds: totalSamples / expected.sampleRate,
    frameCount: frames,
    audioBytes,
    metadataBytes,
    bitrateKbps: expected.bitrateKbps,
    sampleRate: expected.sampleRate,
    channels: expected.channels,
  };
}

export function validateAmbienceMp3(
  data: ArrayBuffer | ArrayBufferView,
  maximumDurationSeconds: number,
) {
  const bytes = bytesFrom(data);
  if (bytes.byteLength > ambienceMp3.maxPlaybackBytes)
    throw new Error("Prepared MP3 audio must be no larger than 1 MiB.");
  const inspection = inspectMp3(bytes);
  if (
    inspection.bitrateKbps !== ambienceMp3.bitrateKbps ||
    inspection.sampleRate !== ambienceMp3.sampleRate ||
    inspection.channels !== ambienceMp3.channels
  )
    throw new Error("Prepared audio must be a 32 kHz mono MP3 at 64 kbps CBR.");
  if (inspection.durationSeconds <= 0 || inspection.durationSeconds > maximumDurationSeconds + 0.1)
    throw new Error(`Prepared audio exceeds the ${maximumDurationSeconds}-second role limit.`);
  return inspection;
}
