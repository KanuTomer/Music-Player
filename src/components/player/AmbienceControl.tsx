import type { AmbienceStatus } from "@/lib/ambience";

type AmbienceControlProps = {
  available?: boolean;
  enabled?: boolean;
  active?: boolean;
  status?: AmbienceStatus;
  onToggle: () => void;
};

export function AmbienceControl({
  available = true,
  enabled = false,
  active = false,
  status = "idle",
  onToggle,
}: AmbienceControlProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!available}
      aria-pressed={available ? enabled : undefined}
      aria-label={
        available ? (enabled ? "Turn Ambience off" : "Turn Ambience on") : "Ambience unavailable"
      }
      className={`flex h-8 shrink-0 items-center rounded-full border px-2.5 text-[10.5px] font-semibold shadow-xs outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ember sm:h-8.5 ${
        !available
          ? "cursor-not-allowed border-cream/10 bg-cream/5 text-cream/35"
          : enabled
            ? "border-teal-500/40 bg-teal-950/40 text-emerald-300 hover:border-teal-500/60"
            : "border-cream/20 bg-cream/5 text-cream/80 hover:border-cream/35 hover:bg-cream/10 hover:text-cream"
      }`}
    >
      Ambience
      <span
        className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[7.5px] font-bold tracking-[0.08em] uppercase ${
          !available
            ? "bg-red-400/15 text-red-300"
            : enabled
              ? active
                ? "bg-emerald-400/25 text-emerald-300 ring-1 ring-emerald-400/30"
                : "bg-teal-deep/60 text-emerald-200"
              : status === "unavailable"
                ? "bg-red-400/15 text-red-300"
                : "bg-cream/10 text-cream/50"
        }`}
        aria-hidden
      >
        {!available ? "Unavailable" : enabled ? "ON" : "OFF"}
      </span>
    </button>
  );
}
