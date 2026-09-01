import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SmoothReveal({
  open,
  children,
  className,
}: {
  open: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-open={open ? "true" : "false"}
      aria-hidden={!open}
      inert={!open}
      className={cn("smooth-reveal", className)}
    >
      <div className="smooth-reveal-inner">{children}</div>
    </div>
  );
}
