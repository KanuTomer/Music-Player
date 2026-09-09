begin;

update storage.buckets
set allowed_mime_types = array['audio/wav', 'audio/x-wav', 'audio/mpeg']::text[]
where id = 'ambience-audio';

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
  return query select new_id, 'ambience-audio'::text, target_path, target_expiry;
end;
$$;

revoke all on function public.admin_create_mp3_upload_reservation(uuid) from public, anon;
grant execute on function public.admin_create_mp3_upload_reservation(uuid) to authenticated;

commit;
