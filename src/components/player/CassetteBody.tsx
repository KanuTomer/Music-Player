type CassetteBodyProps = {
  variant: "full" | "compact";
  isPlaying: boolean;
  label: string;
};

export function CassetteBody({ variant, isPlaying, label }: CassetteBodyProps) {
  const compact = variant === "compact";

  return (
    <div
      className={`cassette-shell relative min-w-0 w-full overflow-hidden rounded-[6px] border border-cream/15 bg-charcoal-soft shadow-inner ${
        compact ? "h-12 px-2 py-1" : "h-[4.5rem] px-3 py-1.5 sm:h-20"
      } ${isPlaying ? "cassette-running" : ""}`}
      aria-label={`${label} cassette${isPlaying ? ", playing" : ", paused"}`}
      role="img"
    >
      <span className="cassette-screw top-1 left-1" aria-hidden />
      <span className="cassette-screw top-1 right-1" aria-hidden />
      <span className="cassette-screw bottom-1 left-1" aria-hidden />
      <span className="cassette-screw right-1 bottom-1" aria-hidden />

      <div
        className={`relative mx-auto h-full rounded-[3px] bg-cinema-cream shadow-tile ${
          compact ? "px-1.5 pt-1" : "px-2 pt-1"
        }`}
      >
        {/* Label row */}
        <div className="flex items-center justify-between">
          <span className="h-[2px] flex-1 bg-ember/80" aria-hidden />
          <span
            className={`truncate px-1.5 font-cinema-display tracking-[0.14em] text-charcoal/75 ${
              compact ? "max-w-16 text-[6px]" : "px-2 text-[9px] sm:text-[10px]"
            }`}
          >
            {label}
          </span>
          <span className="h-[2px] flex-1 bg-charcoal-line/60" aria-hidden />
        </div>

        {/* Window — spools pushed to edges with justify-between */}
        <div
          className={`cassette-window relative mx-auto flex items-center justify-between rounded-[3px] border border-ink/50 bg-night/95 ${
            compact
              ? "mt-1 h-[1.9rem] px-3"
              : "mt-1 h-[2.3rem] px-4 sm:h-[2.6rem] sm:px-8"
          }`}
        >
          {(["left", "right"] as const).map((side) => (
            <span
              key={side}
              className={`cassette-spool cassette-spool-${side} relative flex items-center justify-center rounded-full border-2 border-cream/30 bg-cinema ${
                compact ? "size-6" : "size-7 sm:size-8"
              }`}
              aria-hidden
            >
              <span
                className={`cassette-reel relative flex items-center justify-center rounded-full border-cinema-cream bg-ink ${
                  compact ? "size-4 border-2" : "size-4.5 border-2 sm:size-5.5 border-[3px]"
                } ${isPlaying ? "cassette-reel-playing" : ""}`}
              >
                <span className="cassette-reel-hole cassette-reel-hole-a" />
                <span className="cassette-reel-hole cassette-reel-hole-b" />
                <span className="cassette-reel-hole cassette-reel-hole-c" />
                <span
                  className={`relative z-10 rounded-full border-ink bg-cinema-gold ${
                    compact ? "size-1 border" : "size-1.5 border"
                  }`}
                />
              </span>
            </span>
          ))}
        </div>
      </div>

      {!compact ? (
        <div
          className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-3"
          aria-hidden
        >
          <span className="h-1.5 w-3 rounded-t-[2px] border-x border-t border-cream/25 bg-ink" />
          <span className="h-2 w-8 rounded-t-[2px] border-x border-t border-cream/30 bg-ink" />
          <span className="h-1.5 w-3 rounded-t-[2px] border-x border-t border-cream/25 bg-ink" />
        </div>
      ) : null}
    </div>
  );
}
