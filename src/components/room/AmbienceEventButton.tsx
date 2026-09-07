import { usePlayer } from "@/lib/player";
import { effectLabel } from "@/lib/scene-presentation";

export function AmbienceEventButton({ label }: { label?: string | null }) {
  const player = usePlayer();
  const resolvedLabel = effectLabel(label);
  const disabled = !player.ambienceAvailable || !player.ambienceEventReady;
  const displayLabel = player.ambienceAvailable ? resolvedLabel : "Ambience unavailable";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void player.triggerAmbienceEvent()}
      aria-label={
        player.ambienceAvailable
          ? player.ambienceEventPlaying
            ? `${resolvedLabel} — restart sound`
            : resolvedLabel
          : "Ambience unavailable"
      }
      className="pointer-events-auto flex min-h-9 items-center justify-center gap-2 rounded-full border border-cream/15 bg-black/45 px-4 text-xs font-semibold text-cream shadow-md backdrop-blur-xl transition-colors hover:border-ember/50 hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span>{displayLabel}</span>
    </button>
  );
}
