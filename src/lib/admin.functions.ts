import { createServerFn } from "@tanstack/react-start";
import { analyticsSince, type AnalyticsRange } from "./admin-analytics";
import { addSongs, getAdminDashboard, previewSongs, removeSongs, updateSong } from "./admin.server";

export const getAdminData = createServerFn({ method: "GET" })
  .validator((data: { range: AnalyticsRange }) => data)
  .handler(({ data }) => {
    return getAdminDashboard(analyticsSince(data.range));
  });

export const previewAdminSongs = createServerFn({ method: "POST" })
  .validator((data: { inputs: string[] }) => ({ inputs: data.inputs.map(String) }))
  .handler(({ data }) => previewSongs(data.inputs));

export const addAdminSongs = createServerFn({ method: "POST" })
  .validator((data: { queueId: string; songs: Array<{ input: string; title: string; artist: string; year: number | null; providerTitle?: string; providerChannel?: string }> }) => data)
  .handler(({ data }) => addSongs(data.queueId, data.songs));

export const removeAdminSongs = createServerFn({ method: "POST" })
  .validator((data: { queueId: string; membershipIds: string[] }) => ({ queueId: String(data.queueId), membershipIds: data.membershipIds.map(String) }))
  .handler(({ data }) => removeSongs(data.queueId, data.membershipIds));

export const updateAdminSong = createServerFn({ method: "POST" })
  .validator((data: { membershipId: string; title: string; artist: string; year: number | null; source: string; scope: "shared" | "local" }) => data)
  .handler(({ data }) => updateSong(data));
