begin;

-- Remove the original recursive policies now that the replacement policies are active.
drop policy if exists "live ambience assets are public" on public.ambience_assets;
drop policy if exists "live ambience provenance is public" on public.ambience_asset_sources;

commit;
