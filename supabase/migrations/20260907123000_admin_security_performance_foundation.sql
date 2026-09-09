begin;

-- Database-owned authorization. The onboarding status is intentionally the only
-- admin function available at AAL1; all application data requires a verified
-- TOTP factor (AAL2).
create or replace function public.admin_session_ready()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null
    and coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    and exists (
      select 1 from public.app_admins a where a.user_id = auth.uid()
    );
$$;

create or replace function public.admin_assert_ready()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.admin_session_ready() then
    raise exception 'Administrator MFA verification is required' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_onboarding_status()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.app_admins a where a.user_id = auth.uid()
  ) then
    return 'not_authorized';
  end if;

  if coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' then
    return 'ready';
  end if;

  if exists (
    select 1
    from auth.mfa_factors factor
    where factor.user_id = auth.uid() and factor.status = 'verified'
  ) then
    return 'mfa_challenge_required';
  end if;

  return 'mfa_enrollment_required';
end;
$$;

revoke all on function public.admin_session_ready() from public, anon;
revoke all on function public.admin_assert_ready() from public, anon;
revoke all on function public.admin_onboarding_status() from public, anon;
grant execute on function public.admin_session_ready() to authenticated, service_role;
grant execute on function public.admin_assert_ready() to authenticated, service_role;
grant execute on function public.admin_onboarding_status() to authenticated, service_role;

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action ~ '^[a-z][a-z0-9_.-]{1,79}$'),
  scene_id uuid references public.scenes(id) on delete set null,
  target_id text,
  affected_count integer not null default 0 check (affected_count >= 0),
  request_id uuid not null,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log(created_at);
create index admin_audit_log_actor_created_idx on public.admin_audit_log(actor_id, created_at desc);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated;
grant all on public.admin_audit_log to service_role;

create table public.admin_rate_limits (
  actor_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (actor_id, bucket, window_started_at)
);
create index admin_rate_limits_window_idx on public.admin_rate_limits(window_started_at);
alter table public.admin_rate_limits enable row level security;
revoke all on public.admin_rate_limits from public, anon, authenticated;
grant all on public.admin_rate_limits to service_role;

create table public.admin_upload_reservations (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  scene_id uuid not null references public.scenes(id) on delete cascade,
  purpose text not null check (purpose in ('ambience', 'background')),
  bucket text not null check (bucket in ('ambience-audio', 'scene-media')),
  object_path text not null unique,
  expires_at timestamptz not null default now() + interval '2 hours',
  finalized_at timestamptz,
  discarded_at timestamptz,
  created_at timestamptz not null default now(),
  check (finalized_at is null or discarded_at is null)
);
create index admin_upload_reservations_expiry_idx
  on public.admin_upload_reservations(expires_at)
  where finalized_at is null and discarded_at is null;
alter table public.admin_upload_reservations enable row level security;
revoke all on public.admin_upload_reservations from public, anon, authenticated;
grant all on public.admin_upload_reservations to service_role;

create table public.admin_storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('ambience-audio', 'scene-media')),
  object_path text not null,
  reason text not null check (reason in ('expired_upload', 'discarded_upload', 'replaced_object')),
  attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(),
  completed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  unique (bucket, object_path, reason)
);
create index admin_storage_cleanup_pending_idx
  on public.admin_storage_cleanup_queue(available_at, created_at)
  where completed_at is null;
alter table public.admin_storage_cleanup_queue enable row level security;
revoke all on public.admin_storage_cleanup_queue from public, anon, authenticated;
grant all on public.admin_storage_cleanup_queue to service_role;

