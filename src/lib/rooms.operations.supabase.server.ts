import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { OperationalWriteRepository } from "./rooms.operations.server";

type OperationalSupabaseClient = Pick<typeof supabaseAdmin, "from" | "rpc">;

export function createSupabaseOperationalWriteRepository(
  client: OperationalSupabaseClient,
): OperationalWriteRepository {
  return {
    async registerRoomVisit({ visitId, sceneSlug }) {
      const { data: scene, error: sceneError } = await client
        .from("scenes")
        .select("id")
        .eq("slug", sceneSlug)
        .eq("is_live", true)
        .maybeSingle();
      if (sceneError) throw new Error(sceneError.message);
      if (!scene) return;

      const { error } = await client
        .from("room_visits")
        .upsert({ id: visitId, scene_id: scene.id }, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw new Error(error.message);
    },

    async recordListening({ visitId, sceneSlug, seconds }) {
      const { data: scene, error: sceneError } = await client
        .from("scenes")
        .select("id")
        .eq("slug", sceneSlug)
        .eq("is_live", true)
        .maybeSingle();
      if (sceneError) throw new Error(sceneError.message);
      if (!scene) return;

      const { error } = await client.rpc("record_room_heartbeat", {
        p_visit_id: visitId,
        p_scene_id: scene.id,
        p_seconds: seconds,
      });
      if (error) throw new Error(error.message);
    },

    async recordSourceFailure({ sourceId, errorCode }) {
      const { error } = await client.rpc("record_playback_source_failure", {
        p_source_id: sourceId,
        p_error_code: errorCode,
      });
      if (error) throw new Error(error.message);
      return { recorded: true };
    },
  };
}

export const supabaseOperationalWriteRepository =
  createSupabaseOperationalWriteRepository(supabaseAdmin);
