import { serve } from "@hono/node-server";
import { pathToFileURL } from "node:url";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { z } from "zod";
import { withRequestContext } from "@/lib/request-context.server";
import { validateChatMessageText } from "@/lib/chat-message";
import {
  normalizePlaybackSourceFailureInput,
  normalizeRoomListeningInput,
  normalizeRoomVisitInput,
} from "@/lib/rooms.operations";

type JsonRecord = Record<string, unknown>;
type Operation = (data: JsonRecord) => Promise<unknown>;

export const app = new Hono();
const localOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4174",
  "http://127.0.0.1:4174",
];

function configuredOrigins(): Set<string> {
  const configured = (process.env["ALLOWED_ORIGINS"] ?? "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (process.env["NODE_ENV"] !== "production") configured.push(...localOrigins);
  if (process.env["NODE_ENV"] === "production" && configured.length === 0) {
    throw new Error("ALLOWED_ORIGINS is required in production");
  }
  return new Set(configured);
}

const allowedOrigins = configuredOrigins();

app.on(["GET", "POST"], "/api/auth/*", async (context) => {
  const origin = context.req.header("origin")?.replace(/\/$/, "");
  if (origin && !allowedOrigins.has(origin)) return context.json({ error: "Origin denied" }, 403);
  if (context.req.path === "/api/auth/sign-up/email") {
    return context.json({ error: "Public registration is disabled" }, 403);
  }
  const { getBetterAuth } = await import("@/lib/better-auth.server");
  return getBetterAuth().handler(context.req.raw);
});

app.use("/api/*", async (context, next) => {
  const requestId = context.req.header("x-request-id")?.slice(0, 128) || crypto.randomUUID();
  context.header("x-request-id", requestId);
  await withRequestContext({ headers: new Headers(context.req.raw.headers), requestId }, next);
});

app.use(
  "/api/v1/*",
  cors({
    origin: (origin) =>
      origin && allowedOrigins.has(origin.replace(/\/$/, "")) ? origin : undefined,
    allowHeaders: ["authorization", "content-type", "x-request-id"],
    allowMethods: ["POST", "OPTIONS"],
    maxAge: 600,
  }),
);

app.use(
  "/api/v1/*",
  bodyLimit({
    maxSize: 256 * 1024,
    onError: (context) =>
      context.json(
        {
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "Request is too large",
            requestId: context.res.headers.get("x-request-id") ?? undefined,
          },
        },
        413,
      ),
  }),
);

app.get("/healthz", (context) => context.json({ status: "ok" }));
app.get("/readyz", async (context) => {
  try {
    const { neonPool } = await import("@/db/client.server");
    await neonPool.query("select 1");
    return context.json({ status: "ready" });
  } catch {
    return context.json({ status: "unavailable" }, 503);
  }
});

function record(data: unknown): JsonRecord {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Invalid request data");
  return data as JsonRecord;
}

function stringValue(data: JsonRecord, key: string): string {
  const value = data[key];
  if (typeof value !== "string") throw new Error(`Invalid ${key}`);
  return value;
}

export function classifyApiError(error: unknown): {
  status: 400 | 401 | 403 | 429 | 500;
  code: string;
  message: string;
} {
  if (error instanceof z.ZodError) {
    return { status: 400, code: "INVALID_REQUEST", message: "Invalid request data" };
  }
  const message = error instanceof Error ? error.message : "";
  const lower = message.toLowerCase();
  if (lower.includes("sign in") || lower.includes("session")) {
    return { status: 401, code: "UNAUTHENTICATED", message: "Sign in is required" };
  }
  if (lower.includes("administrator") || lower.includes("mfa")) {
    return {
      status: 403,
      code: "FORBIDDEN",
      message: message || "Administrator access is required",
    };
  }
  if (lower.includes("rate limit")) {
    return { status: 429, code: "RATE_LIMITED", message: "Please wait before trying again" };
  }
  const safeValidation = [
    "invalid",
    "required",
    "not found",
    "must ",
    "cannot ",
    "already ",
    "expired",
    "links aren",
    "email addresses",
  ].some((marker) => lower.includes(marker));
  if (safeValidation) return { status: 400, code: "INVALID_REQUEST", message };
  return { status: 500, code: "INTERNAL_ERROR", message: "Request failed" };
}

