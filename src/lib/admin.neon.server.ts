import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/db/client.server";
import type {
  AdminAmbience,
  AdminAsset,
  AdminBackground,
  AdminOneLiner,
  AdminSceneSummary,
  AdminTrack,
  AnalyticsRow,
  SongDraft,
} from "./admin.server";
import type { AmbienceRole } from "./ambience-processing";
import { normalizeQueuePositions } from "./queue-positions.neon.server";
import {
  ambienceUploadStemDefaults,
  isAdminStorageBucket,
  storageBucketFor,
  validateStoragePath,
  type AdminStorageBucket,
  type DiscardResult,
  type ReservationStatus,
  type UploadPurpose,
} from "./admin-storage";

// Database rows are narrowed explicitly while mapping each query result.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbRow = any;

type Identity = { id: string; email?: string };
type Executor = { execute(query: ReturnType<typeof sql>): Promise<unknown> };
const resultRows = <T>(result: unknown) => (result as { rows: T[] }).rows;

export async function getLiveSceneSlug(sceneId: string) {
  const rows = resultRows<{ slug: string }>(
    await db.execute(sql`select slug from scenes where id=${sceneId}::uuid and is_live`),
  );
  return rows[0]?.slug ?? null;
}

async function adminTransaction<T>(
  operation: string,
  // Drizzle's transaction type is internal to the configured driver.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  callback: (tx: any) => Promise<T>,
): Promise<T> {
  try {
    return await db.transaction(callback);
  } catch (error) {
    console.error("Neon administrator operation failed", {
      operation,
      backend: "neon",
      message: error instanceof Error ? error.message : "Database operation failed",
    });
    throw error;
  }
}

export const ADMIN_RATE_LIMITS = {
  "songs.preview": [6, 60],
  "upload.reserve": [30, 3600],
  "upload.discard": [120, 3600],
  "ambience.profile": [60, 60],
  "ambience.stem": [60, 60],
  "storage.cleanup": [60, 60],
  "bulk.presentation": [30, 60],
  "upload.finalize": [30, 3600],
  "bulk.songs": [30, 60],
  "songs.update": [60, 60],
} as const;

async function authorize(tx: Executor, actorId: string) {
  const found = resultRows(
    await tx.execute(sql`select user_id from app_admins where user_id=${actorId}::uuid for share`),
  );
  if (found.length !== 1) throw new Error("Administrator access is not authorized");
}

async function consumeRate(tx: Executor, actorId: string, bucket: keyof typeof ADMIN_RATE_LIMITS) {
  const [limit, seconds] = ADMIN_RATE_LIMITS[bucket];
  const rows = resultRows<{ request_count: number }>(
    await tx.execute(sql`
    insert into admin_rate_limits(actor_id,bucket,window_started_at,request_count)
    values(${actorId}::uuid,${bucket},to_timestamp(floor(extract(epoch from now())/${seconds})*${seconds}),1)
    on conflict(actor_id,bucket,window_started_at) do update
      set request_count=admin_rate_limits.request_count+1
    returning request_count`),
  );
  if (Number(rows[0]?.request_count ?? limit + 1) > limit)
    throw new Error("Administrator rate limit exceeded");
}

async function audit(
  tx: Executor,
  actorId: string,
  action: string,
  sceneId: string | null,
  targetId: string | null,
  affectedCount: number,
) {
  await tx.execute(sql`insert into admin_audit_log(actor_id,action,scene_id,target_id,affected_count,request_id)
    values(${actorId}::uuid,${action},${sceneId}::uuid,${targetId},${affectedCount},${randomUUID()}::uuid)`);
}

const storageUrl = async (bucket: string, path: string | null) => {
  if (!path) return null;
  const { publicStorageUrl } = await import("./public-storage.server");
  return publicStorageUrl(bucket, path);
};

export async function getAdminBootstrap(identity: Identity): Promise<{
  scenes: AdminSceneSummary[];
  identity: { email: string; displayName: string | null; avatarUrl: string | null };
}> {
  const sceneRows = resultRows<DbRow>(
    await db.execute(sql`
    select s.id,s.slug,s.title_en,s.title_hi,s.art_key,s.is_dark,s.gag_label,
      s.background_storage_path,s.foreground_text_color,c.id queue_id,count(m.id)::int track_count
    from scenes s join curated_sets c on c.scene_id=s.id and c.is_active
    left join curated_set_tracks m on m.curated_set_id=c.id
    where s.is_live group by s.id,c.id order by s.sort_order`),
  );
  const profiles = resultRows<{ display_name: string | null; avatar_url: string | null }>(
    await db.execute(sql`
    select display_name,avatar_url from profiles where id=${identity.id}::uuid`),
  );
  return {
    scenes: await Promise.all(
      sceneRows.map(async (row) => ({
        id: String(row.id),
        slug: String(row.slug),
        title: String(row.title_en),
        titleHi: String(row.title_hi),
        queueId: String(row.queue_id),
        trackCount: Number(row.track_count),
        artKey: String(row.art_key),
        isDark: Boolean(row.is_dark),
        gagLabel: row.gag_label as string | null,
        backgroundStoragePath: row.background_storage_path as string | null,
        backgroundUrl: await storageUrl(
          "scene-media",
          row.background_storage_path as string | null,
        ),
        foregroundTextColor: String(row.foreground_text_color ?? "#FFF3D6"),
      })),
    ),
    identity: {
      email: identity.email ?? "Administrator",
      displayName: profiles[0]?.display_name ?? null,
      avatarUrl: profiles[0]?.avatar_url ?? null,
    },
  };
}

