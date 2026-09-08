import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AudioSample,
  AudioSampleSource,
  BufferTarget,
  Mp3OutputFormat,
  Output,
  Quality,
} from "mediabunny";
import { registerMp3Encoder } from "@mediabunny/mp3-encoder";

registerMp3Encoder();

const repository = join(dirname(fileURLToPath(import.meta.url)), "..");
const milestone = join(repository, "..", "milestone-assets", "milestone-5");
const outputRoot = join(repository, "..", "milestone-assets", "milestone-5-mp3");
const generatedManifestPath = join(repository, "scripts", "generated", "ambience-mp3-manifest.json");

function fourcc(view, offset) {
  return String.fromCharCode(...[0, 1, 2, 3].map((index) => view.getUint8(offset + index)));
}

function decodePcm16Wav(buffer) {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.byteLength < 44 || fourcc(view, 0) !== "RIFF" || fourcc(view, 8) !== "WAVE")
    throw new Error("Expected a PCM WAV file.");
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
      if (length < 16 || view.getUint16(start, true) !== 1 || view.getUint16(start + 14, true) !== 16)
        throw new Error("Expected 16-bit PCM WAV audio.");
      channels = view.getUint16(start + 2, true);
      sampleRate = view.getUint32(start + 4, true);
    } else if (id === "data") {
      dataOffset = start;
      dataLength = length;
    }
    offset = start + length + (length % 2);
  }
  if (!channels || !sampleRate || !dataLength || dataLength % (channels * 2))
    throw new Error("Expected usable PCM WAV audio.");
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

function resample(samples, fromRate) {
  if (fromRate === 32000) return samples;
  const output = new Float32Array(Math.floor((samples.length * 32000) / fromRate));
  for (let index = 0; index < output.length; index += 1) {
    const position = (index * fromRate) / 32000;
    const left = Math.floor(position);
    const fraction = position - left;
    output[index] = (samples[left] ?? 0) * (1 - fraction) + (samples[left + 1] ?? samples[left] ?? 0) * fraction;
  }
  return output;
}

function inspectMp3(bytes) {
  let offset = 0;
  let frames = 0;
  let samples = 0;
  let bitrateKbps = 0;
  let sampleRate = 0;
  let channels = 0;
  let skippedInfoFrame = false;
  while (offset + 4 <= bytes.length) {
    const header = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0, false);
    if (Math.floor(header / 0x200000) !== 0x7ff) break;
    const versionBits = (header >>> 19) & 3;
    const bitrateIndex = (header >>> 12) & 15;
    const sampleRateIndex = (header >>> 10) & 3;
    const padding = (header >>> 9) & 1;
    const mode = (header >>> 6) & 3;
    if (versionBits !== 3 || ((header >>> 17) & 3) !== 1 || !bitrateIndex || bitrateIndex === 15 || sampleRateIndex === 3)
      break;
    const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
    const rates = [44100, 48000, 32000];
    const currentBitrate = bitrates[bitrateIndex];
    const currentRate = rates[sampleRateIndex];
    const currentChannels = mode === 3 ? 1 : 2;
    const length = Math.floor((144000 * currentBitrate) / currentRate) + padding;
    const markerOffset = offset + 4 + (mode === 3 ? 17 : 32);
    const marker = String.fromCharCode(...bytes.subarray(markerOffset, markerOffset + 4));
    if (!frames && !skippedInfoFrame && (marker === "Xing" || marker === "Info")) {
      skippedInfoFrame = true;
      offset += length;
      continue;
    }
    if (frames && (currentBitrate !== bitrateKbps || currentRate !== sampleRate || currentChannels !== channels))
      throw new Error(`Generated MP3 changed format at frame ${frames}: ${bitrateKbps}/${sampleRate}/${channels} -> ${currentBitrate}/${currentRate}/${currentChannels}.`);
    bitrateKbps = currentBitrate;
    sampleRate = currentRate;
    channels = currentChannels;
    if (offset + length > bytes.length) break;
    offset += length;
    frames += 1;
    samples += 1152;
  }
  if (frames < 2 || offset !== bytes.length || bitrateKbps !== 64 || sampleRate !== 32000 || channels !== 1)
    throw new Error("Generated file is not a complete 32 kHz mono 64 kbps CBR MP3.");
  return { durationSeconds: samples / sampleRate, frameCount: frames };
}

async function sha256(bytes) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function encodeWav(inputPath) {
  const decoded = decodePcm16Wav(await readFile(inputPath));
  const preparedSamples = resample(decoded.samples, decoded.sampleRate);
  const target = new BufferTarget();
  const output = new Output({ format: new Mp3OutputFormat(), target });
  const source = new AudioSampleSource({
    codec: "mp3",
    quality: new Quality({ bitrate: 64000, bitrateMode: "constant" }),
  });
  output.addAudioTrack(source);
  await output.start();
  const framesPerChunk = 32000;
  for (let start = 0; start < preparedSamples.length; start += framesPerChunk) {
    const chunk = preparedSamples.slice(start, Math.min(preparedSamples.length, start + framesPerChunk));
    const sample = new AudioSample({ data: chunk, format: "f32", numberOfChannels: 1, sampleRate: 32000, timestamp: start / 32000 });
    await source.add(sample);
    sample.close();
  }
  source.close();
  await output.finalize();
  if (!target.buffer) throw new Error("MP3 encoder returned no data.");
  const bytes = new Uint8Array(target.buffer);
  return { bytes, inspection: inspectMp3(bytes), sha256: await sha256(bytes), sourceDuration: decoded.durationSeconds };
}

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
const sourceManifest = JSON.parse(await readFile(join(milestone, "ambience-assets.json"), "utf8"));
const generated = [];
for (const asset of sourceManifest.assets) {
  const inputPath = join(milestone, ...asset.storagePath.split("/"));
  const encoded = await encodeWav(inputPath);
  const stem = asset.storagePath.replace(/\.wav$/i, "");
  const newStoragePath = `${stem}-${encoded.sha256.slice(0, 16).toLowerCase()}.mp3`;
  const outputFile = join(outputRoot, ...newStoragePath.split("/"));
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, encoded.bytes);
  generated.push({
    oldStoragePath: asset.storagePath,
    newStoragePath,
    role: asset.role,
    bytes: encoded.bytes.byteLength,
    durationSeconds: Number(encoded.inspection.durationSeconds.toFixed(3)),
    sha256: encoded.sha256,
    outputFile: relative(repository, outputFile).replaceAll("\\", "/"),
  });
  console.log(`${asset.storagePath} -> ${newStoragePath} (${encoded.bytes.byteLength} bytes)`);
}
for (const file of ["cassette-tape.wav", "cassette-rewind.wav"]) {
  const inputPath = join(repository, "public", "local-audio", file);
  const encoded = await encodeWav(inputPath);
  const outputPath = join(repository, "public", "local-audio", file.replace(/\.wav$/i, ".mp3"));
  await writeFile(outputPath, encoded.bytes);
  console.log(`${basename(inputPath)} -> ${basename(outputPath)} (${encoded.bytes.byteLength} bytes)`);
}
await mkdir(dirname(generatedManifestPath), { recursive: true });
await writeFile(generatedManifestPath, `${JSON.stringify({ format: "MP3 CBR 64 kbps, mono, 32000 Hz", assets: generated }, null, 2)}\n`);
console.log(`Generated ${generated.length} ambience files and two cassette sounds.`);
