import { Loader2 } from "lucide-react";
import { usePlayer } from "@/lib/player";

const eventLabels: Record<string, string> = {
  "sainik-dhaba": "Tawa garam karo 🔥",
  "nai-ki-dukaan": "Machine chalao ✂️",
  "bus-driver": "Horn baja do 🚌",
  "bartan-time": "Seeti bajao 🍲",
  "raj-mistri": "Ek thokar aur 🔨",
  "papa-ke-gaane": "Akhbaar palto 📰",
  "corporate-majdoor": "AC tez karo ❄️",
};

export function AmbienceEventButton({ sceneSlug }: { sceneSlug: string }) {
  const player = usePlayer();
  const label = eventLabels[sceneSlug] ?? "Jagah ki awaaz sunao 🔊";
  const disabled = !player.ambienceEventReady || player.ambienceEventPlaying;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void player.triggerAmbienceEvent()}
      aria-label={player.ambienceEventPlaying ? `${label} — playing` : label}
      className="pointer-events-auto flex min-h-9 items-center justify-center gap-2 rounded-full border border-cream/15 bg-black/45 px-4 text-xs font-semibold text-cream shadow-md backdrop-blur-xl transition-colors hover:border-ember/50 hover:bg-black/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember disabled:cursor-wait disabled:opacity-55"
    >
      {player.ambienceEventPlaying ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
      <span>{player.ambienceEventPlaying ? "Suno zara…" : label}</span>
    </button>
  );
}
