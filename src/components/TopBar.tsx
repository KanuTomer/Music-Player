import { Link } from "@tanstack/react-router";
import { Radio, Users } from "lucide-react";
import { ISTClock } from "./ISTClock";

export function TopBar({ listeners }: { listeners?: number }) {
  return (
    <header className="relative shrink-0">
      <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-5">
        <Link
          to="/"
          className="group flex items-center gap-2.5"
          aria-label="Sainik Dhaba home"
        >
          <span className="signboard relative flex size-9 items-center justify-center rounded-lg">
            <Radio className="size-4" aria-hidden />
            <span className="absolute -top-0.5 -right-0.5 flex size-2">
              <span className="animate-live-ping absolute inline-flex size-full rounded-full bg-primary" />
              <span className="relative inline-flex size-2 rounded-full bg-primary" />
            </span>
          </span>
          <span className="flex flex-col leading-none">
            <span className="signage-text text-base tracking-tight sm:text-lg">
              Sainik Dhaba
            </span>
            <span className="text-[9.5px] font-medium tracking-[0.22em] text-muted-foreground uppercase">
              on air · 24 ghante
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          {typeof listeners === "number" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" aria-hidden />
              <span className="font-medium tabular-nums text-foreground">{listeners}</span>
              <span className="hidden sm:inline">sun rahe hain</span>
            </span>
          )}
          <ISTClock />
        </div>
      </div>
      <div className="h-[3px] w-full bg-gradient-to-r from-terracotta via-mustard to-terracotta opacity-90" aria-hidden />
    </header>
  );
}
