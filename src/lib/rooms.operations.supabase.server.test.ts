import { describe, expect, test } from "bun:test";
import { createSupabaseOperationalWriteRepository } from "./rooms.operations.supabase.server";

const VISIT_ID = "f6adb0b3-5e24-4799-b008-2ff909e97e6e";
const SOURCE_ID = "3d2d3988-2b25-41ea-812b-e08340426f72";

describe("Supabase operational-write fallback", () => {
  test("preserves the existing room table and RPC paths", async () => {
    const calls: Array<{ name: string; value?: unknown }> = [];
    const sceneQuery = {
      select(value: string) {
        calls.push({ name: "select", value });
        return this;
      },
      eq(column: string, value: unknown) {
        calls.push({ name: `eq:${column}`, value });
        return this;
      },
      async maybeSingle() {
        return { data: { id: SOURCE_ID }, error: null };
      },
    };
    const roomVisits = {
      async upsert(value: unknown, options: unknown) {
        calls.push({ name: "room_visits.upsert", value: { value, options } });
        return { error: null };
      },
    };
    const client = {
      from(table: string) {
        calls.push({ name: "from", value: table });
        return table === "scenes" ? sceneQuery : roomVisits;
      },
      async rpc(name: string, value: unknown) {
        calls.push({ name: `rpc:${name}`, value });
        return { error: null };
      },
    };
    const repository = createSupabaseOperationalWriteRepository(client as never);

    await repository.registerRoomVisit({ visitId: VISIT_ID, sceneSlug: "officers-mess" });
    await repository.recordListening({
      visitId: VISIT_ID,
      sceneSlug: "officers-mess",
      seconds: 15,
    });
    await repository.recordSourceFailure({ sourceId: SOURCE_ID, errorCode: 2 });

    expect(calls.filter((call) => call.name === "from").map((call) => call.value)).toEqual([
      "scenes",
      "room_visits",
      "scenes",
    ]);
    expect(calls.some((call) => call.name === "room_visits.upsert")).toBe(true);
    expect(calls.some((call) => call.name === "rpc:record_room_heartbeat")).toBe(true);
    expect(calls.some((call) => call.name === "rpc:record_playback_source_failure")).toBe(true);
  });
});
