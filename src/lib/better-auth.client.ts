import { createAuthClient } from "better-auth/client";
import { twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    typeof window === "undefined"
      ? import.meta.env.VITE_SITE_URL || "http://localhost:5173"
      : window.location.origin,
  basePath: "/api/auth",
  plugins: [twoFactorClient()],
  fetchOptions: { credentials: "include" },
});
