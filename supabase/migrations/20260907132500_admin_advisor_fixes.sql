begin;

create index admin_audit_log_scene_id_idx on public.admin_audit_log(scene_id);
create index admin_upload_reservations_actor_id_idx on public.admin_upload_reservations(actor_id);
create index admin_upload_reservations_scene_id_idx on public.admin_upload_reservations(scene_id);

-- Keep one SELECT policy per role/table by folding the MFA-admin case into the
-- existing listener policy. Mutation policies remain admin-only.
drop policy "mfa admins manage ambience profiles" on public.ambience_profiles;
alter policy "live ambience profiles are public" on public.ambience_profiles
  using (
    public.admin_session_ready()
    or exists (select 1 from public.scenes scene where scene.id = scene_id and scene.is_live)
  );
create policy "mfa admins insert ambience profiles" on public.ambience_profiles
  for insert to authenticated with check (public.admin_session_ready());
create policy "mfa admins update ambience profiles" on public.ambience_profiles
  for update to authenticated using (public.admin_session_ready()) with check (public.admin_session_ready());
create policy "mfa admins delete ambience profiles" on public.ambience_profiles
  for delete to authenticated using (public.admin_session_ready());

drop policy "mfa admins manage ambience assets" on public.ambience_assets;
alter policy "Public reads active ambience assets" on public.ambience_assets
  using (is_active = true or public.admin_session_ready());
create policy "mfa admins insert ambience assets" on public.ambience_assets
  for insert to authenticated with check (public.admin_session_ready());
create policy "mfa admins update ambience assets" on public.ambience_assets
  for update to authenticated using (public.admin_session_ready()) with check (public.admin_session_ready());
create policy "mfa admins delete ambience assets" on public.ambience_assets
  for delete to authenticated using (public.admin_session_ready());

drop policy "mfa admins manage ambience provenance" on public.ambience_asset_sources;
alter policy "Public reads provenance for active ambience assets" on public.ambience_asset_sources
  using (
    public.admin_session_ready()
    or exists (
      select 1 from public.ambience_assets asset
      where asset.id = asset_id and asset.is_active = true
    )
  );
create policy "mfa admins insert ambience provenance" on public.ambience_asset_sources
  for insert to authenticated with check (public.admin_session_ready());
create policy "mfa admins update ambience provenance" on public.ambience_asset_sources
  for update to authenticated using (public.admin_session_ready()) with check (public.admin_session_ready());
create policy "mfa admins delete ambience provenance" on public.ambience_asset_sources
  for delete to authenticated using (public.admin_session_ready());

drop policy "mfa admins manage oneliners" on public.oneliners;
alter policy "oneliners public read" on public.oneliners
  using (
    public.admin_session_ready()
    or exists (select 1 from public.scenes s where s.id = scene_id and s.is_live)
  );
create policy "mfa admins insert oneliners" on public.oneliners
  for insert to authenticated with check (public.admin_session_ready());
create policy "mfa admins update oneliners" on public.oneliners
  for update to authenticated using (public.admin_session_ready()) with check (public.admin_session_ready());
create policy "mfa admins delete oneliners" on public.oneliners
  for delete to authenticated using (public.admin_session_ready());

drop policy "mfa admins manage sound stems" on public.sound_stems;
alter policy "live stems are public" on public.sound_stems
  using (
    public.admin_session_ready()
    or (
      is_active and exists (select 1 from public.scenes s where s.id = scene_id and s.is_live)
    )
  );
create policy "mfa admins insert sound stems" on public.sound_stems
  for insert to authenticated with check (public.admin_session_ready());
create policy "mfa admins update sound stems" on public.sound_stems
  for update to authenticated using (public.admin_session_ready()) with check (public.admin_session_ready());
create policy "mfa admins delete sound stems" on public.sound_stems
  for delete to authenticated using (public.admin_session_ready());

revoke execute on function public.admin_assert_ready() from authenticated;

commit;
