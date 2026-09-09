import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";

export function RoomRouteError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    console.error("[Sainik Dhaba] Room route failed", {
      name: error.name,
      message: error.message,
      path: window.location.pathname,
    });
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="font-signage text-xl font-bold">Line kat gayi</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Kamra load nahi hua. Ek baar phir koshish karein?
      </p>
      <button
        type="button"
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Retry
      </button>
    </div>
  );
}
