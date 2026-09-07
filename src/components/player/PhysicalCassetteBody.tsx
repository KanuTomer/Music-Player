import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import {
  cassetteHexRgb,
  cassetteMixHex,
  cassettePrinted,
  cassetteReadableInk,
  cassetteReelRotationSeconds,
  cassetteTapeRadii,
} from "@/lib/physical-cassette";

type PhysicalCassetteBodyProps = {
  isPlaying: boolean;
  isRewinding?: boolean;
  reduceMotion?: boolean;
  label?: string;
  progress?: number;
  title?: string;
  artist?: string;
  faceColor?: string;
  accentColor?: string;
};

function SvgSpool({
  cx,
  cy,
  tapeRadius,
  isPlaying,
  isRewinding,
  reduceMotion,
}: {
  cx: number;
  cy: number;
  tapeRadius: number;
  isPlaying: boolean;
  isRewinding: boolean;
  reduceMotion: boolean;
}) {
  const windingRadii = Array.from({ length: 28 }, (_, index) => tapeRadius - index * 3.2).filter(
    (radius) => radius > 59,
  );
  const textureMask = `cassette-tape-texture-${cx}`;
  const hubRef = useRef<SVGGElement | null>(null);
  const speedRafRef = useRef<number | null>(null);

  useEffect(() => {
    const hub = hubRef.current;
    if (!hub) return;
    const animation = hub.animate(
      [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
      { duration: 3200, iterations: Number.POSITIVE_INFINITY },
    );
    animation.currentTime = 998_400;
    animation.pause();

    return () => {
      if (speedRafRef.current != null) cancelAnimationFrame(speedRafRef.current);
      animation.cancel();
    };
  }, []);

  useEffect(() => {
    const animation = hubRef.current?.getAnimations()[0];
    if (!animation) return;
    if (speedRafRef.current != null) {
      cancelAnimationFrame(speedRafRef.current);
      speedRafRef.current = null;
    }
    if (reduceMotion || (!isPlaying && !isRewinding)) {
      animation.pause();
      return;
    }

    const from = animation.playbackRate;
    const target = isRewinding
      ? 3200 / 600
      : -3200 / (cassetteReelRotationSeconds(tapeRadius) * 1000);
    const startedAt = performance.now();
    const easeSpeed = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 180);
      const eased = 1 - (1 - progress) ** 3;
      animation.updatePlaybackRate(from + (target - from) * eased);
      if (progress < 1) speedRafRef.current = requestAnimationFrame(easeSpeed);
      else speedRafRef.current = null;
    };
    animation.play();
    speedRafRef.current = requestAnimationFrame(easeSpeed);

    return () => {
      if (speedRafRef.current != null) cancelAnimationFrame(speedRafRef.current);
      speedRafRef.current = null;
    };
  }, [isPlaying, isRewinding, reduceMotion, tapeRadius]);

  return (
    <g className="cassette-svg-spool">
      <defs>
        <mask
          id={textureMask}
          maskUnits="userSpaceOnUse"
          x={cx - tapeRadius - 5}
          y={cy - tapeRadius - 5}
          width={tapeRadius * 2 + 10}
          height={tapeRadius * 2 + 10}
        >
          <circle cx={cx} cy={cy} r={tapeRadius} fill="white" />
          <circle cx={cx} cy={cy} r="60" fill="black" />
        </mask>
      </defs>
      <circle className="cassette-svg-tape-shadow" cx={cx} cy={cy} r={tapeRadius + 4} />
      <circle className="cassette-svg-tape-pack" cx={cx} cy={cy} r={tapeRadius} />
      <g mask={`url(#${textureMask})`}>
        {windingRadii.map((radius, windingIndex) => (
          <circle
            key={windingIndex}
            className="cassette-svg-tape-winding"
            cx={cx}
            cy={cy}
            r={radius}
          />
        ))}
        <g
          className={
            isPlaying
              ? "cassette-svg-tape-reflection cassette-svg-tape-reflection-moving"
              : "cassette-svg-tape-reflection"
          }
          filter="url(#cassette-reflection-soften)"
        >
          {[-25, 155].map((angle) => (
            <path
              key={angle}
              d={`M ${cx + 59} ${cy - 2} L ${cx + (tapeRadius - 3) * Math.cos(0.12)} ${cy - (tapeRadius - 3) * Math.sin(0.12)} A ${tapeRadius - 3} ${tapeRadius - 3} 0 0 1 ${cx + (tapeRadius - 3) * Math.cos(0.12)} ${cy + (tapeRadius - 3) * Math.sin(0.12)} L ${cx + 59} ${cy + 2} Z`}
              transform={`rotate(${angle} ${cx} ${cy})`}
            />
          ))}
        </g>
      </g>
      <g
        ref={hubRef}
        className="cassette-svg-hub"
        style={{ transformOrigin: `${cx}px ${cy}px` }}
      >
        <circle className="cassette-svg-hub-rim" cx={cx} cy={cy} r="57" />
        <circle className="cassette-svg-hub-face" cx={cx} cy={cy} r="50" />
        {Array.from({ length: 12 }, (_, index) => (
          <rect
            key={index}
            className="cassette-svg-hub-slot"
            x={cx - 4.5}
            y={cy - 48}
            width="9"
            height="13"
            rx="2"
            transform={`rotate(${index * 30} ${cx} ${cy})`}
          />
        ))}
        <circle className="cassette-svg-hub-inner" cx={cx} cy={cy} r="29" />
        {Array.from({ length: 6 }, (_, index) => (
          <rect
            key={index}
            className="cassette-svg-hub-tooth"
            x={cx - 5.5}
            y={cy - 29}
            width="11"
            height="17"
            rx="2.5"
            transform={`rotate(${index * 60} ${cx} ${cy})`}
          />
        ))}
        <circle className="cassette-svg-spindle-ring" cx={cx} cy={cy} r="15" />
        <circle className="cassette-svg-spindle" cx={cx} cy={cy} r="7.5" />
        <path
          className="cassette-svg-hub-highlight"
          d={`M ${cx - 35} ${cy - 28} A 45 45 0 0 1 ${cx + 15} ${cy - 43}`}
        />
      </g>
    </g>
  );
}

