begin;

-- Anonymous listener policies must never invoke admin-only helpers. Keeping the
-- administrator branch in a separate authenticated policy prevents PostgREST
-- from raising an EXECUTE permission error while evaluating public room reads.
drop policy if exists "live ambience profiles are public" on public.ambience_profiles;
drop policy if exists "authenticated ambience profiles read" on public.ambience_profiles;
create policy "live ambience profiles are public"
  on public.ambience_profiles for select to anon
  using (exists (
    select 1 from public.scenes scene
    where scene.id = scene_id and scene.is_live
  ));
create policy "authenticated ambience profiles read"
  on public.ambience_profiles for select to authenticated
  using (
    exists (
      select 1 from public.scenes scene
      where scene.id = scene_id and scene.is_live
    )
    or (select public.admin_session_ready())
  );

drop policy if exists "Public reads active ambience assets" on public.ambience_assets;
drop policy if exists "authenticated ambience assets read" on public.ambience_assets;
create policy "Public reads active ambience assets"
  on public.ambience_assets for select to anon
  using (is_active = true);
create policy "authenticated ambience assets read"
  on public.ambience_assets for select to authenticated
  using (is_active = true or (select public.admin_session_ready()));

drop policy if exists "Public reads provenance for active ambience assets" on public.ambience_asset_sources;
drop policy if exists "authenticated ambience provenance read" on public.ambience_asset_sources;
create policy "Public reads provenance for active ambience assets"
  on public.ambience_asset_sources for select to anon
  using (exists (
    select 1 from public.ambience_assets asset
    where asset.id = asset_id and asset.is_active = true
  ));
create policy "authenticated ambience provenance read"
  on public.ambience_asset_sources for select to authenticated
  using (
    exists (
      select 1 from public.ambience_assets asset
      where asset.id = asset_id and asset.is_active = true
    )
    or (select public.admin_session_ready())
  );

drop policy if exists "oneliners public read" on public.oneliners;
drop policy if exists "authenticated oneliners read" on public.oneliners;
create policy "oneliners public read"
  on public.oneliners for select to anon
  using (exists (
    select 1 from public.scenes scene
    where scene.id = scene_id and scene.is_live
  ));
create policy "authenticated oneliners read"
  on public.oneliners for select to authenticated
  using (
    exists (
      select 1 from public.scenes scene
      where scene.id = scene_id and scene.is_live
    )
    or (select public.admin_session_ready())
  );

drop policy if exists "live stems are public" on public.sound_stems;
drop policy if exists "authenticated sound stems read" on public.sound_stems;
create policy "live stems are public"
  on public.sound_stems for select to anon
  using (
    is_active = true
    and exists (
      select 1 from public.scenes scene
      where scene.id = scene_id and scene.is_live
    )
  );
create policy "authenticated sound stems read"
  on public.sound_stems for select to authenticated
  using (
    (
      is_active = true
      and exists (
        select 1 from public.scenes scene
        where scene.id = scene_id and scene.is_live
      )
    )
    or (select public.admin_session_ready())
  );

commit;
