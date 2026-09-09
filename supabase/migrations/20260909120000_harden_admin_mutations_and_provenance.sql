begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.ambience_asset_provenance (
  asset_source_id uuid primary key
    references public.ambience_asset_sources(id) on delete cascade,
  source_sha256 text not null check (source_sha256 ~ '^[A-F0-9]{64}$'),
  original_filename text,
  original_byte_size bigint check (original_byte_size is null or original_byte_size > 0),
  original_duration_seconds numeric check (
    original_duration_seconds is null or original_duration_seconds > 0
  ),
  selected_start_seconds numeric check (
    selected_start_seconds is null or selected_start_seconds >= 0
  ),
  selected_duration_seconds numeric check (
    selected_duration_seconds is null or selected_duration_seconds > 0
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table private.ambience_asset_provenance enable row level security;
revoke all on private.ambience_asset_provenance from public, anon, authenticated;
grant all on private.ambience_asset_provenance to service_role;

insert into private.ambience_asset_provenance (
  asset_source_id,
  source_sha256,
  original_filename,
  original_byte_size,
  original_duration_seconds,
  selected_start_seconds,
  selected_duration_seconds
)
select
  source.id,
  source.source_sha256,
  source.original_filename,
  source.original_byte_size,
  source.original_duration_seconds,
  source.selected_start_seconds,
  source.selected_duration_seconds
from public.ambience_asset_sources source
on conflict (asset_source_id) do update set
  source_sha256 = excluded.source_sha256,
  original_filename = excluded.original_filename,
  original_byte_size = excluded.original_byte_size,
  original_duration_seconds = excluded.original_duration_seconds,
  selected_start_seconds = excluded.selected_start_seconds,
  selected_duration_seconds = excluded.selected_duration_seconds,
  updated_at = now();

create or replace function private.capture_ambience_asset_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.source_sha256 <> repeat('0', 64)
     or new.original_filename is not null
     or new.original_byte_size is not null
     or new.original_duration_seconds is not null
     or new.selected_start_seconds is not null
     or new.selected_duration_seconds is not null then
    insert into private.ambience_asset_provenance (
      asset_source_id,
      source_sha256,
      original_filename,
      original_byte_size,
      original_duration_seconds,
      selected_start_seconds,
      selected_duration_seconds
    ) values (
      new.id,
      new.source_sha256,
      new.original_filename,
      new.original_byte_size,
      new.original_duration_seconds,
      new.selected_start_seconds,
      new.selected_duration_seconds
    )
    on conflict (asset_source_id) do update set
      source_sha256 = excluded.source_sha256,
      original_filename = excluded.original_filename,
      original_byte_size = excluded.original_byte_size,
      original_duration_seconds = excluded.original_duration_seconds,
      selected_start_seconds = excluded.selected_start_seconds,
      selected_duration_seconds = excluded.selected_duration_seconds,
      updated_at = now();

    update public.ambience_asset_sources
    set source_sha256 = repeat('0', 64),
        original_filename = null,
        original_byte_size = null,
        original_duration_seconds = null,
        selected_start_seconds = null,
        selected_duration_seconds = null
    where id = new.id;
  end if;
  return null;
end;
$$;

revoke all on function private.capture_ambience_asset_provenance()
  from public, anon, authenticated;

drop trigger if exists capture_ambience_asset_provenance
  on public.ambience_asset_sources;
create trigger capture_ambience_asset_provenance
after insert or update of
  source_sha256,
  original_filename,
  original_byte_size,
  original_duration_seconds,
  selected_start_seconds,
  selected_duration_seconds
on public.ambience_asset_sources
for each row execute function private.capture_ambience_asset_provenance();

update public.ambience_asset_sources
set source_sha256 = repeat('0', 64),
    original_filename = null,
    original_byte_size = null,
    original_duration_seconds = null,
    selected_start_seconds = null,
    selected_duration_seconds = null
where source_sha256 <> repeat('0', 64)
   or original_filename is not null
   or original_byte_size is not null
   or original_duration_seconds is not null
   or selected_start_seconds is not null
   or selected_duration_seconds is not null;

revoke select on public.ambience_asset_sources from anon, authenticated;
grant select (id, asset_id, source_order, source_url, source_title)
  on public.ambience_asset_sources to anon, authenticated;

create or replace function private.enforce_admin_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  window_start timestamptz;
  next_count integer;
begin
  perform public.admin_assert_ready();
  if p_bucket !~ '^[a-z][a-z0-9_.-]{1,79}$'
     or p_limit < 1 or p_limit > 1000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'Invalid rate limit';
  end if;
  window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );
  insert into public.admin_rate_limits(actor_id, bucket, window_started_at, request_count)
  values (auth.uid(), p_bucket, window_start, 1)
  on conflict (actor_id, bucket, window_started_at)
  do update set request_count = public.admin_rate_limits.request_count + 1
  returning request_count into next_count;
  if next_count > p_limit then
    raise exception 'Too many requests. Please wait and try again.' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function private.write_admin_audit(
  p_action text,
  p_scene_id uuid default null,
  p_target_id text default null,
  p_affected_count integer default 0
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert_ready();
  if p_action !~ '^[a-z][a-z0-9_.-]{1,79}$' or p_affected_count < 0 then
    raise exception 'Invalid audit metadata';
  end if;
  insert into public.admin_audit_log(
    actor_id, action, scene_id, target_id, affected_count, request_id
  ) values (
    auth.uid(), p_action, p_scene_id, left(p_target_id, 160), p_affected_count, gen_random_uuid()
  );
end;
$$;

revoke all on function private.enforce_admin_rate_limit(text, integer, integer)
  from public, anon, authenticated;
revoke all on function private.write_admin_audit(text, uuid, text, integer)
  from public, anon, authenticated;

create or replace function public.admin_secured_consume_song_preview()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('songs.preview', 6, 60);
end;
$$;

create or replace function public.admin_create_upload_reservation(
  p_scene_id uuid,
  p_purpose text
)
returns table (reservation_id uuid, bucket text, object_path text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  scene_slug text;
  new_id uuid := gen_random_uuid();
  target_bucket text;
  target_path text;
  target_expiry timestamptz := now() + interval '2 hours';
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('upload.reserve', 30, 3600);
  if p_purpose not in ('ambience', 'background') then
    raise exception 'Invalid upload purpose';
  end if;
  select s.slug into scene_slug
  from public.scenes s
  where s.id = p_scene_id and s.is_live;
  if scene_slug is null then raise exception 'Jagah not found'; end if;
  target_bucket := case when p_purpose = 'ambience' then 'ambience-audio' else 'scene-media' end;
  target_path := 'rooms/' || scene_slug || '/' || p_purpose || '/' || new_id::text ||
    case when p_purpose = 'ambience' then '.wav' else '.webp' end;
  insert into public.admin_upload_reservations(
    id, actor_id, scene_id, purpose, bucket, object_path, expires_at
  ) values (
    new_id, auth.uid(), p_scene_id, p_purpose, target_bucket, target_path, target_expiry
  );
  perform private.write_admin_audit('upload.reserve', p_scene_id, new_id::text, 1);
  return query select new_id, target_bucket, target_path, target_expiry;
end;
$$;

create or replace function public.admin_create_mp3_upload_reservation(p_scene_id uuid)
returns table (reservation_id uuid, bucket text, object_path text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  scene_slug text;
  new_id uuid := gen_random_uuid();
  target_path text;
  target_expiry timestamptz := now() + interval '2 hours';
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('upload.reserve', 30, 3600);
  select s.slug into scene_slug
  from public.scenes s
  where s.id = p_scene_id and s.is_live;
  if scene_slug is null then raise exception 'Jagah not found'; end if;
  target_path := 'rooms/' || scene_slug || '/ambience/' || new_id::text || '.mp3';
  insert into public.admin_upload_reservations(
    id, actor_id, scene_id, purpose, bucket, object_path, expires_at
  ) values (
    new_id, auth.uid(), p_scene_id, 'ambience', 'ambience-audio', target_path, target_expiry
  );
  perform private.write_admin_audit('upload.reserve', p_scene_id, new_id::text, 1);
  return query select new_id, 'ambience-audio'::text, target_path, target_expiry;
end;
$$;

create or replace function public.admin_secured_discard_upload_reservation(
  p_reservation_id uuid
)
returns table (bucket text, object_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_scene_id uuid;
  discarded_bucket text;
  discarded_path text;
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('upload.discard', 120, 3600);
  select scene_id into target_scene_id
  from public.admin_upload_reservations
  where id = p_reservation_id
    and actor_id = auth.uid()
    and finalized_at is null
    and discarded_at is null;
  if target_scene_id is null then
    raise exception 'Upload reservation is invalid';
  end if;
  select discarded.bucket, discarded.object_path
  into discarded_bucket, discarded_path
  from public.admin_discard_upload_reservation(p_reservation_id) discarded;
  if discarded_bucket is null then
    raise exception 'Upload reservation is invalid';
  end if;
  perform private.write_admin_audit(
    'upload.discard', target_scene_id, p_reservation_id::text, 1
  );
  return query select discarded_bucket, discarded_path;
end;
$$;

create or replace function public.admin_secured_save_ambience_profile(
  p_scene_id uuid,
  p_enabled boolean,
  p_max_master_gain numeric,
  p_music_duck_ratio numeric,
  p_fade_in_ms integer,
  p_fade_out_ms integer,
  p_audio_theme jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('ambience.profile', 60, 60);
  if not exists (select 1 from public.scenes where id = p_scene_id and is_live) then
    raise exception 'Jagah not found';
  end if;
  if p_max_master_gain not between 0 and 1
     or p_music_duck_ratio not between 0 and 1
     or p_fade_in_ms not between 0 and 10000
     or p_fade_out_ms not between 0 and 10000
     or jsonb_typeof(p_audio_theme) <> 'object' then
    raise exception 'Invalid ambience profile';
  end if;
  insert into public.ambience_profiles (
    scene_id, enabled, max_master_gain, music_duck_ratio,
    fade_in_ms, fade_out_ms, audio_theme
  ) values (
    p_scene_id, p_enabled, p_max_master_gain, p_music_duck_ratio,
    p_fade_in_ms, p_fade_out_ms, p_audio_theme
  )
  on conflict (scene_id) do update set
    enabled = excluded.enabled,
    max_master_gain = excluded.max_master_gain,
    music_duck_ratio = excluded.music_duck_ratio,
    fade_in_ms = excluded.fade_in_ms,
    fade_out_ms = excluded.fade_out_ms,
    audio_theme = excluded.audio_theme;
  perform private.write_admin_audit('ambience.profile.save', p_scene_id, null, 1);
end;
$$;

create or replace function public.admin_secured_save_ambience_stem(
  p_id uuid,
  p_scene_id uuid,
  p_name text,
  p_role text,
  p_asset_id uuid,
  p_is_active boolean,
  p_sort_order integer,
  p_default_volume numeric,
  p_min_gain numeric,
  p_max_gain numeric,
  p_crossfade_ms integer,
  p_loop_start_seconds numeric,
  p_loop_end_seconds numeric,
  p_event_min_seconds integer,
  p_event_max_seconds integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  stem_id uuid;
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('ambience.stem', 60, 60);
  if not exists (select 1 from public.scenes where id = p_scene_id and is_live) then
    raise exception 'Jagah not found';
  end if;
  if not exists (select 1 from public.ambience_assets where id = p_asset_id and is_active) then
    raise exception 'Ambience asset not found';
  end if;
  if nullif(trim(p_name), '') is null
     or p_role not in ('base', 'texture', 'event')
     or p_min_gain not between 0 and 1
     or p_max_gain not between p_min_gain and 1
     or p_default_volume not between p_min_gain and p_max_gain
     or p_crossfade_ms not between 0 and 10000
     or p_loop_start_seconds not between 0 and 3600
     or (p_loop_end_seconds is not null and p_loop_end_seconds <= p_loop_start_seconds)
     or (p_loop_end_seconds is not null and p_loop_end_seconds > 3600)
     or (p_role = 'event' and p_event_min_seconds is not null and p_event_min_seconds < 5)
     or (p_role = 'event' and p_event_max_seconds is not null
       and p_event_max_seconds < coalesce(p_event_min_seconds, 5)) then
    raise exception 'Invalid ambience sound';
  end if;

  if p_id is null then
    insert into public.sound_stems (
      scene_id, name, role, asset_id, is_active, sort_order,
      default_volume, min_gain, max_gain, crossfade_ms,
      loop_start_seconds, loop_end_seconds, event_min_seconds,
      event_max_seconds, category, synth_key
    ) values (
      p_scene_id, trim(p_name), p_role, p_asset_id, p_is_active,
      greatest(0, p_sort_order), p_default_volume, p_min_gain, p_max_gain,
      p_crossfade_ms, p_loop_start_seconds, p_loop_end_seconds,
      case when p_role = 'event' then p_event_min_seconds else null end,
      case when p_role = 'event' then p_event_max_seconds else null end,
      'ambient', 'sample'
    ) returning id into stem_id;
  else
    update public.sound_stems
    set name = trim(p_name),
        role = p_role,
        asset_id = p_asset_id,
        is_active = p_is_active,
        sort_order = greatest(0, p_sort_order),
        default_volume = p_default_volume,
        min_gain = p_min_gain,
        max_gain = p_max_gain,
        crossfade_ms = p_crossfade_ms,
        loop_start_seconds = p_loop_start_seconds,
        loop_end_seconds = p_loop_end_seconds,
        event_min_seconds = case when p_role = 'event' then p_event_min_seconds else null end,
        event_max_seconds = case when p_role = 'event' then p_event_max_seconds else null end,
        category = 'ambient',
        synth_key = 'sample'
    where id = p_id and scene_id = p_scene_id
    returning id into stem_id;
    if stem_id is null then raise exception 'Ambience sound not found'; end if;
  end if;

  perform private.write_admin_audit(
    case when p_id is null then 'ambience.stem.create' else 'ambience.stem.update' end,
    p_scene_id,
    stem_id::text,
    1
  );
  return stem_id;
end;
$$;

create or replace function public.admin_secured_deactivate_ambience_stem(p_stem_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_scene_id uuid;
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('ambience.stem', 60, 60);
  update public.sound_stems
  set is_active = false
  where id = p_stem_id
  returning scene_id into target_scene_id;
  if target_scene_id is null then raise exception 'Ambience sound not found'; end if;
  perform private.write_admin_audit(
    'ambience.stem.deactivate', target_scene_id, p_stem_id::text, 1
  );
end;
$$;

create or replace function public.admin_queue_storage_cleanup(
  p_bucket text,
  p_object_path text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('storage.cleanup', 60, 60);
  if p_bucket not in ('ambience-audio', 'scene-media')
     or p_reason <> 'replaced_object'
     or nullif(trim(p_object_path), '') is null then
    raise exception 'Invalid cleanup request';
  end if;
  if (p_bucket = 'scene-media' and exists (
        select 1 from public.scenes where background_storage_path = p_object_path
      ))
     or (p_bucket = 'ambience-audio' and exists (
        select 1 from public.ambience_assets where storage_path = p_object_path
      ))
     or exists (
        select 1
        from public.admin_upload_reservations reservation
        where reservation.bucket = p_bucket
          and reservation.object_path = p_object_path
          and reservation.expires_at > now()
          and reservation.finalized_at is null
          and reservation.discarded_at is null
      ) then
    raise exception 'Storage object is still referenced';
  end if;
  insert into public.admin_storage_cleanup_queue(bucket, object_path, reason)
  values (p_bucket, p_object_path, p_reason)
  on conflict (bucket, object_path, reason) do update set
    completed_at = null,
    last_error = null,
    attempts = 0,
    available_at = now();
  perform private.write_admin_audit('storage.cleanup.queue', null, p_bucket, 1);
end;
$$;

create or replace function public.admin_storage_object_is_referenced(
  p_bucket text,
  p_object_path text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_bucket = 'scene-media' then exists (
      select 1 from public.scenes where background_storage_path = p_object_path
    ) or exists (
      select 1
      from public.admin_upload_reservations reservation
      where reservation.bucket = p_bucket
        and reservation.object_path = p_object_path
        and reservation.expires_at > now()
        and reservation.finalized_at is null
        and reservation.discarded_at is null
    )
    when p_bucket = 'ambience-audio' then exists (
      select 1 from public.ambience_assets where storage_path = p_object_path
    ) or exists (
      select 1
      from public.admin_upload_reservations reservation
      where reservation.bucket = p_bucket
        and reservation.object_path = p_object_path
        and reservation.expires_at > now()
        and reservation.finalized_at is null
        and reservation.discarded_at is null
    )
    else true
  end;
$$;

create or replace function public.admin_secured_save_scene_presentation_v2(
  p_scene_id uuid,
  p_background_storage_path text,
  p_foreground_text_color text,
  p_gag_label text,
  p_oneliners jsonb,
  p_upload_reservation_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_path text;
  scene_slug text;
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('bulk.presentation', 30, 60);
  select slug, background_storage_path into scene_slug, previous_path
  from public.scenes
  where id = p_scene_id and is_live
  for update;
  if scene_slug is null then raise exception 'Jagah not found'; end if;

  if p_background_storage_path is distinct from previous_path
     and p_background_storage_path is not null then
    if p_upload_reservation_id is null or not exists (
      select 1
      from public.admin_upload_reservations reservation
      where reservation.id = p_upload_reservation_id
        and reservation.actor_id = auth.uid()
        and reservation.scene_id = p_scene_id
        and reservation.purpose = 'background'
        and reservation.bucket = 'scene-media'
        and reservation.object_path = p_background_storage_path
        and reservation.expires_at > now()
        and reservation.finalized_at is null
        and reservation.discarded_at is null
    ) then
      raise exception 'Background upload reservation is invalid or expired';
    end if;
    if p_background_storage_path !~ (
      '^rooms/' || scene_slug || '/background/[0-9a-f-]+\.webp$'
    ) then
      raise exception 'Invalid background upload path';
    end if;
  elsif p_upload_reservation_id is not null then
    raise exception 'Unexpected background upload reservation';
  end if;

  perform public.admin_save_scene_presentation(
    p_scene_id,
    p_background_storage_path,
    p_foreground_text_color,
    p_gag_label,
    p_oneliners
  );

  if p_upload_reservation_id is not null then
    update public.admin_upload_reservations
    set finalized_at = now()
    where id = p_upload_reservation_id;
  end if;

  if previous_path is not null
     and previous_path is distinct from p_background_storage_path
     and previous_path ~ '^rooms/[a-z0-9-]+/background/[0-9a-f-]+\.webp$' then
    perform public.admin_queue_storage_cleanup('scene-media', previous_path, 'replaced_object');
  end if;

  perform private.write_admin_audit(
    'scene.presentation.save', p_scene_id, null, jsonb_array_length(p_oneliners) + 1
  );
end;
$$;

create or replace function public.admin_secured_finalize_ambience_asset(
  p_scene_id uuid,
  p_reservation_id uuid,
  p_storage_path text,
  p_name text,
  p_role text,
  p_mime_type text,
  p_byte_size bigint,
  p_duration_seconds numeric,
  p_sha256 text,
  p_source_url text,
  p_source_title text,
  p_source_sha256 text,
  p_original_filename text,
  p_original_byte_size bigint,
  p_original_duration_seconds numeric,
  p_selected_start_seconds numeric,
  p_selected_duration_seconds numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  scene_slug text;
  asset_id uuid;
  source_id uuid;
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('upload.finalize', 30, 3600);
  select slug into scene_slug from public.scenes where id = p_scene_id and is_live;
  if scene_slug is null then raise exception 'Jagah not found'; end if;
  if not exists (
    select 1 from public.admin_upload_reservations reservation
    where reservation.id = p_reservation_id
      and reservation.actor_id = auth.uid()
      and reservation.scene_id = p_scene_id
      and reservation.purpose = 'ambience'
      and reservation.bucket = 'ambience-audio'
      and reservation.object_path = p_storage_path
      and reservation.expires_at > now()
      and reservation.finalized_at is null
      and reservation.discarded_at is null
  ) then
    raise exception 'Audio upload reservation is invalid or expired';
  end if;
  if p_storage_path !~ (
      '^rooms/' || scene_slug || '/ambience/[0-9a-f-]+\.mp3$'
    )
     or p_mime_type <> 'audio/mpeg'
     or p_byte_size < 1 or p_byte_size > 12582912
     or p_duration_seconds <= 0
     or upper(p_sha256) !~ '^[A-F0-9]{64}$'
     or upper(p_source_sha256) !~ '^[A-F0-9]{64}$'
     or nullif(trim(p_name), '') is null
     or nullif(trim(p_source_title), '') is null
     or nullif(trim(p_original_filename), '') is null
     or p_original_byte_size < 1
     or p_original_duration_seconds <= 0
     or p_selected_start_seconds < 0
     or p_selected_duration_seconds <= 0
     or p_selected_start_seconds + p_selected_duration_seconds > p_original_duration_seconds + 0.05
     or p_role not in ('base', 'texture', 'event')
     or (p_role = 'base' and p_duration_seconds > 90.05)
     or (p_role = 'texture' and p_duration_seconds > 60.05)
     or (p_role = 'event' and p_duration_seconds > 15.05) then
    raise exception 'Invalid ambience asset';
  end if;

  insert into public.ambience_assets (
    storage_path, mime_type, byte_size, duration_seconds, sha256, is_active
  ) values (
    p_storage_path, p_mime_type, p_byte_size, p_duration_seconds, upper(p_sha256), true
  ) returning id into asset_id;

  insert into public.ambience_asset_sources (
    asset_id, source_order, source_url, source_title, source_sha256
  ) values (
    asset_id, 1, nullif(trim(p_source_url), ''), trim(p_source_title), repeat('0', 64)
  ) returning id into source_id;

  insert into private.ambience_asset_provenance (
    asset_source_id,
    source_sha256,
    original_filename,
    original_byte_size,
    original_duration_seconds,
    selected_start_seconds,
    selected_duration_seconds
  ) values (
    source_id,
    upper(p_source_sha256),
    trim(p_original_filename),
    p_original_byte_size,
    p_original_duration_seconds,
    p_selected_start_seconds,
    p_selected_duration_seconds
  );

  insert into public.sound_stems (
    scene_id, name, role, asset_id, is_active, sort_order,
    default_volume, min_gain, max_gain, crossfade_ms,
    loop_start_seconds, loop_end_seconds, event_min_seconds,
    event_max_seconds, category, synth_key
  ) values (
    p_scene_id,
    trim(p_name),
    p_role,
    asset_id,
    true,
    99,
    case p_role when 'base' then 0.9 when 'texture' then 0.6 else 0.35 end,
    case p_role when 'base' then 0.82 when 'texture' then 0.52 else 0.22 end,
    case p_role when 'base' then 0.96 when 'texture' then 0.68 else 0.48 end,
    case when p_role = 'event' then 0 else 2500 end,
    0,
    null,
    case when p_role = 'event' then 35 else null end,
    case when p_role = 'event' then 110 else null end,
    'ambient',
    'sample'
  );

  update public.admin_upload_reservations
  set finalized_at = now()
  where id = p_reservation_id;

  perform private.write_admin_audit(
    'ambience.asset.finalize', p_scene_id, asset_id::text, 2
  );
  return asset_id;
end;
$$;

create or replace function public.admin_secured_append_queue_tracks(
  p_curated_set_id uuid,
  p_tracks jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('bulk.songs', 30, 60);
  perform public.admin_append_queue_tracks(p_curated_set_id, p_tracks);
  perform private.write_admin_audit(
    'songs.bulk_add', null, p_curated_set_id::text, jsonb_array_length(p_tracks)
  );
end;
$$;

create or replace function public.admin_secured_remove_queue_tracks(
  p_curated_set_id uuid,
  p_membership_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('bulk.songs', 30, 60);
  perform public.admin_remove_queue_tracks(p_curated_set_id, p_membership_ids);
  perform private.write_admin_audit(
    'songs.bulk_remove', null, p_curated_set_id::text,
    coalesce(array_length(p_membership_ids, 1), 0)
  );
end;
$$;

create or replace function public.admin_secured_update_queue_track(
  p_membership_id uuid,
  p_title text,
  p_artist text,
  p_year integer,
  p_video_id text,
  p_scope text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert_ready();
  perform private.enforce_admin_rate_limit('songs.update', 60, 60);
  perform public.admin_update_queue_track(
    p_membership_id, p_title, p_artist, p_year, p_video_id, p_scope
  );
  perform private.write_admin_audit('songs.update', null, p_membership_id::text, 1);
end;
$$;

revoke all on function public.admin_secured_consume_song_preview()
  from public, anon;
revoke all on function public.admin_secured_discard_upload_reservation(uuid)
  from public, anon;
revoke all on function public.admin_secured_save_ambience_profile(
  uuid, boolean, numeric, numeric, integer, integer, jsonb
) from public, anon;
revoke all on function public.admin_secured_save_ambience_stem(
  uuid, uuid, text, text, uuid, boolean, integer, numeric, numeric,
  numeric, integer, numeric, numeric, integer, integer
) from public, anon;
revoke all on function public.admin_secured_deactivate_ambience_stem(uuid)
  from public, anon;
revoke all on function public.admin_storage_object_is_referenced(text, text)
  from public, anon, authenticated;
revoke all on function public.admin_secured_save_scene_presentation_v2(
  uuid, text, text, text, jsonb, uuid
) from public, anon;
revoke all on function public.admin_secured_finalize_ambience_asset(
  uuid, uuid, text, text, text, text, bigint, numeric, text, text,
  text, text, text, bigint, numeric, numeric, numeric
) from public, anon;

grant execute on function public.admin_secured_consume_song_preview()
  to authenticated;
grant execute on function public.admin_secured_discard_upload_reservation(uuid)
  to authenticated;
grant execute on function public.admin_secured_save_ambience_profile(
  uuid, boolean, numeric, numeric, integer, integer, jsonb
) to authenticated;
grant execute on function public.admin_secured_save_ambience_stem(
  uuid, uuid, text, text, uuid, boolean, integer, numeric, numeric,
  numeric, integer, numeric, numeric, integer, integer
) to authenticated;
grant execute on function public.admin_secured_deactivate_ambience_stem(uuid)
  to authenticated;
grant execute on function public.admin_storage_object_is_referenced(text, text)
  to service_role;
grant execute on function public.admin_secured_save_scene_presentation_v2(
  uuid, text, text, text, jsonb, uuid
) to authenticated;
grant execute on function public.admin_secured_finalize_ambience_asset(
  uuid, uuid, text, text, text, text, bigint, numeric, text, text,
  text, text, text, bigint, numeric, numeric, numeric
) to authenticated;

revoke execute on function public.admin_record_audit(text, uuid, text, integer, uuid)
  from authenticated;
revoke execute on function public.admin_consume_rate_limit(text, integer, integer)
  from authenticated;
revoke execute on function public.admin_complete_upload_reservation(uuid)
  from authenticated;
revoke execute on function public.admin_discard_upload_reservation(uuid)
  from authenticated;
revoke execute on function public.admin_secured_save_scene_presentation(
  uuid, text, text, text, jsonb
) from authenticated;

revoke update on public.scenes from authenticated;
revoke insert, update, delete on public.oneliners from authenticated;
revoke insert, update, delete on public.ambience_profiles from authenticated;
revoke insert, update, delete on public.ambience_assets from authenticated;
revoke insert, update, delete on public.ambience_asset_sources from authenticated;
revoke insert, update, delete on public.sound_stems from authenticated;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end
$$;

comment on table private.ambience_asset_provenance is
  'Private source-file provenance for administrator ambience uploads.';
comment on column public.ambience_asset_sources.source_sha256 is
  'Legacy compatibility placeholder. Source hashes are stored privately.';

commit;