function lowerTapeRoute(leftRadius: number, rightRadius: number) {
  const supplyX = 292 - leftRadius;
  const takeupX = 712 + rightRadius;
  return `M ${supplyX + 6} 326 C ${supplyX} 426 180 468 180 514 Q 180 570 242 570 H 762 Q 824 570 824 514 C 824 468 ${takeupX} 426 ${takeupX - 6} 326`;
}

export function PhysicalCassetteBody({
  isPlaying,
  isRewinding = false,
  reduceMotion = false,
  label,
  progress = 0,
  title,
  artist,
  faceColor,
  accentColor,
}: PhysicalCassetteBodyProps) {
  const radii = cassetteTapeRadii(progress);
  const tapeRoute = lowerTapeRoute(radii.left, radii.right);
  const jagah = cassettePrinted(label, "Sainik Dhaba", 28);
  const track = cassettePrinted(title, `${jagah} is loading…`, 34);
  const performer = cassettePrinted(artist, "Cassette tuning", 38);
  const faceStart = cassetteMixHex(faceColor, [255, 247, 218], 0.18);
  const faceEnd = cassetteMixHex(faceColor, [15, 9, 6], 0.1);
  const ink = cassetteReadableInk(faceColor);
  const mutedInk = cassetteMixHex(ink, ink === "#f4e7c8" ? [185, 164, 124] : [105, 70, 45], 0.28);
  const accent = cassetteHexRgb(accentColor) ? accentColor! : "#a24e32";

  return (
    <svg
      className="cassette-reference-svg"
      viewBox="0 0 1004 638"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${jagah} cassette${isPlaying ? ", playing" : ", paused"}`}
      style={
        {
          "--cassette-ink": ink,
          "--cassette-muted-ink": mutedInk,
          "--cassette-accent": accent,
          "--cassette-face-stroke": cassetteMixHex(faceColor, [45, 28, 17], 0.42),
        } as CSSProperties
      }
    >
      <title>{`${jagah}: ${track} — ${performer}`}</title>
      <defs>
        <linearGradient id="cassette-face" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={faceStart} />
          <stop offset="0.58" stopColor={faceColor ?? "#d6bd80"} />
          <stop offset="1" stopColor={faceEnd} />
        </linearGradient>
        <linearGradient id="cassette-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c0907" />
          <stop offset="0.55" stopColor="#21150f" />
          <stop offset="1" stopColor="#080605" />
        </linearGradient>
        <linearGradient id="cassette-hub-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f1e4bd" />
          <stop offset="0.48" stopColor="#d8c590" />
          <stop offset="1" stopColor="#a88754" />
        </linearGradient>
        <linearGradient id="cassette-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a3424" />
          <stop offset="1" stopColor="#1d140f" />
        </linearGradient>
        <filter id="cassette-shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#050302" floodOpacity="0.55" />
        </filter>
        <clipPath id="cassette-reel-window-clip">
          <rect x="144" y="208" width="716" height="234" rx="117" />
        </clipPath>
        <clipPath id="cassette-head-tape-clip">
          <path d="M 295 515 H 709 L 760 620 H 244 Z" />
        </clipPath>
        <filter id="cassette-reflection-soften" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      <path
        className="cassette-svg-face"
        d="M 86 18 H 918 L 986 86 V 620 H 18 V 86 Z"
        fill="url(#cassette-face)"
        filter="url(#cassette-shadow)"
      />
      <path className="cassette-svg-face-highlight" d="M 88 32 H 916 L 970 88" />
      <line className="cassette-svg-label-rule" x1="82" y1="177" x2="922" y2="177" />
      <text className="cassette-svg-jagah" x="502" y="82" textAnchor="middle">
        {jagah.toUpperCase()} · SIDE A
      </text>
      <text className="cassette-svg-title" x="502" y="144" textAnchor="middle">
        {track}
      </text>

      <circle className="cassette-svg-side-badge" cx="73" cy="326" r="24" />
      <text className="cassette-svg-side-letter" x="73" y="336" textAnchor="middle">
        A
      </text>
      <line className="cassette-svg-side-stripe" x1="854" y1="305" x2="986" y2="305" />
      <line
        className="cassette-svg-side-stripe cassette-svg-side-stripe-lower"
        x1="854"
        y1="329"
        x2="986"
        y2="329"
      />

      <rect
        className="cassette-svg-window-frame"
        x="132"
        y="196"
        width="740"
        height="258"
        rx="129"
      />
      <rect x="144" y="208" width="716" height="234" rx="117" fill="url(#cassette-window)" />
      <g clipPath="url(#cassette-reel-window-clip)">
        <path className="cassette-svg-tape-path" d={tapeRoute} />
        <path
          className={
            isPlaying
              ? "cassette-svg-tape-path-sheen cassette-svg-tape-path-sheen-moving"
              : "cassette-svg-tape-path-sheen"
          }
          d={tapeRoute}
        />
        <SvgSpool
          cx={292}
          cy={326}
          tapeRadius={radii.left}
          isPlaying={isPlaying}
          isRewinding={isRewinding}
          reduceMotion={reduceMotion}
        />
        <SvgSpool
          cx={712}
          cy={326}
          tapeRadius={radii.right}
          isPlaying={isPlaying}
          isRewinding={isRewinding}
          reduceMotion={reduceMotion}
        />
      </g>

      <text className="cassette-svg-artist" x="502" y="496" textAnchor="middle">
        {performer}
      </text>
      <path
        className="cassette-svg-head-frame"
        d="M 295 515 H 709 L 760 620 H 244 Z"
        fill="url(#cassette-head)"
        fillOpacity="0.4"
      />
      <circle className="cassette-svg-head-hole" cx="326" cy="579" r="17" />
      <circle className="cassette-svg-head-hole" cx="678" cy="579" r="17" />
      <rect className="cassette-svg-head-slot" x="405" y="557" width="27" height="30" rx="5" />
      <rect className="cassette-svg-head-slot" x="572" y="557" width="27" height="30" rx="5" />
      <g className="cassette-svg-reader" aria-hidden="true">
        <rect x="466" y="543" width="72" height="48" rx="7" />
        <rect className="cassette-svg-reader-face" x="478" y="550" width="48" height="31" rx="4" />
        <line x1="502" y1="554" x2="502" y2="578" />
      </g>
      <g aria-hidden="true" clipPath="url(#cassette-head-tape-clip)">
        <path className="cassette-svg-tape-path" d={tapeRoute} />
        <path
          className={
            isPlaying
              ? "cassette-svg-tape-path-sheen cassette-svg-tape-path-sheen-moving"
              : "cassette-svg-tape-path-sheen"
          }
          d={tapeRoute}
        />
        <path className="cassette-svg-head-glass" d="M 295 515 H 709 L 760 620 H 244 Z" />
      </g>
    </svg>
  );
}
