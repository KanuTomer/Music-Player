import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const [, , sourceArg, outputArg] = process.argv;
if (!sourceArg || !outputArg) {
  throw new Error("Usage: bun scripts/prepare-ambience-assets.mjs <source-dir> <output-dir>");
}

const sourceDir = resolve(sourceArg);
const outputDir = resolve(outputArg);
const sources = {
  highway: [
    "Indian highway sound effect.wav",
    "0569229ED15AE4E57D99DE268234658458782A28BB7F35C9B998A58011187C11",
    "https://www.youtube.com/watch?v=xO0j41GUIZ4",
  ],
  dhaba: [
    "Ambience - Indian dhaaba Restaurant & Bar, Food Stall, Tapri, Pan.wav",
    "0B1786699311BB2DF6845E593F57AA3E470107A44A421952502469C9E86F7358",
    "https://www.youtube.com/watch?v=U3uKZ9jjjaQ",
  ],
  sizzling: [
    "Food Sizzling Sound Effect.wav",
    "C75E2528FDC56F8EC8A2054FE6735F25DF4B6BDEAD91AD0002E92FB864FC65C1",
    "https://www.youtube.com/watch?v=GMNFph2tn2c",
  ],
  cooking: [
    "Cooking sound effect  _ No Copyright _ Free Download.wav",
    "0D504F3B2CC87BCC8975A0A8A6BDC302FB970A5E688EB623485D295BC1D5DA23",
    "https://www.youtube.com/watch?v=i6PYS0SPwO4",
  ],
  salon: [
    "Barber Shop Sound Effects and Stock Video _ Barber Shop Pole.wav",
    "3AB80A39B780B42B1CE8E3D61C9EAA70593CC1D206D4B675682104FA335B83E7",
    "https://www.youtube.com/watch?v=JIzItYl5x5E",
  ],
  scissors: [
    "Cutting Hair Sound Effect _ Scissors Sound Effect.wav",
    "436700712BEBD5D2ECA783E82AC870803B8F57F2889D1EE0604D1EF3F75FAAA9",
    "https://www.youtube.com/watch?v=M5TsssAOJ-w",
  ],
  clipper: [
    "HAIR CUTTING MACHINE - (Sound Effect) ✂✂.wav",
    "6016F78CF6B83F40D2EB8C5D5E7DF52C612DA002839290941B30DE3E75166A3A",
    "https://www.youtube.com/watch?v=9yPNJkADxRA",
  ],
  bus: [
    "Bus Ride Sound Effect - #backgroundsoundeffects.wav",
    "D4FD891AC1D136C79CF914F790A038193A741013729369F6263CA15D93BCBC7C",
    "https://www.youtube.com/watch?v=4nnFLAl_UaI",
  ],
  horn: [
    "Indian Bus Horn - Sound Effect No Copyright.wav",
    "B5F24CEB3110F745DC62B7E3987E84F671D190072EF9AE9F9A43527FC92C601D",
    "https://www.youtube.com/watch?v=EewxrgtHehE",
  ],
  washing: [
    "Washing Sound Effect In Kitchen _ Plates Washing Sound SFX _ Real Sound _ Copyright free Bgm_Sound.wav",
    "3DD6594CD5D9BB5EBCD7585302EDDF16BA99D5DEBA4330A9A16BDC1F6B3A4CF0",
    "https://www.youtube.com/watch?v=ODeUNpfDm3E",
  ],
  sink: [
    "Relaxing water running in the kitchen sink...ambient water sounds! ASMR.wav",
    "493A49E526DA450A1092B68D0C17DADC1AC0CF080608B526BDA67437D4B85328",
    "https://www.youtube.com/watch?v=U3wH9lNSG2Q",
  ],
  cooker: [
    "Pressure Cooker Whistle Sound Effect.wav",
    "67C7F87A61C1FF0D5DB90BC9A3124D9E8508EB99947D9E9F911335ACC69A04F3",
    "https://www.youtube.com/watch?v=Ktv4zUGOoRU",
  ],
  construction: [
    "Construction Workers Sound Effect.wav",
    "31E3A43F3961D3279D7827CE0CC0494CB47A789D846FE90652174BC6790E811B",
    "https://www.youtube.com/watch?v=gZ_vEKDLCCo",
  ],
  construction2: [
    "Construction Workers Sound Effect - #2.wav",
    "CCB8F0DEB3712BC36FF881C34C735D5358675F98ED423E17AAF5104DFF5D3BA4",
    "https://www.youtube.com/watch?v=yCZgqZNFOZg",
  ],
  construction4: [
    "Construction Workers Sound Effect - #4.wav",
    "716F3F7CD44400593E2CE0A6D2452A353B8F2705CA1D2B101DE10077CB70133D",
    "https://www.youtube.com/watch?v=eUP8ajzuzR4",
  ],
  fan: [
    "ceiling fan sound effect (royalty free).wav",
    "0A2EE5BAAD94142421D72856AB00646230C6C3096EFD89774116B2EC951C0CD5",
    "https://www.youtube.com/watch?v=uPWPMOLokaU",
  ],
  cassette: [
    "Cassette Tape Sound Effect - Ultimate.wav",
    "81600255F5FD0AE3732F20382CD409A818FEB175496F05E7A3E6184FF8A06FD3",
    "https://www.youtube.com/watch?v=GpIC6VX-nAg",
  ],
  newspaper: [
    "newspaper page turning sound - Sky Sound Effect _ Sound Effects _ Sound fx _ Free Sound Effects.wav",
    "1EFDE9E12649F4625D0D301FD1A79310BC8AACBEE173AD7DC2B9E5A254F32707",
    "https://www.youtube.com/watch?v=FJAMat4U2AM",
  ],
  office: [
    "Office Ambience Sound Effect [FREE DOWNLOAD _ ROYALTY FREE].wav",
    "0F69CC968D6FAB7EFA93D4D3211F827E21A2E1E45AA19138000233B62F1CE034",
    "https://www.youtube.com/watch?v=m_xf-5ViDuU",
  ],
  printer: [
    "Printer Noise _ Sound FX.wav",
    "5F739CDCAE614B84840EBB921D6449C9C28F13D1234A7DFD65C777C9CEB51F5E",
    "https://www.youtube.com/watch?v=TzKj7Zk9oiQ",
  ],
  ac: [
    "Sound effect - Bathroom fan, humming of AC unit.wav",
    "6786A343B5D2B54A6EE513EE86A3BF5D65DEBB00A425040C52C6761EC80797D4",
    "https://www.youtube.com/watch?v=R9iWLVO6q7w",
  ],
};