async function publicOperations(): Promise<Record<string, Operation>> {
  const rooms = await import("@/lib/rooms.server");
  const operational = await import("@/lib/rooms.operations.server");
  return {
    "list-scenes": async () => rooms.fetchScenes(),
    "get-room": async (data) => rooms.fetchRoom(stringValue(data, "slug")),
    "get-room-ambience": async (data) => rooms.fetchRoomAmbience(stringValue(data, "sceneId")),
    "get-room-presentation": async (data) =>
      rooms.fetchRoomPresentation(stringValue(data, "sceneId")),
    "get-chat-messages": async (data) => rooms.fetchChatMessages(stringValue(data, "roomKey")),
    "send-chat-message": async (data) => {
      const roomKey = stringValue(data, "roomKey");
      const displayName = stringValue(data, "displayName").trim();
      const text = stringValue(data, "text").trim();
      const id = typeof data["id"] === "string" ? data["id"] : undefined;
      if (!roomKey) throw new Error("Room key is required");
      if (!displayName || displayName.length > 50) throw new Error("Invalid display name");
      const textError = validateChatMessageText(text);
      if (textError) throw new Error(textError);
      return rooms.insertChatMessage(roomKey, displayName, text, id);
    },
    "record-room-visit": async (data) => {
      const input = normalizeRoomVisitInput(
        stringValue(data, "visitId"),
        stringValue(data, "sceneSlug"),
      );
      return operational.registerRoomVisit(input.visitId, input.sceneSlug);
    },
    "record-room-listening": async (data) => {
      const input = normalizeRoomListeningInput(
        stringValue(data, "visitId"),
        stringValue(data, "sceneSlug"),
        Number(data["seconds"]),
      );
      return operational.recordListening(input.visitId, input.sceneSlug, input.seconds);
    },
    "report-playback-source-failure": async (data) => {
      const input = normalizePlaybackSourceFailureInput(
        stringValue(data, "sourceId"),
        Number(data["errorCode"]),
      );
      return operational.recordSourceFailure(input.sourceId, input.errorCode);
    },
  };
}

const uuid = z.string().uuid();
const sceneIdInput = z.object({ sceneId: uuid });
const youtubeInput = z.string().trim().min(1).max(2048);
const songDraft = z.object({
  input: youtubeInput,
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200),
  year: z.number().int().min(1900).max(2100).nullable(),
  providerTitle: z.string().max(300).optional(),
  providerChannel: z.string().max(300).optional(),
});

async function adminOperations(): Promise<Record<string, Operation>> {
  const admin = await import("@/lib/admin.server");
  return {
    "admin-onboarding": async () => admin.getAdminOnboardingStatus(),
    "admin-bootstrap": async () => admin.getAdminBootstrap(),
    "admin-songs": async (data) => admin.getAdminSongs(sceneIdInput.parse(data).sceneId),
    "admin-analytics": async (data) =>
      admin.getAdminAnalytics(typeof data["since"] === "string" ? data["since"] : undefined),
    "admin-ambience": async (data) => admin.getAdminAmbience(sceneIdInput.parse(data).sceneId),
    "admin-ambience-assets": async () => admin.getAdminAmbienceAssets(),
    "admin-background": async (data) => admin.getAdminBackground(sceneIdInput.parse(data).sceneId),
    "admin-songs-preview": async (data) =>
      admin.previewSongs(z.array(youtubeInput).min(1).max(50).parse(data["inputs"])),
    "admin-songs-add": async (data) => {
      const input = z
        .object({ queueId: uuid, songs: z.array(songDraft).min(1).max(50) })
        .parse(data);
      return admin.addSongs(input.queueId, input.songs as Parameters<typeof admin.addSongs>[1]);
    },
    "admin-songs-remove": async (data) => {
      const input = z
        .object({ queueId: uuid, membershipIds: z.array(uuid).min(1).max(50) })
        .parse(data);
      return admin.removeSongs(input.queueId, input.membershipIds);
    },
    "admin-song-update": async (data) =>
      admin.updateSong(data as Parameters<typeof admin.updateSong>[0]),
    "admin-ambience-profile-save": async (data) =>
      admin.saveAmbienceProfile(data as Parameters<typeof admin.saveAmbienceProfile>[0]),
    "admin-ambience-stem-save": async (data) =>
      admin.saveAmbienceStem(data as Parameters<typeof admin.saveAmbienceStem>[0]),
    "admin-ambience-stem-remove": async (data) =>
      admin.deactivateAmbienceStem(stringValue(data, "stemId")),
    "admin-ambience-upload-reserve": async (data) =>
      admin.reserveAmbienceUpload(stringValue(data, "sceneSlug")),
    "admin-ambience-upload-finalize": async (data) =>
      admin.finalizeAmbienceUpload(data as Parameters<typeof admin.finalizeAmbienceUpload>[0]),
    "admin-background-upload-reserve": async (data) =>
      admin.reserveBackgroundUpload(stringValue(data, "sceneId")),
    "admin-background-upload-discard": async (data) =>
      admin.discardBackgroundUpload(
        stringValue(data, "sceneId"),
        stringValue(data, "path"),
        stringValue(data, "reservationId"),
      ),
    "admin-presentation-save": async (data) =>
      admin.saveScenePresentation(data as Parameters<typeof admin.saveScenePresentation>[0]),
  };
}