create or replace function public.admin_record_audit(
  p_action text,
  p_scene_id uuid default null,
  p_target_id text default null,
  p_affected_count integer default 0,
  p_request_id uuid default gen_random_uuid()
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
  insert into public.admin_audit_log(actor_id, action, scene_id, target_id, affected_count, request_id)
  values (auth.uid(), p_action, p_scene_id, left(p_target_id, 160), p_affected_count, p_request_id);
end;
$$;

create or replace function public.admin_consume_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns integer
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
  return next_count;
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
  if p_purpose not in ('ambience', 'background') then raise exception 'Invalid upload purpose'; end if;
  select s.slug into scene_slug from public.scenes s where s.id = p_scene_id and s.is_live;
  if scene_slug is null then raise exception 'Jagah not found'; end if;
  target_bucket := case when p_purpose = 'ambience' then 'ambience-audio' else 'scene-media' end;
  target_path := 'rooms/' || scene_slug || '/' || p_purpose || '/' || new_id::text ||
    case when p_purpose = 'ambience' then '.wav' else '.webp' end;
  insert into public.admin_upload_reservations(id, actor_id, scene_id, purpose, bucket, object_path, expires_at)
  values (new_id, auth.uid(), p_scene_id, p_purpose, target_bucket, target_path, target_expiry);
  return query select new_id, target_bucket, target_path, target_expiry;
end;
$$;

create or replace function public.admin_check_upload_reservation(
  p_reservation_id uuid,
  p_scene_id uuid,
  p_purpose text,
  p_object_path text
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select public.admin_session_ready() and exists (
    select 1 from public.admin_upload_reservations r
    where r.id = p_reservation_id
      and r.actor_id = auth.uid()
      and r.scene_id = p_scene_id
      and r.purpose = p_purpose
      and r.object_path = p_object_path
      and r.expires_at > now()
      and r.finalized_at is null
      and r.discarded_at is null
  );
$$;

create or replace function public.admin_complete_upload_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert_ready();
  update public.admin_upload_reservations
  set finalized_at = now()
  where id = p_reservation_id and actor_id = auth.uid()
    and expires_at > now() and finalized_at is null and discarded_at is null;
  if not found then raise exception 'Upload reservation is invalid or expired'; end if;
end;
$$;

create or replace function public.admin_discard_upload_reservation(p_reservation_id uuid)
returns table (bucket text, object_path text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert_ready();
  return query
  update public.admin_upload_reservations r
  set discarded_at = now()
  where r.id = p_reservation_id and r.actor_id = auth.uid()
    and r.finalized_at is null and r.discarded_at is null
  returning r.bucket, r.object_path;
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
  if p_bucket not in ('ambience-audio', 'scene-media') or p_reason <> 'replaced_object' then
    raise exception 'Invalid cleanup request';
  end if;
  insert into public.admin_storage_cleanup_queue(bucket, object_path, reason)
  values (p_bucket, p_object_path, p_reason)
  on conflict (bucket, object_path, reason) do nothing;
end;
$$;

-- Security-definer wrappers retain the mature transactional mutation logic while
-- making authorization explicit and independently auditable.
create or replace function public.admin_secured_room_analytics(p_since timestamptz default null)
returns table (scene_id uuid, visits bigint, played_visits bigint, listening_seconds bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.admin_assert_ready();
  return query select * from public.admin_room_analytics(p_since);
end;
$$;

create or replace function public.admin_secured_append_queue_tracks(p_curated_set_id uuid, p_tracks jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin perform public.admin_assert_ready(); perform public.admin_append_queue_tracks(p_curated_set_id, p_tracks); end;
$$;
create or replace function public.admin_secured_remove_queue_tracks(p_curated_set_id uuid, p_membership_ids uuid[])
returns void language plpgsql security definer set search_path = '' as $$
begin perform public.admin_assert_ready(); perform public.admin_remove_queue_tracks(p_curated_set_id, p_membership_ids); end;
$$;
create or replace function public.admin_secured_update_queue_track(
  p_membership_id uuid, p_title text, p_artist text, p_year integer, p_video_id text, p_scope text
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_assert_ready();
  perform public.admin_update_queue_track(p_membership_id, p_title, p_artist, p_year, p_video_id, p_scope);
end;
$$;
create or replace function public.admin_secured_save_scene_presentation(
  p_scene_id uuid, p_background_storage_path text, p_foreground_text_color text,
  p_gag_label text, p_oneliners jsonb
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform public.admin_assert_ready();
  perform public.admin_save_scene_presentation(
    p_scene_id, p_background_storage_path, p_foreground_text_color, p_gag_label, p_oneliners
  );
end;
$$;

revoke all on function public.admin_record_audit(text, uuid, text, integer, uuid) from public, anon;
revoke all on function public.admin_consume_rate_limit(text, integer, integer) from public, anon;
revoke all on function public.admin_create_upload_reservation(uuid, text) from public, anon;
revoke all on function public.admin_check_upload_reservation(uuid, uuid, text, text) from public, anon;
revoke all on function public.admin_complete_upload_reservation(uuid) from public, anon;
revoke all on function public.admin_discard_upload_reservation(uuid) from public, anon;
revoke all on function public.admin_queue_storage_cleanup(text, text, text) from public, anon;
revoke all on function public.admin_secured_room_analytics(timestamptz) from public, anon;
revoke all on function public.admin_secured_append_queue_tracks(uuid, jsonb) from public, anon;
revoke all on function public.admin_secured_remove_queue_tracks(uuid, uuid[]) from public, anon;
revoke all on function public.admin_secured_update_queue_track(uuid, text, text, integer, text, text) from public, anon;
revoke all on function public.admin_secured_save_scene_presentation(uuid, text, text, text, jsonb) from public, anon;
grant execute on function public.admin_record_audit(text, uuid, text, integer, uuid) to authenticated;
grant execute on function public.admin_consume_rate_limit(text, integer, integer) to authenticated;
grant execute on function public.admin_create_upload_reservation(uuid, text) to authenticated;
grant execute on function public.admin_check_upload_reservation(uuid, uuid, text, text) to authenticated;
grant execute on function public.admin_complete_upload_reservation(uuid) to authenticated;
grant execute on function public.admin_discard_upload_reservation(uuid) to authenticated;
grant execute on function public.admin_queue_storage_cleanup(text, text, text) to authenticated;
grant execute on function public.admin_secured_room_analytics(timestamptz) to authenticated;
grant execute on function public.admin_secured_append_queue_tracks(uuid, jsonb) to authenticated;
grant execute on function public.admin_secured_remove_queue_tracks(uuid, uuid[]) to authenticated;
grant execute on function public.admin_secured_update_queue_track(uuid, text, text, integer, text, text) to authenticated;
grant execute on function public.admin_secured_save_scene_presentation(uuid, text, text, text, jsonb) to authenticated;

-- Explicit Data API grants plus MFA-aware RLS policies. Public read policies stay
-- unchanged; these policies only add the administrative capabilities.
grant select, update on public.scenes to authenticated;
grant select, insert, update, delete on public.oneliners to authenticated;
grant select, insert, update, delete on public.ambience_profiles to authenticated;
grant select, insert, update, delete on public.ambience_assets to authenticated;
grant select, insert, update, delete on public.ambience_asset_sources to authenticated;
grant select, insert, update, delete on public.sound_stems to authenticated;

create policy "mfa admins update scenes" on public.scenes for update to authenticated
  using (public.admin_session_ready()) with check (public.admin_session_ready());
create policy "mfa admins manage oneliners" on public.oneliners for all to authenticated
  using (public.admin_session_ready()) with check (public.admin_session_ready());
create policy "mfa admins manage ambience profiles" on public.ambience_profiles for all to authenticated
  using (public.admin_session_ready()) with check (public.admin_session_ready());
create policy "mfa admins manage ambience assets" on public.ambience_assets for all to authenticated
  using (public.admin_session_ready()) with check (public.admin_session_ready());
create policy "mfa admins manage ambience provenance" on public.ambience_asset_sources for all to authenticated
  using (public.admin_session_ready()) with check (public.admin_session_ready());
create policy "mfa admins manage sound stems" on public.sound_stems for all to authenticated
  using (public.admin_session_ready()) with check (public.admin_session_ready());

create index if not exists sound_stems_asset_id_idx on public.sound_stems(asset_id);

comment on table public.admin_audit_log is
  'Backend-only admin audit metadata. Payload text, URLs, filenames, credentials, and tokens are intentionally excluded.';
comment on table public.admin_upload_reservations is
  'Actor-bound, scene-bound upload reservations with a two-hour validity window.';

commit;
