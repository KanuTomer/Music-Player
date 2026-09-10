import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client.server";
import {
  ambienceAssetSources,
  ambienceAssets,
  ambienceProfiles,
  curatedSets,
  curatedSetTracks,
  oneliners,
  playbackSources,
  scenes,
  soundStems,
  tracks,
} from "@/db/schema";
import { publicStorageUrl } from "./public-storage.server";
import type { RoomPayload, RoomPresentation } from "./rooms.functions";
import { mapNeonAmbience, mapNeonOneLiners, mapNeonQueue, mapNeonScene } from "./rooms.neon.mapper";

const sceneSelection = {
  id: scenes.id,
  slug: scenes.slug,
  titleEn: scenes.titleEn,
  titleHi: scenes.titleHi,
  hook: scenes.hook,
  description: scenes.description,
  region: scenes.region,
  category: scenes.category,
  palette: scenes.palette,
  artKey: scenes.artKey,
  backgroundStoragePath: scenes.backgroundStoragePath,
  foregroundTextColor: scenes.foregroundTextColor,
  isDark: scenes.isDark,
  chatMode: scenes.chatMode,
  gagLabel: scenes.gagLabel,
  sortOrder: scenes.sortOrder,
  tags: scenes.tags,
};

async function loadAmbience(sceneId: string) {
  const [profile] = await db
    .select({
      id: ambienceProfiles.id,
      maxMasterGain: ambienceProfiles.maxMasterGain,
      musicDuckRatio: ambienceProfiles.musicDuckRatio,
      fadeOutMs: ambienceProfiles.fadeOutMs,
      fadeInMs: ambienceProfiles.fadeInMs,
      audioTheme: ambienceProfiles.audioTheme,
      visualTheme: ambienceProfiles.visualTheme,
    })
    .from(ambienceProfiles)
    .where(and(eq(ambienceProfiles.sceneId, sceneId), eq(ambienceProfiles.enabled, true)))
    .limit(1);

  if (!profile) return null;

  const stems = await db
    .select({
      id: soundStems.id,
      assetId: ambienceAssets.id,
      name: soundStems.name,
      role: soundStems.role,
      storagePath: ambienceAssets.storagePath,
      defaultVolume: soundStems.defaultVolume,
      minGain: soundStems.minGain,
      maxGain: soundStems.maxGain,
      crossfadeMs: soundStems.crossfadeMs,
      loopStartSeconds: soundStems.loopStartSeconds,
      loopEndSeconds: soundStems.loopEndSeconds,
      eventMinSeconds: soundStems.eventMinSeconds,
      eventMaxSeconds: soundStems.eventMaxSeconds,
    })
    .from(soundStems)
    .innerJoin(ambienceAssets, eq(soundStems.assetId, ambienceAssets.id))
    .where(and(eq(soundStems.sceneId, sceneId), eq(soundStems.isActive, true)))
    .orderBy(asc(soundStems.sortOrder));

  const assetIds = stems.map((stem) => stem.assetId);
  const sources = assetIds.length
    ? await db
        .select({
          assetId: ambienceAssetSources.assetId,
          source_url: ambienceAssetSources.sourceUrl,
          source_title: ambienceAssetSources.sourceTitle,
          source_order: ambienceAssetSources.sourceOrder,
        })
        .from(ambienceAssetSources)
        .where(inArray(ambienceAssetSources.assetId, assetIds))
        .orderBy(asc(ambienceAssetSources.sourceOrder))
    : [];

  return mapNeonAmbience(profile, stems, sources, publicStorageUrl);
}

async function fetchScenesFromNeon() {
  const rows = await db
    .select(sceneSelection)
    .from(scenes)
    .where(eq(scenes.isLive, true))
    .orderBy(asc(scenes.sortOrder));
  return rows.map((row) => mapNeonScene(row, publicStorageUrl));
}

