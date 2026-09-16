import {
  normalizePlaybackSourceFailureInput,
  normalizeRoomListeningInput,
  normalizeRoomVisitInput,
} from "./rooms.operations";
import { neonOperationalWriteRepository } from "./rooms.operations.neon.server";
import type {
  PlaybackSourceFailureInput,
  RoomListeningInput,
  RoomVisitInput,
} from "./rooms.operations";

export type OperationalWriteRepository = {
  registerRoomVisit(input: RoomVisitInput): Promise<void>;
  recordListening(input: RoomListeningInput): Promise<void>;
  recordSourceFailure(input: PlaybackSourceFailureInput): Promise<{ recorded: boolean }>;
};

export async function registerRoomVisit(visitId: string, sceneSlug: string): Promise<void> {
  await neonOperationalWriteRepository.registerRoomVisit(
    normalizeRoomVisitInput(visitId, sceneSlug),
  );
}

export async function recordListening(
  visitId: string,
  sceneSlug: string,
  seconds: number,
): Promise<void> {
  await neonOperationalWriteRepository.recordListening(
    normalizeRoomListeningInput(visitId, sceneSlug, seconds),
  );
}

export async function recordSourceFailure(sourceId: string, errorCode: number) {
  return neonOperationalWriteRepository.recordSourceFailure(
    normalizePlaybackSourceFailureInput(sourceId, errorCode),
  );
}
