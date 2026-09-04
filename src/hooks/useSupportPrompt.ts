import { useEffect, useRef } from "react";

const FIRST_SUPPORT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes for the very first prompt
const SUBSEQUENT_SUPPORT_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes for subsequent prompts
const STORAGE_KEY_LAST_SHOWN = "sainik_dhaba_support_last_shown";
const STORAGE_KEY_SESSION_START = "sainik_dhaba_session_start";
const STORAGE_KEY_SHOWN_COUNT = "sainik_dhaba_support_shown_count";

/**
 * Hook to automatically trigger the Support Us dialog:
 * - 10 minutes after initial listening/session start for the very first prompt.
 * - 15 minutes thereafter for all subsequent prompts.
 * Persists across room switches, player changes, and in-tab navigation.
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
      const shownCount = Number(sessionStorage.getItem(STORAGE_KEY_SHOWN_COUNT)) || 0;
      const lastShown = Number(sessionStorage.getItem(STORAGE_KEY_LAST_SHOWN));

      if (shownCount === 0) {
        // First trigger: after 10 minutes from session start
        const elapsedSinceStart = now - sessionStart;
        if (elapsedSinceStart >= FIRST_SUPPORT_INTERVAL_MS) {
          sessionStorage.setItem(STORAGE_KEY_LAST_SHOWN, String(now));
          sessionStorage.setItem(STORAGE_KEY_SHOWN_COUNT, "1");
          triggerRef.current();
        }
      } else {
        // Subsequent triggers: after 15 minutes from last shown time
        const effectiveLastShown = lastShown || sessionStart;
        const elapsedSinceLast = now - effectiveLastShown;
        if (elapsedSinceLast >= SUBSEQUENT_SUPPORT_INTERVAL_MS) {
          sessionStorage.setItem(STORAGE_KEY_LAST_SHOWN, String(now));
          sessionStorage.setItem(STORAGE_KEY_SHOWN_COUNT, String(shownCount + 1));
          triggerRef.current();
        }
      }
    };

    // Run check and set periodic polling
    checkAndTrigger();
    const interval = setInterval(checkAndTrigger, 10 * 1000); // check every 10 seconds

    return () => clearInterval(interval);
  }, []);
}
