import { useId } from "react";

type CassetteBodyProps = {
  variant: "full" | "compact";
  isPlaying: boolean;
  label?: string;
};

const HUB_WINDING_RADII = [51, 48, 45, 42] as const;
const HUB_SLOT_ANGLES = Array.from({ length: 12 }, (_, index) => index * 30);
const HUB_TOOTH_ANGLES = Array.from({ length: 6 }, (_, index) => index * 60);

function CassetteHub({ compact, isPlaying }: { compact: boolean; isPlaying: boolean }) {
  const gradientId = `normal-cassette-hub-${useId().replaceAll(":", "")}`;
  const gradientFill = `url(#${gradientId})`;

  return (
    <span
      className={`${compact ? "size-[1.125rem]" : "size-5 sm:size-5.5"} relative z-10 block shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,.72)] ${
        isPlaying ? "cassette-reel-playing" : ""
      }`}
      aria-hidden
    >
      <svg className="block size-full" viewBox="0 0 128 128">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f1e4bd" />
            <stop offset="0.48" stopColor="#d8c590" />
            <stop offset="1" stopColor="#a88754" />
          </linearGradient>
        </defs>
        <circle className="cassette-svg-tape-shadow" cx="64" cy="64" r="59" />
        <circle className="cassette-svg-tape-pack" cx="64" cy="64" r="55" />
        {HUB_WINDING_RADII.map((radius) => (
          <circle
            key={radius}
            className="cassette-svg-tape-winding"
            cx="64"
            cy="64"
            r={radius}
          />
        ))}
        <circle
          className="cassette-svg-hub-rim"
          cx="64"
          cy="64"
          r="40"
          style={{ fill: gradientFill }}
        />
        <circle
          className="cassette-svg-hub-face"
          cx="64"
          cy="64"
          r="36"
          style={{ fill: gradientFill }}
        />
        {HUB_SLOT_ANGLES.map((angle) => (
          <rect
            key={angle}
            className="cassette-svg-hub-slot"
            x="61"
            y="30"
            width="6"
            height="9"
            rx="1.5"
            transform={`rotate(${angle} 64 64)`}
          />
        ))}
        <circle
          className="cassette-svg-hub-inner"
          cx="64"
          cy="64"
          r="21"
          style={{ fill: gradientFill }}
        />
        {HUB_TOOTH_ANGLES.map((angle) => (
          <rect
            key={angle}
            className="cassette-svg-hub-tooth"
            x="60"
            y="43"
            width="8"
            height="13"
            rx="2"
            transform={`rotate(${angle} 64 64)`}
            style={{ fill: gradientFill }}
          />
        ))}
        <circle className="cassette-svg-spindle-ring" cx="64" cy="64" r="11" />
        <circle className="cassette-svg-spindle" cx="64" cy="64" r="5.5" />
        <path className="cassette-svg-hub-highlight" d="M 39 44 A 32 32 0 0 1 74 34" />
      </svg>
    </span>
  );
}

export function CassetteBody({ variant, isPlaying, label }: CassetteBodyProps) {
  const compact = variant === "compact";

  return (
    <div
      className={`cassette-shell relative flex min-w-0 w-full items-center justify-center overflow-hidden rounded-lg sm:rounded-xl border border-white/15 shadow-sm ${
        compact ? "h-10 p-1" : "h-10.5 sm:h-12 p-1 sm:p-1.5"
      } ${isPlaying ? "cassette-running" : ""}`}
      aria-label={`${label ? `${label} ` : ""}cassette${isPlaying ? ", playing" : ", paused"}`}
      role="img"
    >
      {/* Corner Metallic Screws */}
      <span className="cassette-screw top-1 left-1" aria-hidden />
      <span className="cassette-screw top-1 right-1" aria-hidden />
      <span className="cassette-screw bottom-1 left-1" aria-hidden />
      <span className="cassette-screw right-1 bottom-1" aria-hidden />

      {/* Cassette Label Inset (Translucent Frosted Glass) */}
      <div className="relative flex size-full items-center justify-center rounded-md sm:rounded-lg border border-white/15 bg-gradient-to-b from-white/10 via-white/5 to-transparent p-0.5 sm:p-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-xs">
        {/* Cassette Tape Window (Translucent Smoke) */}
        <div
          className={`cassette-window relative flex size-full items-center justify-between overflow-hidden rounded-sm sm:rounded-md border border-white/10 bg-black/20 backdrop-blur-xs ${
            compact ? "px-3" : "px-5 sm:px-8"
          }`}
        >
          {/* Running Magnetic Tape Ribbon across window */}
          <div
            className={`cassette-tape absolute inset-x-2 sm:inset-x-4 top-1/2 -translate-y-1/2 rounded-xs opacity-80 ${
              compact ? "h-1.5" : "h-2 sm:h-2.5"
            }`}
            aria-hidden
          />

          {/* Left & Right Spools */}
          {(["left", "right"] as const).map((side) => (
            <CassetteHub key={side} compact={compact} isPlaying={isPlaying} />
          ))}

          {/* Glass Specular Glare */}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-white/[0.02] to-transparent"
            aria-hidden
          />
        </div>
      </div>
    </div>
  );
}
