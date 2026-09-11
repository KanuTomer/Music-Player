import { createFileRoute } from "@tanstack/react-router";

async function cleanup(request: Request) {
  const expected = process.env["CRON_SECRET"];
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const startedAt = performance.now();
  const requestId = crypto.randomUUID();
  try {
    const { runAdminCleanup } = await import("@/lib/admin-cleanup.server");
    const result = await runAdminCleanup();
    console.info("[admin-cleanup]", {
      requestId,
      result: result.failed ? "partial" : "success",
      backend: result.backend,
      claimed: result.claimed,
      removed: result.removed,
      skipped: result.skipped,
      failed: result.failed,
      chatDeleted: result.chatDeleted,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return Response.json({ ok: result.failed === 0, requestId, ...result });
  } catch (error) {
    console.error("[admin-cleanup] failed", {
      requestId,
      error: error instanceof Error ? error.name : "UnknownError",
      durationMs: Math.round(performance.now() - startedAt),
    });
    return Response.json({ ok: false, requestId }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/admin-cleanup")({
  server: { handlers: { GET: ({ request }) => cleanup(request) } },
});
