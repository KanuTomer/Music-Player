export type AdminTrack = {
  membershipId: string;
  trackId: string;
  position: number;
  title: string;
  artist: string | null;
  year: number | null;
  videoId: string;
  sourceUrl: string;
  sharedActiveUses: number;
};
export type AdminAsset = {
  id: string;
  storagePath: string;
  byteSize: number;
  durationSeconds: number;
  publicUrl: string;
};
export type AdminAmbienceStem = {
  id: string;
  name: string;
  role: "base" | "texture" | "event";
  assetId: string;
  isActive: boolean;
  sortOrder: number;
  defaultVolume: number;
  minGain: number;
  maxGain: number;
  crossfadeMs: number;
  loopStartSeconds: number;
  loopEndSeconds: number | null;
  eventMinSeconds: number | null;
  eventMaxSeconds: number | null;
};
export type AdminAmbience = {
  id: string;
  enabled: boolean;
  maxMasterGain: number;
  musicDuckRatio: number;
  fadeInMs: number;
  fadeOutMs: number;
  audioTheme: Record<string, Record<string, number>>;
  stems: AdminAmbienceStem[];
};
export type AnalyticsRow = {
  sceneId: string;
  slug: string;
  title: string;
  visits: number;
  playedVisits: number;
  listeningSeconds: number;
  averageListeningSeconds: number;
};
export type AdminSceneSummary = {
  id: string;
  slug: string;
  title: string;
  titleHi: string;
  queueId: string;
  trackCount: number;
  artKey: string;
  isDark: boolean;
  gagLabel: string | null;
  backgroundStoragePath: string | null;
  backgroundUrl: string | null;
  foregroundTextColor: string;
};
export type AdminOneLiner = {
  id: string;
  text: string;
  daypart: "all" | "morning" | "day" | "evening" | "night";
};
export type AdminBackground = { scene: AdminSceneSummary; oneliners: AdminOneLiner[] };
export type AdminOnboardingStatus =
  "not_authorized" | "mfa_enrollment_required" | "mfa_challenge_required" | "ready";
export type AdminIdentity = { email: string; displayName: string | null; avatarUrl: string | null };
export type AdminBootstrap = { scenes: AdminSceneSummary[]; identity: AdminIdentity };
export type AdminSongs = { queueId: string; tracks: AdminTrack[] };
export type AdminAmbienceResult = { ambience: AdminAmbience | null };
export type AdminUploadReservation = { reservationId: string; path: string; token: string };
export type SongDraft = {
  input: string;
  title: string;
  artist: string;
  year: number | null;
  providerTitle?: string;
  providerChannel?: string;
};
