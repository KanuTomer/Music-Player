import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const [, , sourceArgument, outputArgument] = process.argv;
if (!sourceArgument || !outputArgument) {
  throw new Error("Usage: bun scripts/prepare-ambience-visuals.mjs <source-dir> <output-dir>");
}

const sourceDir = resolve(sourceArgument);
const outputDir = resolve(outputArgument);
const ffmpeg = process.env.AMBIENCE_FFMPEG || "ffmpeg";
const acquiredAt = "2026-09-01";
const licenseName = "Mixkit Stock Video Free License";
const licenseUrl = "https://mixkit.co/license/#videoFree";

const assets = [
  {
    slug: "sainik-dhaba",
    title: "Smoke in motion",
    sourcePage: "https://mixkit.co/free-stock-video/smoke-in-motion-1964/",
    downloadUrl: "https://assets.mixkit.co/videos/1964/1964-720.mp4",
    sourceDurationSeconds: 22,
    sourceSha256: "59A924DBEE56EE8B82E488D6992D2F8FCE95693D78AE674001CBBAE8F8410882",
    blendMode: "screen",
    playbackRate: 0.72,
    opacityFloor: 0.42,
    opacityCeiling: 0.72,
  },
  {
    slug: "nai-ki-dukaan",
    title: "Lens flares from the sun through the out-of-focus trees",
    sourcePage:
      "https://mixkit.co/free-stock-video/lens-flares-from-the-sun-through-the-out-of-focus-trees-34372/",
    downloadUrl: "https://assets.mixkit.co/videos/34372/34372-720.mp4",
    sourceDurationSeconds: 8,
    sourceSha256: "34B80568F79A6C54986B6D1511DA99A1353144C2ECBB99FEEC6D42FB66B050C8",
    blendMode: "soft-light",
    playbackRate: 0.8,
    opacityFloor: 0.34,
    opacityCeiling: 0.58,
  },
  {
    slug: "bus-driver",
    title: "Blurred abstract cars lights at night with bokeh effect",
    sourcePage:
      "https://mixkit.co/free-stock-video/blurred-abstract-cars-lights-at-night-with-bokeh-effect-30/",
    downloadUrl: "https://assets.mixkit.co/videos/30/30-720.mp4",
    sourceDurationSeconds: 15,
    sourceSha256: "12BB3C31DA8C3AE58C5ECB45A80970E7F49DF9D080F385AA6E1FE401FF4C02D9",
    blendMode: "screen",
    playbackRate: 0.85,
    opacityFloor: 0.36,
    opacityCeiling: 0.64,
  },
  {
    slug: "bartan-time",
    title: "Black background with smoke foreground",
    sourcePage: "https://mixkit.co/free-stock-video/black-background-with-smoke-foreground-1968/",
    downloadUrl: "https://assets.mixkit.co/videos/1968/1968-720.mp4",
    sourceDurationSeconds: 15,
    sourceSha256: "E266F2844ADF347CD95A9A9C11F65E8CBFB9F9E42C943FEADEA5A1B99E9205D3",
    blendMode: "screen",
    playbackRate: 0.68,
    opacityFloor: 0.38,
    opacityCeiling: 0.66,
  },
  {
    slug: "raj-mistri",
    title: "White particles moving on black background",
    sourcePage:
      "https://mixkit.co/free-stock-video/white-particles-moving-on-black-background-4407/",
    downloadUrl: "https://assets.mixkit.co/videos/4407/4407-720.mp4",
    sourceDurationSeconds: 8,
    sourceSha256: "65EC1CB2B6FE5977893841FDCDCFCE2A69CE69B87F92618CFA5CA1706CA986A6",
    blendMode: "screen",
    playbackRate: 0.76,
    opacityFloor: 0.32,
    opacityCeiling: 0.56,
  },
  {
    slug: "papa-ke-gaane",
    title: "Television glich texture",
    sourcePage: "https://mixkit.co/free-stock-video/television-glich-texture-3524/",
    downloadUrl: "https://assets.mixkit.co/videos/3524/3524-720.mp4",
    sourceDurationSeconds: 120,
    sourceSha256: "536121A80B5C82BCAB75C1804CCCF35707AD23B79A3866BA11F60EF56C437C19",
    blendMode: "screen",
    playbackRate: 0.72,
    opacityFloor: 0.28,
    opacityCeiling: 0.5,
  },
  {
    slug: "corporate-majdoor",
    title: "Blinking round lights with bokeh effect",
    sourcePage: "https://mixkit.co/free-stock-video/blinking-round-lights-with-bokeh-effect-38/",
    downloadUrl: "https://assets.mixkit.co/videos/38/38-720.mp4",
    sourceDurationSeconds: 10,
    sourceSha256: "9C4C3B9D4500AB0EA283CB3C97B22581602EAFA3C41085799EB571F8DC1A085C",
    blendMode: "soft-light",
    playbackRate: 0.62,
    opacityFloor: 0.3,
    opacityCeiling: 0.52,
  },
];

function sha256(data) {
  return createHash("sha256").update(data).digest("hex").toUpperCase();
}

const version = spawnSync(ffmpeg, ["-version"], { encoding: "utf8" });
if (version.status !== 0) throw new Error(`Unable to run ffmpeg at ${ffmpeg}`);
const ffmpegVersion = version.stdout.split(/\r?\n/, 1)[0];
const prepared = [];

for (const asset of assets) {
  const input = join(sourceDir, `${asset.slug}.source.mp4`);
  const source = await readFile(input);
  if (sha256(source) !== asset.sourceSha256) {
    throw new Error(`Source checksum mismatch: ${asset.slug}`);
  }
  const storagePath = `rooms/${asset.slug}/ambience/overlay.mp4`;
  const output = join(outputDir, storagePath);
  await mkdir(resolve(output, ".."), { recursive: true });
  const filter =
    "[0:v]trim=start=0:duration=6,setpts=PTS-STARTPTS," +
    "scale=640:-2:flags=lanczos,fps=24,format=yuv420p,split=2[f][r];" +
    "[r]reverse[rr];[f][rr]concat=n=2:v=1:a=0[outv]";
  const result = spawnSync(
    ffmpeg,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      input,
      "-filter_complex",
      filter,
      "-map",
      "[outv]",
      "-an",
      "-c:v",
      "libx264",
      "-preset",
      "slow",
      "-crf",
      "30",
      "-movflags",
      "+faststart",
      output,
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) throw new Error(`ffmpeg failed: ${asset.slug}`);
  const data = await readFile(output);
  prepared.push({
    ...asset,
    acquiredAt,
    licenseName,
    licenseUrl,
    publisher: "Mixkit",
    storagePath,
    mimeType: "video/mp4",
    durationSeconds: 12,
    width: 640,
    framesPerSecond: 24,
    hasAudio: false,
    bytes: data.length,
    sha256: sha256(data),
  });
}

const manifest = {
  version: 1,
  generatedAt: new Date().toISOString(),
  ffmpegVersion,
  processing: {
    sourceSeconds: 6,
    loopMethod: "forward-then-reverse",
    width: 640,
    framesPerSecond: 24,
    codec: "H.264",
    crf: 30,
    audioRemoved: true,
  },
  assets: prepared,
};
await mkdir(outputDir, { recursive: true });
await writeFile(
  join(outputDir, "ambience-visual-assets.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(`Prepared ${prepared.length} ambience visual overlays with ${ffmpegVersion}`);
