import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_OBJECTS_PER_RUN = 100;

async function cleanup(request: Request) {
  const expected = process.env["CRON_SECRET"];
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const startedAt = performance.now();
  const requestId = crypto.randomUUID();
  const { data: retention, error: retentionError } = await supabaseAdmin.rpc("admin_run_retention");
  if (retentionError) {
    console.error("[admin-cleanup] retention failed", { requestId });
    return Response.json({ ok: false, requestId }, { status: 500 });
  }

  const { data: queued, error: queueError } = await supabaseAdmin
    .from("admin_storage_cleanup_queue")
    .select("id, bucket, object_path, attempts")
    .is("completed_at", null)
    .lte("available_at", new Date().toISOString())
    .order("created_at")
    .limit(MAX_OBJECTS_PER_RUN);
  if (queueError) {
    console.error("[admin-cleanup] queue read failed", { requestId });
    return Response.json({ ok: false, requestId }, { status: 500 });
  }

  let removed = 0;
  let failed = 0;
  for (const item of (queued ?? []) as Array<{
    id: string;
    bucket: string;
    object_path: string;
    attempts: number;
  }>) {
    const { error } = await supabaseAdmin.storage.from(item.bucket).remove([item.object_path]);
    if (!error) {
      removed += 1;
      await Promise.all([
        supabaseAdmin
          .from("admin_storage_cleanup_queue")
          .update({ completed_at: new Date().toISOString(), last_error: null })
          .eq("id", item.id),
        supabaseAdmin
          .from("admin_upload_reservations")
          .update({ discarded_at: new Date().toISOString() })
          .eq("object_path", item.object_path)
          .is("finalized_at", null),
      ]);
    } else {
      failed += 1;
      const attempts = item.attempts + 1;
      const delayMinutes = Math.min(24 * 60, 2 ** Math.min(attempts, 10));
      await supabaseAdmin
        .from("admin_storage_cleanup_queue")
        .update({
          attempts,
          available_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
          last_error: error.name,
        })
        .eq("id", item.id);
    }
  }

  console.info("[admin-cleanup]", {
    requestId,
    result: failed ? "partial" : "success",
    queued: queued?.length ?? 0,
    removed,
    failed,
    durationMs: Math.round(performance.now() - startedAt),
  });
  return Response.json({
    ok: failed === 0,
    requestId,
    retention: retention?.[0] ?? null,
    queued: queued?.length ?? 0,
    removed,
    failed,
  });
}

export const Route = createFileRoute("/api/admin-cleanup")({
  server: { handlers: { GET: ({ request }) => cleanup(request) } },
});