export async function getAdminDashboard(identity: Identity, since?: string) {
  const [bootstrap, analytics, assets] = await Promise.all([
    getAdminBootstrap(identity),
    getAdminAnalytics(identity, since),
    getAdminAmbienceAssets(identity),
  ]);
  const scenes = await Promise.all(
    bootstrap.scenes.map(async (scene) => {
      const [songs, ambience] = await Promise.all([
        getAdminSongs(identity, scene.id),
        getAdminAmbience(identity, scene.id),
      ]);
      return {
        id: scene.id,
        slug: scene.slug,
        title: scene.title,
        queueId: songs.queueId,
        tracks: songs.tracks,
        ambience: ambience.ambience,
      };
    }),
  );
  return { scenes, analytics, assets, identity: bootstrap.identity };
}

export async function getAdminSongs(
  _identity: Identity,
  sceneId: string,
): Promise<{ queueId: string; tracks: AdminTrack[] }> {
  const rows = resultRows<DbRow>(
    await db.execute(sql`
    select c.id queue_id,m.id membership_id,m.track_id,m.position,t.title,t.artist,t.year,
      p.provider_item_id,p.source_url,
      (select count(*)::int from curated_set_tracks x join curated_sets xc on xc.id=x.curated_set_id and xc.is_active where x.track_id=t.id) shared_uses
    from curated_sets c join curated_set_tracks m on m.curated_set_id=c.id
    join tracks t on t.id=m.track_id join lateral (
      select provider_item_id,source_url from playback_sources where track_id=t.id and is_active order by priority limit 1
    ) p on true where c.scene_id=${sceneId}::uuid and c.is_active order by m.position`),
  );
  if (!rows.length) {
    const queue = resultRows(
      await db.execute(
        sql`select id from curated_sets where scene_id=${sceneId}::uuid and is_active`,
      ),
    );
    if (!queue.length) throw new Error("Active song queue not found");
    return { queueId: String((queue[0] as { id: string }).id), tracks: [] };
  }
  return {
    queueId: String(rows[0]!.queue_id),
    tracks: rows.map((row) => ({
      membershipId: String(row.membership_id),
      trackId: String(row.track_id),
      position: Number(row.position),
      title: String(row.title),
      artist: row.artist as string | null,
      year: row.year as number | null,
      videoId: String(row.provider_item_id),
      sourceUrl: String(row.source_url),
      sharedActiveUses: Number(row.shared_uses),
    })),
  };
}

export async function getAdminAnalytics(
  _identity: Identity,
  since?: string,
): Promise<AnalyticsRow[]> {
  const rows = resultRows<DbRow>(
    await db.execute(sql`
    select s.id,s.slug,s.title_en,count(v.id)::int visits,count(v.first_played_at)::int played,
      coalesce(sum(v.listening_seconds),0)::bigint seconds
    from scenes s left join room_visits v on v.scene_id=s.id and (${since ?? null}::timestamptz is null or v.started_at>=${since ?? null}::timestamptz)
    where s.is_live group by s.id order by s.sort_order`),
  );
  return rows.map((row) => {
    const played = Number(row.played),
      seconds = Number(row.seconds);
    return {
      sceneId: String(row.id),
      slug: String(row.slug),
      title: String(row.title_en),
      visits: Number(row.visits),
      playedVisits: played,
      listeningSeconds: seconds,
      averageListeningSeconds: played ? Math.round(seconds / played) : 0,
    };
  });
}

export async function getAdminAmbience(
  _identity: Identity,
  sceneId: string,
): Promise<{ ambience: AdminAmbience | null }> {
  const profiles = resultRows<DbRow>(
    await db.execute(sql`select * from ambience_profiles where scene_id=${sceneId}::uuid`),
  );
  if (!profiles[0]) return { ambience: null };
  const stems = resultRows<DbRow>(
    await db.execute(
      sql`select * from sound_stems where scene_id=${sceneId}::uuid and asset_id is not null order by sort_order`,
    ),
  );
  const p = profiles[0];
  return {
    ambience: {
      id: String(p.id),
      enabled: Boolean(p.enabled),
      maxMasterGain: Number(p.max_master_gain),
      musicDuckRatio: Number(p.music_duck_ratio),
      fadeInMs: Number(p.fade_in_ms),
      fadeOutMs: Number(p.fade_out_ms),
      audioTheme: (p.audio_theme ?? {}) as Record<string, Record<string, number>>,
      stems: stems.map((s) => ({
        id: String(s.id),
        name: String(s.name),
        role: s.role as AmbienceRole,
        assetId: String(s.asset_id),
        isActive: Boolean(s.is_active),
        sortOrder: Number(s.sort_order),
        defaultVolume: Number(s.default_volume),
        minGain: Number(s.min_gain),
        maxGain: Number(s.max_gain),
        crossfadeMs: Number(s.crossfade_ms),
        loopStartSeconds: Number(s.loop_start_seconds),
        loopEndSeconds: s.loop_end_seconds == null ? null : Number(s.loop_end_seconds),
        eventMinSeconds: s.event_min_seconds == null ? null : Number(s.event_min_seconds),
        eventMaxSeconds: s.event_max_seconds == null ? null : Number(s.event_max_seconds),
      })),
    },
  };
}