const jobs = [
  ["shared/indian-highway.wav", "highway", "base", 90],
  ["rooms/sainik-dhaba/ambience/texture.wav", "dhaba", "texture", 60],
  ["rooms/nai-ki-dukaan/ambience/base.wav", "salon", "base", 90],
  ["rooms/nai-ki-dukaan/ambience/texture.wav", "scissors", "texture", 40],
  ["rooms/nai-ki-dukaan/ambience/event.wav", "clipper", "event", 12],
  ["rooms/bus-driver/ambience/base.wav", "bus", "base", 90],
  ["rooms/bus-driver/ambience/event.wav", "horn", "event", 5],
  ["rooms/bartan-time/ambience/base.wav", "washing", "base", 33],
  ["rooms/bartan-time/ambience/texture.wav", "sink", "texture", 60],
  ["rooms/bartan-time/ambience/event.wav", "cooker", "event", 12],
  ["rooms/raj-mistri/ambience/base.wav", "construction", "base", 90],
  ["rooms/raj-mistri/ambience/texture.wav", "construction2", "texture", 60],
  ["rooms/raj-mistri/ambience/event.wav", "construction4", "event", 15],
  ["rooms/papa-ke-gaane/ambience/base.wav", "fan", "base", 16],
  ["rooms/papa-ke-gaane/ambience/texture.wav", "cassette", "texture", 7],
  ["rooms/papa-ke-gaane/ambience/event.wav", "newspaper", "event", 5],
  ["rooms/corporate-majdoor/ambience/base.wav", "office", "base", 56],
  ["rooms/corporate-majdoor/ambience/texture.wav", "printer", "texture", 6],
  ["rooms/corporate-majdoor/ambience/event.wav", "ac", "event", 12],
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();

function decodeWav(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE")
    throw new Error("Not a RIFF/WAVE file");
  let offset = 12,
    format,
    data;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === "fmt ")
      format = {
        audioFormat: buffer.readUInt16LE(start),
        channels: buffer.readUInt16LE(start + 2),
        sampleRate: buffer.readUInt32LE(start + 4),
        bits: buffer.readUInt16LE(start + 14),
      };
    if (id === "data") data = buffer.subarray(start, start + size);
    offset = start + size + (size % 2);
  }
  if (!format || !data || format.audioFormat !== 1 || format.bits !== 16)
    throw new Error("Only PCM16 WAV input is supported");
  const frames = data.length / (format.channels * 2);
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    let total = 0;
    for (let channel = 0; channel < format.channels; channel += 1)
      total += data.readInt16LE((i * format.channels + channel) * 2) / 32768;
    mono[i] = total / format.channels;
  }
  return { samples: mono, sampleRate: format.sampleRate };
}

function resample(samples, fromRate, toRate = 32000) {
  const output = new Float32Array(Math.floor((samples.length * toRate) / fromRate));
  for (let i = 0; i < output.length; i += 1) {
    const position = (i * fromRate) / toRate;
    const left = Math.floor(position);
    const fraction = position - left;
    output[i] =
      (samples[left] ?? 0) * (1 - fraction) +
      (samples[Math.min(left + 1, samples.length - 1)] ?? 0) * fraction;
  }
  return output;
}

