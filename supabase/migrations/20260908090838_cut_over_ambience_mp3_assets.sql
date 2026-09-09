begin;

create temporary table ambience_mp3_cutover (
  old_path text primary key,
  new_path text unique not null,
  byte_size bigint not null,
  duration_seconds numeric not null,
  sha256 text not null
) on commit drop;

insert into ambience_mp3_cutover(old_path, new_path, byte_size, duration_seconds, sha256) values
('rooms/bartan-time/ambience/base.wav','rooms/bartan-time/ambience/base-6d3a53de81f1250e.mp3',263124,32.868,'6D3A53DE81F1250EF15EBF3D36D37792282942DE8BF00A61397AE764CF5170A8'),
('rooms/bartan-time/ambience/event.wav','rooms/bartan-time/ambience/event-71c165facb711dac.mp3',96660,12.06,'71C165FACB711DAC42338EAD679E10BEB334912AEDBF6F36AA125ECB4C9E87EC'),
('rooms/bartan-time/ambience/texture.wav','rooms/bartan-time/ambience/texture-6152bfef2a16e1bd.mp3',480564,60.048,'6152BFEF2A16E1BD31DE15BA7E3A0FADC7FAA05CF4D1E87C4526FDF40DF54D51'),
('rooms/bus-driver/ambience/base.wav','rooms/bus-driver/ambience/base-2d04e20a436d7eaa.mp3',720468,90.036,'2D04E20A436D7EAA511C1653E44432182EED4E695A88B945D14F7CEF756DBB6E'),
('rooms/bus-driver/ambience/event.wav','rooms/bus-driver/ambience/event-348ad9a607982d4a.mp3',36180,4.5,'348AD9A607982D4A83A287FBF1A7DD7F6F0E18C82F764B3676FC9458CC663446'),
('rooms/corporate-majdoor/ambience/base.wav','rooms/corporate-majdoor/ambience/base-304d53750faf5206.mp3',448020,55.98,'304D53750FAF5206080CF74DE5B6E5BE5AEA8E5D7A712C1C3C4FB956864D652C'),
('rooms/corporate-majdoor/ambience/event.wav','rooms/corporate-majdoor/ambience/event-2275dc4dc9e80cf3.mp3',96660,12.06,'2275DC4DC9E80CF3D7F9AF4BAD718946C048D7142E98F2F161396C826CDF856F'),
('rooms/corporate-majdoor/ambience/texture.wav','rooms/corporate-majdoor/ambience/texture-6d885609de92bfeb.mp3',47124,5.868,'6D885609DE92BFEBF08994A0BDC8C8D7B73DDB9F0CB54FFCABCD06377B549136'),
('rooms/nai-ki-dukaan/ambience/base.wav','rooms/nai-ki-dukaan/ambience/base-1cf3ba7c6db25983.mp3',720468,90.036,'1CF3BA7C6DB259836CA9C4BA55700E520D3B5CE8497BC8906614B07D0E4FCBCE'),
('rooms/nai-ki-dukaan/ambience/event.wav','rooms/nai-ki-dukaan/ambience/event-e1d1abd83b8047fb.mp3',96660,12.06,'E1D1ABD83B8047FB2691584129F1651E2D0C0E35258E060F8E9542A195393733'),
('rooms/nai-ki-dukaan/ambience/texture.wav','rooms/nai-ki-dukaan/ambience/texture-65d76d0c241ee5e6.mp3',317268,39.636,'65D76D0C241EE5E60533062C50DEDDA70C788406198EFA93B2F5F7A4A14C44DB'),
('rooms/papa-ke-gaane/ambience/base.wav','rooms/papa-ke-gaane/ambience/base-586b4f9e0f47a66a.mp3',128628,16.056,'586B4F9E0F47A66A77AD6D1A4A57F3A9A2A71E2061E0A31B460A25CEF21839D9'),
('rooms/papa-ke-gaane/ambience/event.wav','rooms/papa-ke-gaane/ambience/event-261d27fca2add927.mp3',36180,4.5,'261D27FCA2ADD927F3C3514AA8F83652B03B0BC35EFB2226568B88AA17D6A5A2'),
('rooms/papa-ke-gaane/ambience/texture.wav','rooms/papa-ke-gaane/ambience/texture-905f6020a8431ce1.mp3',56340,7.02,'905F6020A8431CE1F88C455025DEC3B7E73C23131A6D4ABDD9AFD2651893AFC2'),
('rooms/raj-mistri/ambience/base.wav','rooms/raj-mistri/ambience/base-9478ff96013cbad7.mp3',720468,90.036,'9478FF96013CBAD72962FBD008AA79A9863D12920FA6D0EB6F97FF0E39902E12'),
('rooms/raj-mistri/ambience/event.wav','rooms/raj-mistri/ambience/event-06e6cb11f6c5ac10.mp3',120564,15.048,'06E6CB11F6C5AC100A216BF66906AD7ACE3C894D6BDC7376994C4C6F767D5181'),
('rooms/raj-mistri/ambience/texture.wav','rooms/raj-mistri/ambience/texture-625b6904c64f6d8b.mp3',480564,60.048,'625B6904C64F6D8B2498A3C0F3C23EE119D59058F3318D82BF010A5208B97A72'),
('rooms/sainik-dhaba/ambience/event.wav','rooms/sainik-dhaba/ambience/event-9a46839c916c6e91.mp3',112500,14.04,'9A46839C916C6E916311F80F236CF2B6619BE1D20240084E9101F653FC14869C'),
('rooms/sainik-dhaba/ambience/texture.wav','rooms/sainik-dhaba/ambience/texture-ced4a41a2008f0af.mp3',480564,60.048,'CED4A41A2008F0AF9E92C92CDA2A54DCCDE0AEF889EE37BD66E8D3D1E71BBC3F'),
('shared/indian-highway.wav','shared/indian-highway-91754718fdd39c5d.mp3',720468,90.036,'91754718FDD39C5DE3D67752DE046B5E8562D6E1871FE72E336FD8EBD0590938');