export async function getAdminAmbienceAssets(_identity: Identity): Promise<AdminAsset[]> {
  const rows = resultRows<DbRow>(
    await db.execute(
      sql`select id,storage_path,byte_size,duration_seconds from ambience_assets where is_active order by created_at desc`,
    ),
  );
  return Promise.all(
    rows.map(async (r) => ({
      id: String(r.id),
      storagePath: String(r.storage_path),
      byteSize: Number(r.byte_size),
      durationSeconds: Number(r.duration_seconds),
      publicUrl: (await storageUrl("ambience-audio", String(r.storage_path)))!,
    })),
  );
}

export async function getAdminBackground(
  identity: Identity,
  sceneId: string,
): Promise<AdminBackground> {
  const boot = await getAdminBootstrap(identity);
  const scene = boot.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error("Jagah not found");
  const rows = resultRows<{
    id: string;
    text_en: string;
    text_hi: string | null;
    daypart_tag: AdminOneLiner["daypart"];
  }>(
    await db.execute(
      sql`select id,text_en,text_hi,daypart_tag from oneliners where scene_id=${sceneId}::uuid order by id`,
    ),
  );
  return {
    scene,
    oneliners: rows.map((r) => ({
      id: r.id,
      text: r.text_hi ?? r.text_en,
      daypart: r.daypart_tag,
    })),
  };
}

export async function saveAmbienceProfile(
  identity: Identity,
  input: {
    sceneId: string;
    enabled: boolean;
    maxMasterGain: number;
    musicDuckRatio: number;
    fadeInMs: number;
    fadeOutMs: number;
    audioTheme: unknown;
  },
) {
  return adminTransaction("save ambience profile", async (tx) => {
    await authorize(tx, identity.id);
    await consumeRate(tx, identity.id, "ambience.profile");
    const scene = resultRows(
      await tx.execute(
        sql`select id from scenes where id=${input.sceneId}::uuid and is_live for update`,
      ),
    );
    if (scene.length !== 1) throw new Error("Jagah not found");
    await tx.execute(sql`insert into ambience_profiles(scene_id,enabled,max_master_gain,music_duck_ratio,fade_in_ms,fade_out_ms,audio_theme)
      values(${input.sceneId}::uuid,${input.enabled},${input.maxMasterGain},${input.musicDuckRatio},${input.fadeInMs},${input.fadeOutMs},${JSON.stringify(input.audioTheme)}::jsonb)
      on conflict(scene_id) do update set enabled=excluded.enabled,max_master_gain=excluded.max_master_gain,music_duck_ratio=excluded.music_duck_ratio,fade_in_ms=excluded.fade_in_ms,fade_out_ms=excluded.fade_out_ms,audio_theme=excluded.audio_theme`);
    await audit(tx, identity.id, "ambience.profile.save", input.sceneId, input.sceneId, 1);
    return input.sceneId;
  });
}

