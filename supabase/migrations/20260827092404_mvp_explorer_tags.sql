alter table public.scenes
  add column tags text[] not null default '{}'::text[];

comment on column public.scenes.tags is
  'Editorial discovery tags used by the Jagah Explorer.';

update public.scenes
set tags = case slug
  when 'sainik-dhaba' then array['shaam', 'yaadein']::text[]
  when 'nai-ki-dukaan' then array['kaam', 'yaadein']::text[]
  when 'chai-ki-tapri' then array['shaam', 'yaadein']::text[]
  when 'raj-mistri' then array['kaam']::text[]
  when 'rail-yatra' then array['safar', 'yaadein']::text[]
  when 'raat-ki-bus' then array['safar', 'shaam']::text[]
  when 'sarkari-daftar' then array['kaam', 'yaadein']::text[]
  when 'doordarshan-shaam' then array['shaam', 'yaadein']::text[]
  when 'bhojpuriya-devara' then array['shaam', 'yaadein']::text[]
  when 'corporate-majdoor' then array['kaam', 'shaam']::text[]
  else tags
end
where slug in (
  'sainik-dhaba',
  'nai-ki-dukaan',
  'chai-ki-tapri',
  'raj-mistri',
  'rail-yatra',
  'raat-ki-bus',
  'sarkari-daftar',
  'doordarshan-shaam',
  'bhojpuriya-devara',
  'corporate-majdoor'
);
