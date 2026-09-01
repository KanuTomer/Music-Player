begin;

alter table public.sound_stems
  add column loop_start_seconds numeric(8,3) not null default 0
    check (loop_start_seconds >= 0),
  add column loop_end_seconds numeric(8,3)
    check (loop_end_seconds is null or loop_end_seconds > loop_start_seconds);

comment on column public.sound_stems.loop_start_seconds is
  'Start offset within the processed ambience asset.';
comment on column public.sound_stems.loop_end_seconds is
  'Optional end offset within the processed ambience asset; null uses the decoded duration.';

commit;
