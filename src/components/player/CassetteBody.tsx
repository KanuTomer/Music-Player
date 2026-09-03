type CassetteBodyProps = {
  variant: "full" | "compact";
  isPlaying: boolean;
  label: string;
};

export function CassetteBody({ variant, isPlaying, label }: CassetteBodyProps) {
  const compact = variant === "compact";

  return (
    <div
      className={`cassette-shell relative min-w-0 w-full overflow-hidden rounded-xl border border-white/15 shadow-md ${
        compact ? "h-11 px-2 py-0.5" : "h-[3.6rem] px-2.5 py-1 sm:h-[4.1rem] sm:px-3 sm:py-1.5"
      } ${isPlaying ? "cassette-running" : ""}`}
      aria-label={`${label} cassette${isPlaying ? ", playing" : ", paused"}`}
      role="img"
    >
      {/* Corner Metallic Screws */}
      <span className="cassette-screw top-1 left-1" aria-hidden />
      <span className="cassette-screw top-1 right-1" aria-hidden />
      <span className="cassette-screw bottom-1 left-1" aria-hidden />
      <span className="cassette-screw right-1 bottom-1" aria-hidden />

      {/* Cassette Label Inset (Translucent Frosted Glass) */}
      <div
        className={`relative mx-auto h-full rounded-lg border border-white/15 bg-gradient-to-b from-white/15 via-white/8 to-white/4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] backdrop-blur-md ${
          compact ? "px-1.5 pt-0.5" : "px-2.5 pt-1"
        }`}
      >
        {/* Label Header */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="h-[1.5px] flex-1 rounded-full bg-gradient-to-r from-ember via-mustard to-ember/60" aria-hidden />
          <span
            className={`truncate px-1.5 font-cinema-display font-bold tracking-[0.14em] text-cream uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] ${
              compact ? "max-w-20 text-[7.5px]" : "max-w-xs text-[9.5px] sm:text-[11px]"
            }`}
          >
            {label}
          </span>
          <span className="h-[1.5px] flex-1 rounded-full bg-gradient-to-r from-white/30 to-white/10" aria-hidden />
        </div>

        {/* Cassette Tape Window (Translucent Smoke) */}
        <div
          className={`cassette-window relative mx-auto flex items-center justify-between overflow-hidden rounded-md border border-white/10 bg-black/40 backdrop-blur-sm ${
            compact ? "mt-0.5 h-[1.8rem] px-2.5" : "mt-0.5 h-[2.1rem] px-4 sm:h-[2.35rem] sm:px-8"
          }`}
        >
          {/* Running Magnetic Tape Ribbon across window */}
          <div
            className={`cassette-tape absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-xs opacity-80 ${
              compact ? "h-1.5" : "h-2.5 sm:h-3"
            }`}
            aria-hidden
          />



          {/* Left & Right Spools */}
          {(["left", "right"] as const).map((side) => (
            <span
              key={side}
              className={`cassette-spool cassette-spool-${side} relative z-10 flex items-center justify-center rounded-full border border-cinema-gold/50 bg-gradient-to-b from-cinema/80 to-charcoal shadow-sm ${
                compact ? "size-5.5" : "size-6.5 sm:size-7.5"
              }`}
              aria-hidden
            >
              <span
                className={`cassette-reel relative flex items-center justify-center rounded-full border-cinema-gold/70 bg-ink ${
                  compact ? "size-3.5 border-[1.5px]" : "size-4.5 border-[2px] sm:size-5.5 border-[2.5px]"
                } ${isPlaying ? "cassette-reel-playing" : ""}`}
              >
                <span className="cassette-reel-hole cassette-reel-hole-a" />
                <span className="cassette-reel-hole cassette-reel-hole-b" />
                <span className="cassette-reel-hole cassette-reel-hole-c" />
                <span
                  className={`relative z-10 rounded-full border border-black/80 bg-gradient-to-br from-cinema-gold via-[#e6b95c] to-[#997327] ${
                    compact ? "size-1" : "size-1.5 sm:size-2"
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