export type StemInput = {
  id?: string;
  sceneId: string;
  name: string;
  role: AmbienceRole;
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
export async function saveAmbienceStem(identity: Identity, input: StemInput) {
  return adminTransaction("save ambience stem", async (tx) => {
    await authorize(tx, identity.id);
    await consumeRate(tx, identity.id, "ambience.stem");
    const scenes = resultRows(
      await tx.execute(
        sql`select id from scenes where id=${input.sceneId}::uuid and is_live for update`,
      ),
    );
    if (scenes.length !== 1) throw new Error("Jagah not found");
    let id = input.id;
    if (id) {
      const changed = resultRows(
        await tx.execute(
          sql`update sound_stems set name=${input.name},role=${input.role},asset_id=${input.assetId}::uuid,is_active=${input.isActive},sort_order=${input.sortOrder},default_volume=${input.defaultVolume},min_gain=${input.minGain},max_gain=${input.maxGain},crossfade_ms=${input.crossfadeMs},loop_start_seconds=${input.loopStartSeconds},loop_end_seconds=${input.loopEndSeconds},event_min_seconds=${input.eventMinSeconds},event_max_seconds=${input.eventMaxSeconds} where id=${id}::uuid and scene_id=${input.sceneId}::uuid returning id`,
        ),
      );
      if (changed.length !== 1) throw new Error("Ambience sound not found");
    } else {
      id = randomUUID();
      await tx.execute(
        sql`insert into sound_stems(id,scene_id,name,role,asset_id,is_active,sort_order,default_volume,min_gain,max_gain,crossfade_ms,loop_start_seconds,loop_end_seconds,event_min_seconds,event_max_seconds) values(${id}::uuid,${input.sceneId}::uuid,${input.name},${input.role},${input.assetId}::uuid,${input.isActive},${input.sortOrder},${input.defaultVolume},${input.minGain},${input.maxGain},${input.crossfadeMs},${input.loopStartSeconds},${input.loopEndSeconds},${input.eventMinSeconds},${input.eventMaxSeconds})`,
      );
    }
    await audit(
      tx,
      identity.id,
      input.id ? "ambience.stem.update" : "ambience.stem.create",
      input.sceneId,
      id,
      1,
    );
    return input.sceneId;
  });
}

export async function deactivateAmbienceStem(identity: Identity, stemId: string) {
  return adminTransaction("deactivate ambience stem", async (tx) => {
    await authorize(tx, identity.id);
    await consumeRate(tx, identity.id, "ambience.stem");
    const rows = resultRows<{ scene_id: string }>(
      await tx.execute(
        sql`update sound_stems set is_active=false where id=${stemId}::uuid and is_active returning scene_id`,
      ),
    );
    if (rows.length !== 1) throw new Error("Ambience sound not found");
    await audit(tx, identity.id, "ambience.stem.deactivate", rows[0]!.scene_id, stemId, 1);
    return rows[0]!.scene_id;
  });
}

export async function consumeSongPreview(identity: Identity, affected: number) {
  await adminTransaction("song preview", async (tx) => {
    await authorize(tx, identity.id);
    await consumeRate(tx, identity.id, "songs.preview");
    await audit(tx, identity.id, "songs.preview", null, null, affected);
  });
}

export async function addSongs(
  identity: Identity,
  queueId: string,
  songs: Array<SongDraft & { videoId: string }>,
) {
  return adminTransaction("add songs", async (tx) => {
    await authorize(tx, identity.id);
    await consumeRate(tx, identity.id, "bulk.songs");
    const queues = resultRows<{ scene_id: string }>(
      await tx.execute(
        sql`select c.scene_id from curated_sets c join scenes s on s.id=c.scene_id and s.is_live where c.id=${queueId}::uuid and c.is_active for update`,
      ),
    );
    if (queues.length !== 1) throw new Error("Active song queue not found");
    const pos = resultRows<{ max: number }>(
      await tx.execute(
        sql`select coalesce(max(position),0)::int max from curated_set_tracks where curated_set_id=${queueId}::uuid`,
      ),
    );
    let position = Number(pos[0]?.max ?? 0);
    for (const song of songs) {
      const source = resultRows<{ track_id: string }>(
        await tx.execute(
          sql`select track_id from playback_sources where provider='youtube' and provider_item_id=${song.videoId} limit 1`,
        ),
      )[0];
      let trackId = source?.track_id;
      if (!trackId) {
        trackId = randomUUID();
        await tx.execute(
          sql`insert into tracks(id,title,artist,year,youtube_id,catalogue_key) values(${trackId}::uuid,${song.title},${song.artist || null},${song.year},${song.videoId},${`youtube:${song.videoId}`})`,
        );
        await tx.execute(
          sql`insert into playback_sources(track_id,provider,provider_item_id,source_url,provider_title,provider_channel,validated_at) values(${trackId}::uuid,'youtube',${song.videoId},${`https://www.youtube.com/watch?v=${song.videoId}`},${song.providerTitle ?? null},${song.providerChannel ?? null},now())`,
        );
      } else
        await tx.execute(
          sql`update playback_sources set is_active=true,validated_at=now() where provider='youtube' and provider_item_id=${song.videoId}`,
        );
      const dup = resultRows(
        await tx.execute(
          sql`select 1 from curated_set_tracks where curated_set_id=${queueId}::uuid and track_id=${trackId}::uuid`,
        ),
      );
      if (!dup.length)
        await tx.execute(
          sql`insert into curated_set_tracks(curated_set_id,track_id,position) values(${queueId}::uuid,${trackId}::uuid,${++position})`,
        );
    }
    await audit(tx, identity.id, "songs.bulk_add", queues[0]!.scene_id, queueId, songs.length);
    return queues[0]!.scene_id;
  });
}

export async function removeSongs(identity: Identity, queueId: string, membershipIds: string[]) {
  return adminTransaction("remove songs", async (tx) => {
    await authorize(tx, identity.id);
    await consumeRate(tx, identity.id, "bulk.songs");
    const q = resultRows<{ scene_id: string }>(
      await tx.execute(
        sql`select scene_id from curated_sets where id=${queueId}::uuid and is_active for update`,
      ),
    );
    if (q.length !== 1) throw new Error("Active song queue not found");
    const unique = [...new Set(membershipIds)];
    if (!unique.length) throw new Error("Select at least one song to remove");
    const membershipList = sql.join(
      unique.map((id) => sql`${id}::uuid`),
      sql`, `,
    );
    const members = resultRows<{ id: string }>(
      await tx.execute(
        sql`select id from curated_set_tracks where curated_set_id=${queueId}::uuid and id in (${membershipList}) for update`,
      ),
    );
    if (members.length !== unique.length)
      throw new Error("One or more songs do not belong to this queue");
    const count = resultRows<{ n: number }>(
      await tx.execute(
        sql`select count(*)::int n from curated_set_tracks where curated_set_id=${queueId}::uuid`,
      ),
    )[0]!.n;
    if (count - unique.length < 1) throw new Error("A room must keep at least one song");
    await tx.execute(sql`delete from curated_set_tracks where id in (${membershipList})`);
    await normalizeQueuePositions(tx, queueId);
    await audit(tx, identity.id, "songs.bulk_remove", q[0]!.scene_id, queueId, unique.length);
    return q[0]!.scene_id;
  });
}

export async function updateSong(
  identity: Identity,
  input: {
    membershipId: string;
    title: string;
    artist: string;
    year: number | null;
    videoId: string;
    scope: "shared" | "local";
  },
) {
  return adminTransaction("update song", async (tx) => {
    await authorize(tx, identity.id);
    await consumeRate(tx, identity.id, "songs.update");
    const rows = resultRows<{ track_id: string; scene_id: string }>(
      await tx.execute(
        sql`select m.track_id,c.scene_id from curated_set_tracks m join curated_sets c on c.id=m.curated_set_id and c.is_active join scenes s on s.id=c.scene_id and s.is_live where m.id=${input.membershipId}::uuid for update`,
      ),
    );
    if (rows.length !== 1) throw new Error("Song not found");
    const current = rows[0]!;
    let trackId = current.track_id;
    const uses = Number(
      resultRows<{ n: number }>(
        await tx.execute(
          sql`select count(*)::int n from curated_set_tracks m join curated_sets c on c.id=m.curated_set_id and c.is_active where m.track_id=${trackId}::uuid`,
        ),
      )[0]!.n,
    );
    if (input.scope === "local" && uses > 1) {
      const reusable = resultRows<{ track_id: string }>(
        await tx.execute(
          sql`select track_id from playback_sources where provider='youtube' and provider_item_id=${input.videoId} limit 1`,
        ),
      )[0];
      if (reusable) trackId = reusable.track_id;
      else {
        trackId = randomUUID();
        await tx.execute(
          sql`insert into tracks(id,title,artist,year,youtube_id,catalogue_key) values(${trackId}::uuid,${input.title},${input.artist || null},${input.year},${input.videoId},${`youtube:${input.videoId}:${trackId}`})`,
        );
        await tx.execute(
          sql`insert into playback_sources(track_id,provider,provider_item_id,source_url,validated_at) values(${trackId}::uuid,'youtube',${input.videoId},${`https://www.youtube.com/watch?v=${input.videoId}`},now())`,
        );
      }
      await tx.execute(
        sql`update curated_set_tracks set track_id=${trackId}::uuid where id=${input.membershipId}::uuid`,
      );
    } else {
      await tx.execute(
        sql`update tracks set title=${input.title},artist=${input.artist || null},year=${input.year},youtube_id=${input.videoId} where id=${trackId}::uuid`,
      );
      await tx.execute(
        sql`update playback_sources set provider_item_id=${input.videoId},source_url=${`https://www.youtube.com/watch?v=${input.videoId}`},validated_at=now() where track_id=${trackId}::uuid and provider='youtube' and is_active`,
      );
    }
    await audit(tx, identity.id, "songs.update", current.scene_id, input.membershipId, 1);
    return current.scene_id;
  });
}

export async function reserveUpload(
  identity: Identity,
  sceneId: string,
  purpose: "ambience" | "background",
  slug: string,
) {
  return adminTransaction("reserve upload", async (tx) => {
    await authorize(tx, identity.id);
    await consumeRate(tx, identity.id, "upload.reserve");
    const scenes = resultRows(
      await tx.execute(
        sql`select id from scenes where id=${sceneId}::uuid and slug=${slug} and is_live for update`,
      ),
    );
    if (scenes.length !== 1) throw new Error("Jagah not found");
    const id = randomUUID();
    const bucket = purpose === "ambience" ? "ambience-audio" : "scene-media";
    const ext = purpose === "ambience" ? "mp3" : "webp";
    const path = `rooms/${slug}/${purpose}/${randomUUID()}.${ext}`;
    await tx.execute(
      sql`insert into admin_upload_reservations(id,actor_id,scene_id,purpose,bucket,object_path) values(${id}::uuid,${identity.id}::uuid,${sceneId}::uuid,${purpose},${bucket},${path})`,
    );
    await audit(tx, identity.id, "upload.reserve", sceneId, id, 1);
    return { reservationId: id, path };
  });
}

export async function reserveAmbienceUpload(identity: Identity, slug: string) {
  const rows = resultRows<{ id: string }>(
    await db.execute(sql`select id from scenes where slug=${slug} and is_live`),
  );
  if (rows.length !== 1) throw new Error("Jagah not found");
  return {
    ...(await reserveUpload(identity, rows[0]!.id, "ambience", slug)),
    sceneId: rows[0]!.id,
  };
}
export async function reserveBackgroundUpload(identity: Identity, sceneId: string) {
  const rows = resultRows<{ slug: string }>(
    await db.execute(sql`select slug from scenes where id=${sceneId}::uuid and is_live`),
  );
  if (rows.length !== 1) throw new Error("Jagah not found");
  return reserveUpload(identity, sceneId, "background", rows[0]!.slug);
}

export async function getUploadReservation(
  identity: Identity,
  input: { sceneId: string; purpose: UploadPurpose; path: string; reservationId: string },
): Promise<ReservationStatus> {
  const bucket = storageBucketFor(input.purpose);
  const rows = resultRows<{
    expires_at: string;
    finalized_at: string | null;
    discarded_at: string | null;
    finalized_reference_exists: boolean;
  }>(
    await db.execute(sql`select r.expires_at,r.finalized_at,r.discarded_at,
      case when r.finalized_at is null then true
        when r.purpose='ambience' then exists(
          select 1 from ambience_assets a where a.storage_path=r.object_path)
        when r.purpose='background' then exists(
          select 1 from scenes s where s.id=r.scene_id and s.background_storage_path=r.object_path)
        else false end as finalized_reference_exists
      from admin_upload_reservations r
      where r.id=${input.reservationId}::uuid and r.actor_id=${identity.id}::uuid
        and r.scene_id=${input.sceneId}::uuid and r.purpose=${input.purpose}
        and r.bucket=${bucket} and r.object_path=${input.path}`),
  );
  const reservation = rows[0];
  if (!reservation || reservation.discarded_at) return "invalid";
  if (reservation.finalized_at)
    return reservation.finalized_reference_exists ? "finalized" : "invalid";
  return new Date(reservation.expires_at).getTime() > Date.now() ? "active" : "invalid";
}

export async function discardUploadReservation(
  identity: Identity,
  input: { sceneId: string; purpose: UploadPurpose; path: string; reservationId: string },
  queueObject: boolean,
): Promise<DiscardResult> {
  const bucket = storageBucketFor(input.purpose);
  return adminTransaction("compensate upload reservation", async (tx) => {
    await authorize(tx, identity.id);
    const rows = resultRows<{ finalized_at: string | null; discarded_at: string | null }>(
      await tx.execute(sql`select finalized_at,discarded_at from admin_upload_reservations
        where id=${input.reservationId}::uuid and actor_id=${identity.id}::uuid
          and scene_id=${input.sceneId}::uuid and purpose=${input.purpose}
          and bucket=${bucket} and object_path=${input.path} for update`),
    );
    const reservation = rows[0];
    if (!reservation) return "invalid";
    if (reservation.finalized_at) return "finalized";
    if (reservation.discarded_at) return "already_discarded";
    await tx.execute(
      sql`update admin_upload_reservations set discarded_at=now() where id=${input.reservationId}::uuid`,
    );
    if (queueObject)
      await tx.execute(sql`insert into admin_storage_cleanup_queue(bucket,object_path,reason)
        values(${bucket},${input.path},'discarded_upload') on conflict(bucket,object_path,reason) do nothing`);
    return "discarded";
  });
}

export async function completeUploadCleanup(bucket: AdminStorageBucket, path: string) {
  await db.execute(sql`update admin_storage_cleanup_queue set completed_at=now(),last_error=null
    where bucket=${bucket} and object_path=${path} and reason='discarded_upload' and completed_at is null`);
}

export async function recordUploadCleanupFailure(
  bucket: AdminStorageBucket,
  path: string,
  message: string,
) {
  await db.execute(sql`update admin_storage_cleanup_queue
    set attempts=attempts+1,last_error=${message.slice(0, 240)}
    where bucket=${bucket} and object_path=${path} and reason='discarded_upload' and completed_at is null`);
}

export async function discardReservation(
  identity: Identity,
  sceneId: string,
  path: string,
  reservationId: string,
) {
  return adminTransaction("discard background upload", async (tx) => {
    await authorize(tx, identity.id);
    const rows = resultRows<{ finalized_at: string | null; discarded_at: string | null }>(
      await tx.execute(sql`select finalized_at,discarded_at from admin_upload_reservations
        where id=${reservationId}::uuid and actor_id=${identity.id}::uuid and scene_id=${sceneId}::uuid
          and object_path=${path} and purpose='background' and bucket='scene-media' for update`),
    );
    const reservation = rows[0];
    if (!reservation) throw new Error("Invalid background upload reservation");
    if (reservation.finalized_at) return "finalized" as const;
    if (reservation.discarded_at) return "already_discarded" as const;
    await consumeRate(tx, identity.id, "upload.discard");
    await tx.execute(
      sql`update admin_upload_reservations set discarded_at=now() where id=${reservationId}::uuid`,
    );
    await tx.execute(
      sql`insert into admin_storage_cleanup_queue(bucket,object_path,reason) values('scene-media',${path},'discarded_upload') on conflict(bucket,object_path,reason) do nothing`,
    );
    await audit(tx, identity.id, "upload.discard", sceneId, reservationId, 1);
    return "discarded" as const;
  });
}

export async function discardAmbienceReservation(
  identity: Identity,
  reservationId: string,
  path: string,
) {
  const rows = resultRows<{ scene_id: string }>(
    await db.execute(sql`select scene_id from admin_upload_reservations
      where id=${reservationId}::uuid and actor_id=${identity.id}::uuid
        and object_path=${path} and purpose='ambience'`),
  );
  if (!rows[0]) return "invalid" as const;
  return discardUploadReservation(
    identity,
    { sceneId: rows[0].scene_id, reservationId, path, purpose: "ambience" },
    true,
  );
}

export async function finalizeAmbienceUpload(
  identity: Identity,
  input: {
    sceneId: string;
    reservationId: string;
    path: string;
    name: string;
    role: AmbienceRole;
    mimeType: string;
    byteSize: number;
    durationSeconds: number;
    sha256: string;
    sourceUrl: string | null;
    sourceTitle: string;
    sourceSha256: string;
    originalFilename: string;
    originalByteSize: number;
    originalDurationSeconds: number;
    selectedStartSeconds: number;
    selectedDurationSeconds: number;
  },
) {
  return adminTransaction("finalize ambience upload", async (tx) => {
    await authorize(tx, identity.id);
    const reservation = resultRows<{
      slug: string;
      expires_at: string;
      finalized_at: string | null;
      discarded_at: string | null;
    }>(
      await tx.execute(
        sql`select s.slug,r.expires_at,r.finalized_at,r.discarded_at
          from admin_upload_reservations r join scenes s on s.id=r.scene_id and s.is_live
          where r.id=${input.reservationId}::uuid and r.actor_id=${identity.id}::uuid
            and r.scene_id=${input.sceneId}::uuid and r.purpose='ambience'
            and r.bucket='ambience-audio' and r.object_path=${input.path} for update`,
      ),
    );
    const current = reservation[0];
    if (!current) throw new Error("Audio upload reservation is invalid or expired");
    validateStoragePath("ambience", input.path, current.slug);
    if (current.finalized_at) {
      const assets = resultRows(
        await tx.execute(sql`select id from ambience_assets where storage_path=${input.path}`),
      );
      if (assets.length === 1) return "already_finalized" as const;
      throw new Error("Finalized audio reservation has no matching asset");
    }
    if (current.discarded_at || new Date(current.expires_at).getTime() <= Date.now())
      throw new Error("Audio upload reservation is invalid or expired");
    await consumeRate(tx, identity.id, "upload.finalize");
    const assetId = randomUUID(),
      sourceId = randomUUID(),
      stemId = randomUUID();
    await tx.execute(
      sql`insert into ambience_assets(id,storage_path,mime_type,byte_size,duration_seconds,sha256) values(${assetId}::uuid,${input.path},${input.mimeType},${input.byteSize},${input.durationSeconds},${input.sha256})`,
    );
    await tx.execute(
      sql`insert into ambience_asset_sources(id,asset_id,source_order,source_url,source_title,source_sha256) values(${sourceId}::uuid,${assetId}::uuid,1,${input.sourceUrl},${input.sourceTitle},${"0".repeat(64)})`,
    );
    await tx.execute(
      sql`insert into private.ambience_asset_provenance(asset_source_id,source_sha256,original_filename,original_byte_size,original_duration_seconds,selected_start_seconds,selected_duration_seconds) values(${sourceId}::uuid,${input.sourceSha256},${input.originalFilename},${input.originalByteSize},${input.originalDurationSeconds},${input.selectedStartSeconds},${input.selectedDurationSeconds})`,
    );
    const defaults = ambienceUploadStemDefaults(input.role);
    await tx.execute(
      sql`insert into sound_stems(id,scene_id,name,asset_id,role,is_active,sort_order,
        default_volume,min_gain,max_gain,crossfade_ms,event_min_seconds,event_max_seconds,category,synth_key)
        values(${stemId}::uuid,${input.sceneId}::uuid,${input.name},${assetId}::uuid,${input.role},true,${defaults.sortOrder},
          ${defaults.defaultVolume},${defaults.minGain},${defaults.maxGain},${defaults.crossfadeMs},
          ${defaults.eventMinSeconds},${defaults.eventMaxSeconds},${defaults.category},${defaults.synthKey})`,
    );
    const done = resultRows(
      await tx.execute(
        sql`update admin_upload_reservations set finalized_at=now() where id=${input.reservationId}::uuid and finalized_at is null and discarded_at is null returning id`,
      ),
    );
    if (done.length !== 1) throw new Error("Unable to finalize upload reservation");
    await audit(tx, identity.id, "ambience.asset.finalize", input.sceneId, assetId, 2);
    return "finalized" as const;
  });
}

export async function saveScenePresentation(
  identity: Identity,
  input: {
    sceneId: string;
    backgroundStoragePath: string | null;
    uploadReservationId?: string;
    foregroundTextColor: string;
    gagLabel: string;
    oneliners: Array<{ id?: string; text: string; daypart: AdminOneLiner["daypart"] }>;
  },
) {
  return adminTransaction("save scene presentation", async (tx) => {
    await authorize(tx, identity.id);
    await consumeRate(tx, identity.id, "bulk.presentation");
    const scenes = resultRows<{ background_storage_path: string | null }>(
      await tx.execute(
        sql`select background_storage_path from scenes where id=${input.sceneId}::uuid and is_live for update`,
      ),
    );
    if (scenes.length !== 1) throw new Error("Jagah not found");
    const prior = scenes[0]!.background_storage_path;
    const next = input.backgroundStoragePath || null;
    if (next !== prior && next) {
      const r = resultRows(
        await tx.execute(
          sql`update admin_upload_reservations set finalized_at=now() where id=${input.uploadReservationId ?? null}::uuid and actor_id=${identity.id}::uuid and scene_id=${input.sceneId}::uuid and purpose='background' and object_path=${next} and expires_at>now() and finalized_at is null and discarded_at is null returning id`,
        ),
      );
      if (r.length !== 1) throw new Error("Background upload reservation is invalid or expired");
    }
    await tx.execute(
      sql`update scenes set background_storage_path=${next},foreground_text_color=${input.foregroundTextColor},gag_label=${input.gagLabel.trim() || null} where id=${input.sceneId}::uuid`,
    );
    const existing = input.oneliners.filter((x) => x.id);
    for (const line of existing) {
      const r = resultRows(
        await tx.execute(
          sql`update oneliners set text_en=${line.text},text_hi=${line.text},daypart_tag=${line.daypart} where id=${line.id!}::uuid and scene_id=${input.sceneId}::uuid returning id`,
        ),
      );
      if (r.length !== 1) throw new Error("Oneliner does not belong to this scene");
    }
    const keep = existing.map((x) => x.id!);
    if (keep.length) {
      const onelinerList = sql.join(
        keep.map((id) => sql`${id}::uuid`),
        sql`, `,
      );
      await tx.execute(
        sql`delete from oneliners where scene_id=${input.sceneId}::uuid and id not in (${onelinerList})`,
      );
    } else await tx.execute(sql`delete from oneliners where scene_id=${input.sceneId}::uuid`);
    for (const line of input.oneliners.filter((x) => !x.id))
      await tx.execute(
        sql`insert into oneliners(scene_id,text_en,text_hi,daypart_tag) values(${input.sceneId}::uuid,${line.text},${line.text},${line.daypart})`,
      );
    if (prior && prior !== next)
      await tx.execute(
        sql`insert into admin_storage_cleanup_queue(bucket,object_path,reason) values('scene-media',${prior},'replaced_object') on conflict(bucket,object_path,reason) do nothing`,
      );
    await audit(
      tx,
      identity.id,
      "scene.presentation.save",
      input.sceneId,
      input.sceneId,
      input.oneliners.length + 1,
    );
    return input.sceneId;
  });
}

export async function isStorageObjectReferenced(bucket: string, path: string) {
  if (!isAdminStorageBucket(bucket)) return true;
  const rows = resultRows(
    await db.execute(
      sql`select (${bucket}='scene-media' and exists(select 1 from scenes where background_storage_path=${path})) or (${bucket}='ambience-audio' and exists(select 1 from ambience_assets where storage_path=${path})) or exists(select 1 from admin_upload_reservations where bucket=${bucket} and object_path=${path} and expires_at>now() and finalized_at is null and discarded_at is null) referenced`,
    ),
  );
  return Boolean((rows[0] as { referenced: boolean } | undefined)?.referenced ?? true);
}

export async function runRetention() {
  return adminTransaction("run retention", async (tx) => {
    const queued = resultRows(
      await tx.execute(
        sql`insert into admin_storage_cleanup_queue(bucket,object_path,reason) select bucket,object_path,'expired_upload' from admin_upload_reservations where expires_at<=now() and finalized_at is null and discarded_at is null on conflict(bucket,object_path,reason) do nothing returning id`,
      ),
    ).length;
    const audits = resultRows(
      await tx.execute(
        sql`delete from admin_audit_log where created_at<now()-interval '180 days' returning id`,
      ),
    ).length;
    const rates = resultRows(
      await tx.execute(
        sql`delete from admin_rate_limits where window_started_at<now()-interval '2 days' returning actor_id`,
      ),
    ).length;
    return { queued, audits, rates };
  });
}
