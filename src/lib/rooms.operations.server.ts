import {
  normalizePlaybackSourceFailureInput,
  normalizeRoomListeningInput,
  normalizeRoomVisitInput,
  type PlaybackSourceFailureInput,
  type RoomListeningInput,
  type RoomVisitInput,
} from "./rooms.operations";
import {
  resolveOperationalWriteBackend,
  selectOperationalWriteRepository,
  type DataBackend,
} from "./rooms.backend.server";

export type OperationalWriteRepository = {
  registerRoomVisit: (input: RoomVisitInput) => Promise<void>;
  recordListening: (input: RoomListeningInput) => Promise<void>;
  recordSourceFailure: (input: PlaybackSourceFailureInput) => Promise<{ recorded: true }>;
};

async function operationalWriteRepository(backend: DataBackend) {
  return selectOperationalWriteRepository<OperationalWriteRepository>(
    async () => {
      const { supabaseOperationalWriteRepository } =
        await import("./rooms.operations.supabase.server");
      return supabaseOperationalWriteRepository;
    },
    async () => {
      const { neonOperationalWriteRepository } = await import("./rooms.operations.neon.server");
      return neonOperationalWriteRepository;
    },
    backend,
  );
}

async function runOperationalWrite<T>(
  operation: string,
  run: (repository: OperationalWriteRepository) => Promise<T>,
): Promise<T> {
  const backend = resolveOperationalWriteBackend();
  try {
    return await run(await operationalWriteRepository(backend));
  } catch (error) {
    console.error("[room-operational-write]", {
      operation,
      backend,
      error: error instanceof Error ? error.message : "Unknown operational write failure",
    });
    throw error;
  }
}

export async function registerRoomVisit(visitId: string, sceneSlug: string): Promise<void> {
  const input = normalizeRoomVisitInput(visitId, sceneSlug);
  await runOperationalWrite("room_visit.register", (repository) =>
    repository.registerRoomVisit(input),
  );
}

export async function recordListening(
  visitId: string,
  sceneSlug: string,
  seconds: number,
): Promise<void> {
  const input = normalizeRoomListeningInput(visitId, sceneSlug, seconds);
  await runOperationalWrite("room_listening.record", (repository) =>
    repository.recordListening(input),
  );
}

export async function recordSourceFailure(sourceId: string, errorCode: number) {
  const input = normalizePlaybackSourceFailureInput(sourceId, errorCode);
  return runOperationalWrite("playback_source_failure.record", (repository) =>
    repository.recordSourceFailure(input),
  );
}
