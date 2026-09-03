type CassetteBodyProps = {
  variant: "full" | "compact";
  isPlaying: boolean;
  label?: string;
};

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
            <span
              key={side}
              className={`cassette-spool cassette-spool-${side} relative z-10 flex items-center justify-center rounded-full border border-cinema-gold/50 bg-gradient-to-b from-cinema/80 to-charcoal shadow-xs ${
                compact ? "size-5" : "size-5.5 sm:size-6.5"
              }`}
              aria-hidden
            >
              <span
                className={`cassette-reel relative flex items-center justify-center rounded-full border-cinema-gold/70 bg-ink ${
                  compact ? "size-3 border-[1px]" : "size-3.5 border-[1.5px] sm:size-4.5 border-[2px]"
                } ${isPlaying ? "cassette-reel-playing" : ""}`}
              >
                <span className="cassette-reel-hole cassette-reel-hole-a" />
                <span className="cassette-reel-hole cassette-reel-hole-b" />
                <span className="cassette-reel-hole cassette-reel-hole-c" />
                <span
                  className={`relative z-10 rounded-full border border-black/80 bg-gradient-to-br from-cinema-gold via-[#e6b95c] to-[#997327] ${
                    compact ? "size-0.5" : "size-1 sm:size-1.5"
                  }`}
                />
              </span>
            </span>
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
