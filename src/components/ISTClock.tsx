import { useEffect, useState } from "react";
import { currentDaypart, daypartLabel, istTimeLabel } from "@/lib/dayparts";
import { cn } from "@/lib/utils";

export function ISTClock({
  className,
  inherit = false,
}: {
  className?: string;
  /** inherit the surrounding text color instead of using page tokens */
  inherit?: boolean;
}) {
  const [label, setLabel] = useState<string | null>(null);
  const [part, setPart] = useState<ReturnType<typeof currentDaypart> | null>(null);

  useEffect(() => {
    setLabel(istTimeLabel());
    setPart(currentDaypart());
    const t = window.setInterval(() => {
      setLabel(istTimeLabel());
      setPart(currentDaypart());
    }, 15000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <span
      className={cn(
        "flex items-baseline gap-2 text-xs tabular-nums",
        inherit ? "" : "text-muted-foreground",
        className,
      )}
    >
      <span className={cn("font-medium", inherit ? "" : "text-foreground")}>
        {label ? `${label} IST` : ""}
      </span>
      <span className="hidden opacity-70 sm:inline">
        {part ? daypartLabel[part] : ""}
      </span>
    </span>
  );
}
