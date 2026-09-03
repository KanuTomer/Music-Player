import { describe, expect, test } from "bun:test";
import {
  ambienceGain,
  ambienceLoadStatus,
  ambienceTiming,
  effectiveMusicVolume,
  equalPowerFadeCurve,
  normalizeAmbienceFilter,
  randomEventDelayMs,
} from "./ambience";

describe("ambience engine decisions", () => {
  test("allows an explicit fixed level above one hundred percent", () => {
    expect(ambienceGain(0, 0.3)).toBe(0);
    expect(ambienceGain(50, 0.3)).toBeCloseTo(0.15);
    expect(ambienceGain(100, 0.3)).toBeCloseTo(0.3);
    expect(ambienceGain(150, 0.3)).toBeCloseTo(0.45);
    expect(ambienceGain(150, 2)).toBeCloseTo(1.5);
  });

  test("ducks effective music output without changing the user volume", () => {
    expect(effectiveMusicVolume(0.7, false)).toBeCloseTo(0.7);
    expect(effectiveMusicVolume(0.7, true)).toBeCloseTo(0.28);
    expect(effectiveMusicVolume(2, true)).toBeCloseTo(0.4);
    expect(effectiveMusicVolume(-1, true)).toBe(0);
  });

  test("normalizes room filter settings to safe Web Audio ranges", () => {
    expect(
      normalizeAmbienceFilter({
        highpass_hz: -20,
        lowpass_hz: 50000,
        peak_hz: 0,
        peak_gain_db: 40,
        peak_q: 0,
      }),
    ).toEqual({
      highpass_hz: 10,
      lowpass_hz: 20000,
      peak_hz: 40,
      peak_gain_db: 12,
      peak_q: 0.1,
    });
  });

  test("keeps randomized event delays inside the configured interval", () => {
    expect(randomEventDelayMs(35, 110, () => 0)).toBe(35000);
    expect(randomEventDelayMs(35, 110, () => 1)).toBe(110000);
    expect(randomEventDelayMs(20, 50, () => 0.5)).toBe(35000);
  });

  test("builds complementary equal-power loop fades", () => {
    const fadeIn = equalPowerFadeCurve(1, true, 5);
    const fadeOut = equalPowerFadeCurve(1, false, 5);
    expect(fadeIn[0]).toBeCloseTo(0);
    expect(fadeIn[4]).toBeCloseTo(1);
    expect(fadeOut[0]).toBeCloseTo(1);
    expect(fadeOut[4]).toBeCloseTo(0);
    expect(fadeIn[2] ** 2 + fadeOut[2] ** 2).toBeCloseTo(1);
  });

  test("keeps pause, resume, switch, and meander timing within the approved bounds", () => {
    expect(ambienceTiming.pauseFadeMs).toBe(300);
    expect(ambienceTiming.resumeFadeMs).toBe(250);
    expect(ambienceTiming.defaultSwitchOutMs).toBe(700);
    expect(ambienceTiming.meanderSeconds).toEqual([12, 24]);
  });

  test("degrades safely for partial and complete asset failures", () => {
    expect(ambienceLoadStatus(3, 3, false)).toBe("idle");
    expect(ambienceLoadStatus(3, 3, true)).toBe("playing");
    expect(ambienceLoadStatus(2, 3, true)).toBe("partial");
    expect(ambienceLoadStatus(0, 3, true)).toBe("unavailable");
  });
});
