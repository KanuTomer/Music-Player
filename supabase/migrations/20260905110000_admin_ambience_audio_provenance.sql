begin;

alter table public.ambience_asset_sources
  alter column source_url drop not null,
  add column if not exists original_filename text,
  add column if not exists original_byte_size bigint check (original_byte_size is null or original_byte_size > 0),
  add column if not exists original_duration_seconds numeric check (original_duration_seconds is null or original_duration_seconds > 0),
  add column if not exists selected_start_seconds numeric check (selected_start_seconds is null or selected_start_seconds >= 0),
  add column if not exists selected_duration_seconds numeric check (selected_duration_seconds is null or selected_duration_seconds > 0);

comment on column public.ambience_asset_sources.original_filename is 'Local source filename supplied by an administrator.';
comment on column public.ambience_asset_sources.selected_start_seconds is 'Selected source-window start used for the published playback derivative.';
comment on column public.ambience_asset_sources.selected_duration_seconds is 'Selected source-window duration used for the published playback derivative.';

commit;