const publicNames = new Set([
  "list-scenes",
  "get-room",
  "get-room-ambience",
  "get-room-presentation",
  "get-chat-messages",
  "send-chat-message",
  "record-room-visit",
  "record-room-listening",
  "report-playback-source-failure",
]);
const adminNames = new Set([
  "admin-onboarding",
  "admin-bootstrap",
  "admin-songs",
  "admin-analytics",
  "admin-ambience",
  "admin-ambience-assets",
  "admin-background",
  "admin-songs-preview",
  "admin-songs-add",
  "admin-songs-remove",
  "admin-song-update",
  "admin-ambience-profile-save",
  "admin-ambience-stem-save",
  "admin-ambience-stem-remove",
  "admin-ambience-upload-reserve",
  "admin-ambience-upload-finalize",
  "admin-background-upload-reserve",
  "admin-background-upload-discard",
  "admin-presentation-save",
]);

app.post("/api/v1/functions/:operation", async (context) => {
  const operation = context.req.param("operation");
  const requestId = context.res.headers.get("x-request-id") ?? crypto.randomUUID();
  const origin = context.req.header("origin")?.replace(/\/$/, "");
  if (origin && !allowedOrigins.has(origin)) {
    return context.json(
      { error: { code: "ORIGIN_DENIED", message: "Request origin is not allowed", requestId } },
      403,
    );
  }

  const startedAt = performance.now();
  try {
    if (!publicNames.has(operation) && !adminNames.has(operation)) {
      return context.json(
        { error: { code: "NOT_FOUND", message: "Unknown API operation", requestId } },
        404,
      );
    }
    const payload = record(await context.req.json());
    const data = record(payload["data"] ?? {});
    const operations = publicNames.has(operation)
      ? await publicOperations()
      : await adminOperations();
    const handler = operations[operation];
    if (!handler) throw new Error("API operation is unavailable");
    const result = await handler(data);
    console.info("[api-operation]", {
      operation,
      result: "success",
      durationMs: Math.round(performance.now() - startedAt),
      requestId,
    });
    return context.json({ data: result ?? null });
  } catch (error) {
    const failure = classifyApiError(error);
    console.error("[api-operation]", {
      operation,
      result: "failure",
      durationMs: Math.round(performance.now() - startedAt),
      requestId,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return context.json(
      { error: { code: failure.code, message: failure.message, requestId } },
      failure.status,
    );
  }
});

app.get("/api/admin-cleanup", async (context) => {
  const expected = process.env["CRON_SECRET"];
  if (!expected || context.req.header("authorization") !== `Bearer ${expected}`) {
    return context.json({ error: "Unauthorized" }, 401);
  }
  try {
    const { runAdminCleanup } = await import("@/lib/admin-cleanup.server");
    return context.json(await runAdminCleanup());
  } catch (error) {
    console.error("[admin-cleanup] failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return context.json({ error: "Cleanup failed" }, 500);
  }
});

export function startApiServer() {
  const port = Number(process.env["PORT"] ?? 8787);
  const server = serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, ({ port: boundPort }) => {
    console.info("[render-api] listening", { port: boundPort });
  });
  void import("@/lib/room-realtime.server").then(({ attachRoomRealtime }) =>
    attachRoomRealtime(server, allowedOrigins),
  );

  async function shutdown(signal: string) {
    console.info("[render-api] shutting down", { signal });
    server.close();
    const { neonPool } = await import("@/db/client.server").catch(() => ({ neonPool: null }));
    await neonPool?.end();
    process.exit(0);
  }

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
  return server;
}

const directEntry = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (directEntry === import.meta.url) startApiServer();

export default app;
