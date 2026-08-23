import type { FloatingReaction } from "@/hooks/useRoomSocial";

export function FloatingEmojiLayer({ items }: { items: FloatingReaction[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-hidden>
      {items.map((r) => (
        <span
          key={r.id}
          className="animate-drift-up absolute bottom-24 text-3xl"
          style={{ left: `${r.x}%` }}
        >
          {r.emoji}
        </span>
      ))}
    </div>
  );
}
