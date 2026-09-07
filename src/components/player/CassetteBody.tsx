import { useId } from "react";

type CassetteBodyProps = {
  variant: "full" | "compact";
  isPlaying: boolean;
  label?: string;
};

const HUB_SLOT_ANGLES = Array.from({ length: 6 }, (_, index) => index * 60);

function CassetteHub({ compact, isPlaying }: { compact: boolean; isPlaying: boolean }) {
  const gradientId = `normal-cassette-hub-${useId().replaceAll(":", "")}`;
  const gradientFill = `url(#${gradientId})`;

  return (
    <span
      className={`${compact ? "size-5.5" : "size-6.5 sm:size-7"} relative z-10 block shrink-0 ${
        isPlaying ? "cassette-reel-playing" : ""
      }`}
      aria-hidden
    >
      <svg className="block size-full" viewBox="0 0 64 64">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f1e4bd" />
            <stop offset="0.48" stopColor="#d8c590" />
            <stop offset="1" stopColor="#a88754" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="33" r="29" fill="#050302" fillOpacity="0.72" />
        <circle
          cx="32"
          cy="32"
          r="27"
          fill="#100906"
          stroke="#422818"
          strokeWidth="2"
        />
        <circle
          cx="32"
          cy="32"
          r="24"
          fill="none"
          stroke="#844e28"
          strokeOpacity="0.42"
          strokeWidth="1.25"
        />
        <circle cx="32" cy="32" r="20" fill={gradientFill} stroke="#2b1b11" strokeWidth="2" />
        {HUB_SLOT_ANGLES.map((angle) => (
          <rect
            key={angle}
            x="29.5"
            y="12"
            width="5"
            height="11"
            rx="2"
            fill="#3a281b"
            stroke="#fff4cf"
            strokeOpacity="0.38"
            strokeWidth="0.8"
            transform={`rotate(${angle} 32 32)`}
          />
        ))}
        <circle
          cx="32"
          cy="32"
          r="10"
          fill={gradientFill}
          stroke="#836239"
          strokeWidth="1.5"
        />
        <circle cx="32" cy="32" r="6" fill="#9a7848" stroke="#ead8ac" strokeWidth="1.25" />
        <circle cx="32" cy="32" r="3.5" fill="#18100b" stroke="#a77d42" strokeWidth="1.25" />
        <path
          d="M 18 18 A 20 20 0 0 1 39 13.5"
          fill="none"
          stroke="#fffce7"
          strokeOpacity="0.62"
          strokeLinecap="round"
          strokeWidth="1.5"
        />
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
