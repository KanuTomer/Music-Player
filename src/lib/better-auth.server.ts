import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor } from "better-auth/plugins";
import { db } from "@/db/client.server";
import {
  authAccounts,
  authSessions,
  authTwoFactors,
  authUsers,
  authVerifications,
} from "@/db/schema";

let instance: ReturnType<typeof createBetterAuth> | null = null;

function trustedOrigins() {
  const values = (process.env["ALLOWED_ORIGINS"] ?? "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (process.env["NODE_ENV"] !== "production") {
    values.push("http://localhost:5173", "http://127.0.0.1:5173");
  }
  return [...new Set(values)];
}

function createBetterAuth(secret: string, baseURL: string) {
  return betterAuth({
    appName: "Sainik Dhaba",
    baseURL: baseURL.replace(/\/$/, ""),
    basePath: "/api/auth",
    secret,
    trustedOrigins: trustedOrigins(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
        twoFactor: authTwoFactors,
      },
    }),
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 8, updateAge: 60 * 30 },
    rateLimit: { enabled: true, window: 60, max: 100 },
    advanced: { useSecureCookies: process.env["NODE_ENV"] === "production" },
    plugins: [
      twoFactor({
        issuer: "Sainik Dhaba",
        skipVerificationOnEnable: false,
        accountLockout: { enabled: true, maxFailedAttempts: 8, durationSeconds: 900 },
        backupCodeOptions: { amount: 10, length: 10 },
      }),
    ],
  });
}

export function getBetterAuth(): ReturnType<typeof createBetterAuth> {
  if (instance) return instance;
  const secret = process.env["BETTER_AUTH_SECRET"];
  const baseURL = process.env["BETTER_AUTH_URL"];
  if (!secret || secret.length < 32 || !baseURL) {
    throw new Error("Better Auth configuration is unavailable");
  }
  instance = createBetterAuth(secret, baseURL);
  return instance;
}

export type BetterAuthInstance = ReturnType<typeof getBetterAuth>;
