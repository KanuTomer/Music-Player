import type { PreparedAmbiencePcm } from "./ambience-processing";
import { ambienceMp3, validateAmbienceMp3 } from "./mp3-audio";

let encoderRegistered = false;

export async function encodePreparedAmbienceMp3(
  prepared: PreparedAmbiencePcm,
  options: { signal?: AbortSignal; onProgress?: (progress: number) => void } = {},
) {
  const [{ AudioSample, AudioSampleSource, BufferTarget, Mp3OutputFormat, Output, Quality }, plugin] =
    await Promise.all([import("mediabunny"), import("@mediabunny/mp3-encoder")]);
  if (!encoderRegistered) {
    plugin.registerMp3Encoder();
    encoderRegistered = true;
  }
  if (options.signal?.aborted) throw new DOMException("Audio preparation canceled.", "AbortError");

  const target = new BufferTarget();
  const output = new Output({ format: new Mp3OutputFormat(), target });
  const source = new AudioSampleSource({
    codec: "mp3",
    quality: new Quality({ bitrate: ambienceMp3.bitrateKbps * 1000, bitrateMode: "constant" }),
  });
  output.addAudioTrack(source);
  await output.start();
  try {
    const framesPerChunk = prepared.sampleRate;
    for (let start = 0; start < prepared.samples.length; start += framesPerChunk) {
      if (options.signal?.aborted)
        throw new DOMException("Audio preparation canceled.", "AbortError");
      const end = Math.min(prepared.samples.length, start + framesPerChunk);
      const chunk = prepared.samples.slice(start, end);
      const sample = new AudioSample({
        data: chunk,
        format: "f32",
        numberOfChannels: 1,
        sampleRate: prepared.sampleRate,
        timestamp: start / prepared.sampleRate,
      });
      try {
        await source.add(sample);
      } finally {
        sample.close();
      }
      options.onProgress?.(end / prepared.samples.length);
    }
    source.close();
    await output.finalize();
  } catch (error) {
    await output.cancel();
    throw error;
  }
  if (!target.buffer) throw new Error("The MP3 encoder did not produce an output file.");
  validateAmbienceMp3(target.buffer, prepared.selectedDurationSeconds);
  return new Blob([target.buffer], { type: ambienceMp3.mimeType });
}