do $$
begin
  if (select count(*) from ambience_mp3_cutover) <> 20 then
    raise exception 'Expected 20 MP3 asset mappings';
  end if;
  if exists (
    select 1 from ambience_mp3_cutover m
    where not exists (
      select 1 from public.ambience_assets asset where asset.storage_path = m.old_path
    )
  ) then
    raise exception 'A legacy ambience asset is missing';
  end if;
  if exists (
    select 1 from ambience_mp3_cutover m
    where not exists (
      select 1 from storage.objects object
      where object.bucket_id = 'ambience-audio' and object.name = m.new_path
    )
  ) then
    raise exception 'An MP3 storage object is missing';
  end if;
end;
$$;

insert into public.ambience_assets(
  storage_path, mime_type, byte_size, duration_seconds, sha256, is_active
)
select m.new_path, 'audio/mpeg', m.byte_size, m.duration_seconds, m.sha256, old.is_active
from ambience_mp3_cutover m
join public.ambience_assets old on old.storage_path = m.old_path
on conflict(storage_path) do update set
  mime_type = excluded.mime_type,
  byte_size = excluded.byte_size,
  duration_seconds = excluded.duration_seconds,
  sha256 = excluded.sha256;

insert into public.ambience_asset_sources(
  asset_id, source_order, source_url, source_title, source_sha256,
  original_filename, original_byte_size, original_duration_seconds,
  selected_start_seconds, selected_duration_seconds
)
select
  replacement.id, source.source_order, source.source_url, source.source_title,
  source.source_sha256, source.original_filename, source.original_byte_size,
  source.original_duration_seconds, source.selected_start_seconds,
  source.selected_duration_seconds
from ambience_mp3_cutover m
join public.ambience_assets old on old.storage_path = m.old_path
join public.ambience_assets replacement on replacement.storage_path = m.new_path
join public.ambience_asset_sources source on source.asset_id = old.id
on conflict(asset_id, source_order) do nothing;

update public.sound_stems stem
set asset_id = replacement.id
from ambience_mp3_cutover m
join public.ambience_assets old on old.storage_path = m.old_path
join public.ambience_assets replacement on replacement.storage_path = m.new_path
where stem.asset_id = old.id;

do $$
begin
  if exists (
    select 1
    from public.sound_stems stem
    join public.ambience_assets asset on asset.id = stem.asset_id
    join ambience_mp3_cutover m on m.old_path = asset.storage_path
    where stem.is_active
  ) then
    raise exception 'An active stem still points at a mapped WAV asset';
  end if;
end;
$$;

commit;
