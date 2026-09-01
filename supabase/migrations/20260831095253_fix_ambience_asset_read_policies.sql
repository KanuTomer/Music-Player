begin;

-- Avoid a policy dependency cycle between ambience_assets and sound_stems.
-- Active assets are publication-ready catalogue records; inactive assets remain private.
drop policy if exists "Public reads ambience assets used by live scenes" on public.ambience_assets;
create policy "Public reads active ambience assets"
on public.ambience_assets
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public reads provenance for live ambience assets" on public.ambience_asset_sources;
create policy "Public reads provenance for active ambience assets"
on public.ambience_asset_sources
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.ambience_assets asset
    where asset.id = ambience_asset_sources.asset_id
      and asset.is_active = true
  )
);

commit;
