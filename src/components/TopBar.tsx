import { Link } from "@tanstack/react-router";
import { Radio, Users } from "lucide-react";
import { ISTClock } from "./ISTClock";

export function TopBar({ listeners }: { listeners?: number }) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/70 px-3 sm:px-5">
      <Link to="/" className="flex items-center gap-2" aria-label="Sainik Dhaba home">
        <span className="signboard flex size-8 items-center justify-center rounded-md">
          <Radio className="size-4" aria-hidden />
        </span>
        <span className="font-signage text-base leading-none font-extrabold tracking-tight sm:text-lg">
          Sainik Dhaba
        </span>
      </Link>

      <div className="flex items-center gap-3 sm:gap-4">
        {typeof listeners === "number" && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="size-3.5" aria-hidden />
            <span className="tabular-nums font-medium text-foreground">{listeners}</span>
            <span className="hidden sm:inline">sun rahe hain</span>
          </span>
        )}
        <ISTClock />
      </div>
    </header>
  );
}
