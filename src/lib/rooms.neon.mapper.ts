import type {
  AmbienceProfile,
  AmbienceSource,
  AmbienceStem,
  OneLiner,
  QueueItem,
  Scene,
} from "./rooms.functions";

export type NeonSceneRow = {
  id: string;
  slug: string;
  titleEn: string;
  titleHi: string;
  hook: string;
  description: string | null;
  region: string | null;
  category: string;
  palette: unknown;
  artKey: string;
  backgroundStoragePath: string | null;
  foregroundTextColor: string;
  isDark: boolean;
  chatMode: string;
  gagLabel: string | null;
  sortOrder: number;
  tags: string[];
};

export type NeonOneLinerRow = {
  id: string;
  textEn: string;
  textHi: string | null;
  daypartTag: string;
};

export type NeonMembershipRow = {
  id: string;
  position: number;
  daypartTag: string;
  trackId: string;
  title: string;
  artist: string | null;
  year: number | null;
};

export type NeonPlaybackSourceRow = {
  id: string;
  trackId: string;
  provider: string;
  providerItemId: string;
  sourceUrl: string;
  providerTitle: string | null;
  providerChannel: string | null;
  priority: number;
};

export type NeonAmbienceProfileRow = {
  id: string;
  maxMasterGain: string;
  musicDuckRatio: string;
  fadeOutMs: number;
  fadeInMs: number;
  audioTheme: unknown;
  visualTheme: unknown;
};

export type NeonStemRow = {
  id: string;
  assetId: string;
  name: string;
  role: string | null;
  storagePath: string;
  defaultVolume: string;
  minGain: string;
  maxGain: string;
  crossfadeMs: number;
  loopStartSeconds: string;
  loopEndSeconds: string | null;
  eventMinSeconds: number | null;
  eventMaxSeconds: number | null;
};

export type NeonAmbienceSourceRow = Omit<AmbienceSource, "source_url"> & {
  assetId: string;
  source_url: string | null;
};

type StorageUrl = (bucket: string, path: string | null | undefined) => string | null;

function ambienceRole(role: string | null): AmbienceStem["role"] {
  if (role === "base" || role === "texture" || role === "event") return role;
  throw new Error("Active ambience stem has an invalid role.");
}

export function mapNeonScene(row: NeonSceneRow, storageUrl: StorageUrl): Scene {
  return {
    id: row.id,
    slug: row.slug,
    title_en: row.titleEn,
    title_hi: row.titleHi,
    hook: row.hook,
    description: row.description,
    region: row.region,
    category: row.category,
    palette: row.palette as Record<string, string>,
    art_key: row.artKey,
    background_storage_path: row.backgroundStoragePath,
    background_url: storageUrl("scene-media", row.backgroundStoragePath),
    foreground_text_color: row.foregroundTextColor || "#FFF3D6",
    is_dark: row.isDark,
    chat_mode: row.chatMode,
    gag_label: row.gagLabel,
    sort_order: row.sortOrder,
    tags: row.tags,
  };
}

export function mapNeonOneLiners(rows: NeonOneLinerRow[]): OneLiner[] {
  return rows.map((row) => ({
    id: row.id,
    text_en: row.textEn,
    text_hi: row.textHi,
    display_text: row.textHi ?? row.textEn,
    daypart_tag: row.daypartTag,
  }));
}

export function mapNeonQueue(
  memberships: NeonMembershipRow[],
  sourceRows: NeonPlaybackSourceRow[],
): QueueItem[] {
  const sourcesByTrack = new Map<string, NeonPlaybackSourceRow[]>();
  for (const source of sourceRows) {
    const existing = sourcesByTrack.get(source.trackId) ?? [];
    existing.push(source);
    sourcesByTrack.set(source.trackId, existing);
  }

  return memberships.map((membership) => ({
    id: membership.id,
    position: membership.position,
    daypart_tag: membership.daypartTag,
    track: {
      id: membership.trackId,
      title: membership.title,
      artist: membership.artist,
      year: membership.year,
    },
    sources: (sourcesByTrack.get(membership.trackId) ?? [])
      .sort((a, b) => a.priority - b.priority)
      .map((source) => ({
        id: source.id,
        provider: source.provider as "youtube",
        provider_item_id: source.providerItemId,
        source_url: source.sourceUrl,
        provider_title: source.providerTitle,
        provider_channel: source.providerChannel,
        priority: source.priority,
      })),
  }));
}

export function mapNeonAmbience(
  profile: NeonAmbienceProfileRow | undefined,
  stems: NeonStemRow[],
  sourceRows: NeonAmbienceSourceRow[],
  storageUrl: StorageUrl,
): AmbienceProfile | null {
  if (!profile) return null;

  const sourcesByAsset = new Map<string, NeonAmbienceSourceRow[]>();
  for (const source of sourceRows) {
    const existing = sourcesByAsset.get(source.assetId) ?? [];
    existing.push(source);
    sourcesByAsset.set(source.assetId, existing);
  }

  const visual = profile.visualTheme as AmbienceProfile["visual_theme"];
  return {
    id: profile.id,
    max_master_gain: Number(profile.maxMasterGain),
    music_duck_ratio: Number(profile.musicDuckRatio),
    fade_out_ms: profile.fadeOutMs,
    fade_in_ms: profile.fadeInMs,
    audio_theme: profile.audioTheme as AmbienceProfile["audio_theme"],
    visual_theme: {
      ...visual,
      ...(visual.overlay_path
        ? { overlay_url: storageUrl("scene-media", visual.overlay_path)! }
        : {}),
    },
    stems: stems.map((stem): AmbienceStem => ({
      id: stem.id,
      name: stem.name,
      role: ambienceRole(stem.role),
      url: storageUrl("ambience-audio", stem.storagePath) ?? "",
      default_gain: Number(stem.defaultVolume),
      min_gain: Number(stem.minGain),
      max_gain: Number(stem.maxGain),
      crossfade_ms: stem.crossfadeMs,
      loop_start_seconds: Number(stem.loopStartSeconds),
      loop_end_seconds: stem.loopEndSeconds == null ? null : Number(stem.loopEndSeconds),
      event_min_seconds: stem.eventMinSeconds,
      event_max_seconds: stem.eventMaxSeconds,
      sources: (sourcesByAsset.get(stem.assetId) ?? [])
        .sort((a, b) => a.source_order - b.source_order)
        .map(({ assetId: _assetId, ...source }) => ({
          ...source,
          source_url: source.source_url ?? "",
        })),
    })),
  };
}
