import { useEffect, useState } from "react";
import { currentDaypart, daypartLabel, istTimeLabel } from "@/lib/dayparts";

export function ISTClock() {
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
    <span className="flex items-baseline gap-2 text-xs tabular-nums text-muted-foreground">
      <span className="font-medium text-foreground">{label} IST</span>
      <span className="hidden sm:inline">{daypartLabel[part]}</span>
    </span>
  );
}