async function fetchRoomFromNeon(slug: string): Promise<RoomPayload | null> {
  const [scene] = await db
    .select(sceneSelection)
    .from(scenes)
    .where(eq(scenes.slug, slug))
    .limit(1);
  if (!scene) return null;

  const [curatedSet] = await db
    .select({
      id: curatedSets.id,
      title: curatedSets.title,
      shuffleStart: curatedSets.shuffleStart,
    })
    .from(curatedSets)
    .where(and(eq(curatedSets.sceneId, scene.id), eq(curatedSets.isActive, true)))
    .limit(1);
  if (!curatedSet) throw new Error(`Active curated set is unavailable for room '${slug}'.`);

  const [lineRows, memberships, ambience] = await Promise.all([
    db
      .select({
        id: oneliners.id,
        textEn: oneliners.textEn,
        textHi: oneliners.textHi,
        daypartTag: oneliners.daypartTag,
      })
      .from(oneliners)
      .where(eq(oneliners.sceneId, scene.id)),
    db
      .select({
        id: curatedSetTracks.id,
        position: curatedSetTracks.position,
        daypartTag: curatedSetTracks.daypartTag,
        trackId: tracks.id,
        title: tracks.title,
        artist: tracks.artist,
        year: tracks.year,
      })
      .from(curatedSetTracks)
      .innerJoin(tracks, eq(curatedSetTracks.trackId, tracks.id))
      .where(eq(curatedSetTracks.curatedSetId, curatedSet.id))
      .orderBy(asc(curatedSetTracks.position)),
    loadAmbience(scene.id),
  ]);

  const trackIds = memberships.map((membership) => membership.trackId);
  const sourceRows = trackIds.length
    ? await db
        .select({
          id: playbackSources.id,
          trackId: playbackSources.trackId,
          provider: playbackSources.provider,
          providerItemId: playbackSources.providerItemId,
          sourceUrl: playbackSources.sourceUrl,
          providerTitle: playbackSources.providerTitle,
          providerChannel: playbackSources.providerChannel,
          priority: playbackSources.priority,
        })
        .from(playbackSources)
        .where(and(inArray(playbackSources.trackId, trackIds), eq(playbackSources.isActive, true)))
        .orderBy(asc(playbackSources.priority))
    : [];

  return {
    scene: mapNeonScene(scene, publicStorageUrl),
    curatedSet: {
      id: curatedSet.id,
      title: curatedSet.title,
      shuffle_start: curatedSet.shuffleStart,
    },
    queue: mapNeonQueue(memberships, sourceRows),
    oneliners: mapNeonOneLiners(lineRows),
    ambience,
  };
}

async function fetchRoomPresentationFromNeon(sceneId: string): Promise<RoomPresentation | null> {
  const [scene] = await db
    .select({
      id: scenes.id,
      backgroundStoragePath: scenes.backgroundStoragePath,
      foregroundTextColor: scenes.foregroundTextColor,
      gagLabel: scenes.gagLabel,
    })
    .from(scenes)
    .where(and(eq(scenes.id, sceneId), eq(scenes.isLive, true)))
    .limit(1);
  if (!scene) return null;

  const lineRows = await db
    .select({
      id: oneliners.id,
      textEn: oneliners.textEn,
      textHi: oneliners.textHi,
      daypartTag: oneliners.daypartTag,
    })
    .from(oneliners)
    .where(eq(oneliners.sceneId, sceneId));

  return {
    scene_id: scene.id,
    background_storage_path: scene.backgroundStoragePath,
    background_url: publicStorageUrl("scene-media", scene.backgroundStoragePath),
    foreground_text_color: scene.foregroundTextColor,
    gag_label: scene.gagLabel,
    oneliners: mapNeonOneLiners(lineRows),
  };
}

export const neonRoomReadRepository = {
  fetchScenes: fetchScenesFromNeon,
  fetchRoom: fetchRoomFromNeon,
  fetchRoomAmbience: loadAmbience,
  fetchRoomPresentation: fetchRoomPresentationFromNeon,
};
