import { resolve } from "node:path";
import { ambienceProcessing } from "../src/lib/ambience-processing";
import { ambienceMp3, inspectMp3, validateAmbienceMp3 } from "../src/lib/mp3-audio";

type Manifest = {
  assets: Array<{
    outputFile: string;
    role: "base" | "texture" | "event";
    bytes: number;
    sha256: string;
  }>;
};

const repository = resolve(import.meta.dir, "..");
const manifest = (await Bun.file(
  resolve(repository, "scripts/generated/ambience-mp3-manifest.json"),
).json()) as Manifest;

async function sha256(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

let totalBytes = 0;
for (const asset of manifest.assets) {
  const bytes = new Uint8Array(await Bun.file(resolve(repository, asset.outputFile)).arrayBuffer());
  let inspection;
  try {
    inspection = validateAmbienceMp3(
      bytes,
      ambienceProcessing.maxDurationSeconds[asset.role],
    );
  } catch (error) {
    throw new Error(`Validation failed for ${asset.outputFile}`, { cause: error });
  }
  if (bytes.byteLength !== asset.bytes || (await sha256(bytes)) !== asset.sha256)
    throw new Error(`Manifest mismatch for ${asset.outputFile}`);
  if (
    inspection.bitrateKbps !== ambienceMp3.bitrateKbps ||
    inspection.sampleRate !== ambienceMp3.sampleRate ||
    inspection.channels !== ambienceMp3.channels
  )
    throw new Error(`Encoding mismatch for ${asset.outputFile}`);
  totalBytes += bytes.byteLength;
}

for (const file of ["cassette-tape.mp3", "cassette-rewind.mp3"]) {
  const bytes = new Uint8Array(
    await Bun.file(resolve(repository, "public", "local-audio", file)).arrayBuffer(),
  );
  const inspection = inspectMp3(bytes);
  if (
    inspection.bitrateKbps !== ambienceMp3.bitrateKbps ||
    inspection.sampleRate !== ambienceMp3.sampleRate ||
    inspection.channels !== ambienceMp3.channels
  )
    throw new Error(`Encoding mismatch for ${file}`);
}

console.log(`Validated ${manifest.assets.length + 2} MP3 files; ambience total ${totalBytes} bytes.`);
