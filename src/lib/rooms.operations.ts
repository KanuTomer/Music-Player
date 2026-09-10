const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PLAYBACK_FAILURE_CODES = [2, 5, 100, 101, 150, 153] as const;

export type RoomVisitInput = {
  visitId: string;
  sceneSlug: string;
};

export type RoomListeningInput = RoomVisitInput & {
  seconds: number;
};

export type PlaybackSourceFailureInput = {
  sourceId: string;
  errorCode: number;
};

function validUuid(value: unknown, label: string): string {
  const normalized = String(value);
  if (!UUID.test(normalized)) throw new Error(`Invalid ${label}`);
  return normalized;
}

function validSceneSlug(value: unknown): string {
  if (typeof value !== "string") throw new Error("Invalid scene slug");
  const normalized = value.trim();
  if (!normalized) throw new Error("Invalid scene slug");
  return normalized;
}

export function normalizeRoomVisitInput(visitId: unknown, sceneSlug: unknown): RoomVisitInput {
  return {
    visitId: validUuid(visitId, "visit identifier"),
    sceneSlug: validSceneSlug(sceneSlug),
  };
}

export function normalizeRoomListeningInput(
  visitId: unknown,
  sceneSlug: unknown,
  seconds: unknown,
): RoomListeningInput {
  const numericSeconds = Number(seconds);
  if (!Number.isFinite(numericSeconds)) throw new Error("Invalid listening duration");
  return {
    ...normalizeRoomVisitInput(visitId, sceneSlug),
    seconds: Math.min(60, Math.max(1, Math.floor(numericSeconds))),
  };
}

export function normalizePlaybackSourceFailureInput(
  sourceId: unknown,
  errorCode: unknown,
): PlaybackSourceFailureInput {
  const numericErrorCode = Number(errorCode);
  if (!(PLAYBACK_FAILURE_CODES as readonly number[]).includes(numericErrorCode)) {
    throw new Error("Invalid player error");
  }
  return {
    sourceId: validUuid(sourceId, "source identifier"),
    errorCode: numericErrorCode,
  };
}
