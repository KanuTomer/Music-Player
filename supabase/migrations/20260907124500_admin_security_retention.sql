begin;

-- This second additive step is kept separate so production can roll back the
-- application independently while retaining harmless security metadata.
create or replace function public.admin_run_retention()
returns table (expired_reservations integer, deleted_audit_rows integer, deleted_rate_rows integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_count integer;
  audit_count integer;
  rate_count integer;
begin
  if auth.role() <> 'service_role' then raise exception 'Service role required' using errcode = '42501'; end if;

  insert into public.admin_storage_cleanup_queue(bucket, object_path, reason)
  select r.bucket, r.object_path, 'expired_upload'
  from public.admin_upload_reservations r
  where r.finalized_at is null and r.discarded_at is null and r.expires_at <= now()
    and not exists (
      select 1 from public.scenes s where s.background_storage_path = r.object_path
    )
    and not exists (
      select 1 from public.ambience_assets a where a.storage_path = r.object_path
    )
  on conflict (bucket, object_path, reason) do nothing;
  get diagnostics reservation_count = row_count;

  delete from public.admin_audit_log where created_at < now() - interval '180 days';
  get diagnostics audit_count = row_count;
  delete from public.admin_rate_limits where window_started_at < now() - interval '2 days';
  get diagnostics rate_count = row_count;

  return query select reservation_count, audit_count, rate_count;
end;
$$;

revoke all on function public.admin_run_retention() from public, anon, authenticated;
grant execute on function public.admin_run_retention() to service_role;

commit;
