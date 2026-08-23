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
  const [label, setLabel] = useState(() => istTimeLabel());
  const [part, setPart] = useState(() => currentDaypart());

  useEffect(() => {
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
        {label} IST
      </span>
      <span className="hidden opacity-70 sm:inline">{daypartLabel[part]}</span>
    </span>
  );
}
