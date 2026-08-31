import { useEffect, useRef } from "react";

const SUPPORT_INTERVAL_MS = 20 * 60 * 1000; // 20 minutes
const STORAGE_KEY_LAST_SHOWN = "sainik_dhaba_support_last_shown";
const STORAGE_KEY_SESSION_START = "sainik_dhaba_session_start";

/**
 * Hook to automatically trigger the Support Us dialog after 20 minutes
 * of cumulative listening/session time, persisting across room switches and navigation.
 */
export function useSupportAutoPrompt(onTrigger: () => void) {
  const triggerRef = useRef(onTrigger);
  triggerRef.current = onTrigger;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Initialize session start time if not already stored
    let sessionStart = Number(sessionStorage.getItem(STORAGE_KEY_SESSION_START));
    if (!sessionStart || isNaN(sessionStart)) {
      sessionStart = Date.now();
      sessionStorage.setItem(STORAGE_KEY_SESSION_START, String(sessionStart));
    }

    const checkAndTrigger = () => {
      const now = Date.now();
      const lastShown = Number(sessionStorage.getItem(STORAGE_KEY_LAST_SHOWN)) || sessionStart;
      const elapsed = now - lastShown;

      if (elapsed >= SUPPORT_INTERVAL_MS) {
        sessionStorage.setItem(STORAGE_KEY_LAST_SHOWN, String(now));
        triggerRef.current();
      }
    };

    // Run initial check and set up periodic interval
    checkAndTrigger();
    const interval = setInterval(checkAndTrigger, 15 * 1000); // check every 15s

    return () => clearInterval(interval);
  }, []);
}