function selectWindow(samples, sampleRate, seconds, role) {
  const length = Math.min(samples.length, Math.round(seconds * sampleRate));
  if (samples.length <= length) return { samples, startSeconds: 0 };
  if (role !== "event") {
    const start = Math.floor((samples.length - length) / 2);
    return { samples: samples.slice(start, start + length), startSeconds: start / sampleRate };
  }
  const step = sampleRate;
  let bestStart = 0,
    bestEnergy = -1;
  for (let start = 0; start + length <= samples.length; start += step) {
    let energy = 0;
    for (let i = start; i < start + length; i += 32) energy += samples[i] * samples[i];
    if (energy > bestEnergy) {
      bestEnergy = energy;
      bestStart = start;
    }
  }
  return {
    samples: samples.slice(bestStart, bestStart + length),
    startSeconds: bestStart / sampleRate,
  };
}

function fade(samples, sampleRate, role) {
  const fadeIn = Math.min(
    samples.length / 2,
    Math.round(sampleRate * (role === "event" ? 0.3 : 1)),
  );
  const fadeOut = Math.min(
    samples.length / 2,
    Math.round(sampleRate * (role === "event" ? 0.8 : 1)),
  );
  const output = samples.slice();
  for (let i = 0; i < fadeIn; i += 1) output[i] *= i / fadeIn;
  for (let i = 0; i < fadeOut; i += 1) output[output.length - 1 - i] *= i / fadeOut;
  let peak = 0;
  for (const sample of output) peak = Math.max(peak, Math.abs(sample));
  const gain = peak > 0 ? Math.min(1, 0.794 / peak) : 1;
  if (gain !== 1) for (let i = 0; i < output.length; i += 1) output[i] *= gain;
  return output;
}

function encodeWav(samples, sampleRate = 32000) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i += 1)
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buffer;
}

async function load(key, role, seconds) {
  const [file, expectedHash, sourceUrl] = sources[key];
  const input = await readFile(join(sourceDir, file));
  const actualHash = sha256(input);
  if (actualHash !== expectedHash) throw new Error(`Checksum mismatch for ${file}: ${actualHash}`);
  const decoded = decodeWav(input);
  const selected = selectWindow(decoded.samples, decoded.sampleRate, seconds, role);
  return {
    samples: fade(resample(selected.samples, decoded.sampleRate), 32000, role),
    source: {
      key,
      file,
      sourceUrl,
      sha256: actualHash,
      selectedStartSeconds: Number(selected.startSeconds.toFixed(3)),
      selectedDurationSeconds: Number((selected.samples.length / decoded.sampleRate).toFixed(3)),
    },
  };
}

await mkdir(outputDir, { recursive: true });
const manifest = [];
for (const [storagePath, key, role, seconds] of jobs) {
  const prepared = await load(key, role, seconds);
  const output = encodeWav(prepared.samples);
  const path = join(outputDir, storagePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, output);
  manifest.push({
    storagePath,
    role,
    bytes: output.length,
    durationSeconds: Number((prepared.samples.length / 32000).toFixed(3)),
    sha256: sha256(output),
    sources: [prepared.source],
  });
}

const sizzling = await load("sizzling", "event", 7);
const cooking = await load("cooking", "event", 8);
const overlap = 32000;
const combined = new Float32Array(sizzling.samples.length + cooking.samples.length - overlap);
combined.set(sizzling.samples);
for (let i = 0; i < cooking.samples.length; i += 1) {
  const target = sizzling.samples.length - overlap + i;
  if (i < overlap)
    combined[target] =
      (combined[target] ?? 0) * (1 - i / overlap) + cooking.samples[i] * (i / overlap);
  else combined[target] = cooking.samples[i];
}
const composite = encodeWav(fade(combined, 32000, "event"));
const compositePath = "rooms/sainik-dhaba/ambience/event.wav";
await mkdir(dirname(join(outputDir, compositePath)), { recursive: true });
await writeFile(join(outputDir, compositePath), composite);
manifest.push({
  storagePath: compositePath,
  role: "event",
  bytes: composite.length,
  durationSeconds: Number((combined.length / 32000).toFixed(3)),
  sha256: sha256(composite),
  sources: [sizzling.source, cooking.source],
});

manifest.sort((a, b) => a.storagePath.localeCompare(b.storagePath));
await writeFile(
  join(outputDir, "ambience-assets.json"),
  `${JSON.stringify({ manifestVersion: 1, format: { mimeType: "audio/wav", sampleRate: 32000, channels: 1, bitsPerSample: 16 }, assets: manifest }, null, 2)}\n`,
);
console.log(
  `Prepared ${manifest.length} runtime assets from ${Object.keys(sources).length} verified sources in ${outputDir}`,
);
