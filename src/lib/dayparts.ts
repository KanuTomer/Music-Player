export type Daypart = "morning" | "day" | "evening" | "night";

/** Current hour in IST regardless of the visitor's timezone. */
export function istHour(now: Date = new Date()): number {
  const ist = new Date(now.getTime() + (330 + now.getTimezoneOffset()) * 60000);
  return ist.getHours();
}

export function istTimeLabel(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  }).format(now);
}

export function currentDaypart(now: Date = new Date()): Daypart {
  const h = istHour(now);
  if (h < 8) return "morning";
  if (h < 16) return "day";
  if (h < 21) return "evening";
  return "night";
}

export const daypartLabel: Record<Daypart, string> = {
  morning: "Subah / सुबह",
  day: "Din / दिन",
  evening: "Shaam / शाम",
  night: "Raat / रात",
};

/** Pick items tagged for this daypart, falling back to everything. */
export function forDaypart<T extends { daypart_tag: string }>(
  items: T[],
  daypart: Daypart,
): T[] {
  const matched = items.filter(
    (i) => i.daypart_tag === daypart || i.daypart_tag === "all",
  );
  return matched.length > 0 ? matched : items;
}
