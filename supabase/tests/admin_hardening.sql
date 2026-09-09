begin;

create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin-hardening@example.invalid',
  'not-used',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.app_admins(user_id)
values ('10000000-0000-4000-8000-000000000001');

insert into public.scenes (
  id, slug, title_en, title_hi, hook, art_key, is_live, background_storage_path
) values (
  '20000000-0000-4000-8000-000000000001',
  'admin-hardening-test',
  'Admin hardening test',
  'Admin hardening test',
  'Test',
  'test',
  true,
  'rooms/admin-hardening-test/background/30000000-0000-4000-8000-000000000001.webp'
);

select ok(
  not has_table_privilege('authenticated', 'public.scenes', 'UPDATE'),
  'authenticated cannot update scenes directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.ambience_profiles', 'INSERT'),
  'authenticated cannot insert ambience profiles directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.sound_stems', 'UPDATE'),
  'authenticated cannot update stems directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.ambience_assets', 'DELETE'),
  'authenticated cannot delete ambience assets directly'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.admin_secured_save_ambience_profile(uuid,boolean,numeric,numeric,integer,integer,jsonb)',
    'EXECUTE'
  ),
  'anonymous users cannot execute admin mutation functions'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.admin_secured_save_scene_presentation(uuid,text,text,text,jsonb)',
    'EXECUTE'
  ),
  'the superseded presentation mutation is not callable'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.admin_record_audit(text,uuid,text,integer,uuid)',
    'EXECUTE'
  ),
  'browser roles cannot insert audit rows directly'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.admin_complete_upload_reservation(uuid)',
    'EXECUTE'
  ),
  'browser roles cannot finalize upload reservations directly'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);
select throws_ok(
  $$select public.admin_secured_save_ambience_profile(
    '20000000-0000-4000-8000-000000000001', true, 0.4, 0.4, 900, 700, '{}'::jsonb
  )$$,
  '42501',
  'Administrator MFA verification is required',
  'an allowlisted AAL1 session cannot mutate data'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  $$select public.admin_secured_save_ambience_profile(
    '20000000-0000-4000-8000-000000000001', true, 0.4, 0.4, 900, 700, '{}'::jsonb
  )$$,
  '42501',
  'Administrator MFA verification is required',
  'a non-allowlisted AAL2 session cannot mutate data'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
select lives_ok(
  $$select public.admin_secured_save_ambience_profile(
    '20000000-0000-4000-8000-000000000001', true, 0.4, 0.4, 900, 700, '{}'::jsonb
  )$$,
  'an allowlisted AAL2 session can use the secured mutation'
);
reset role;

select is(
  (select count(*)::integer from public.admin_audit_log
   where actor_id = '10000000-0000-4000-8000-000000000001'
     and action = 'ambience.profile.save'),
  1,
  'the successful mutation writes one audit record'
);

update public.admin_rate_limits
set request_count = 60
where actor_id = '10000000-0000-4000-8000-000000000001'
  and bucket = 'ambience.profile';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  $$select public.admin_secured_save_ambience_profile(
    '20000000-0000-4000-8000-000000000001', false, 0.4, 0.4, 900, 700, '{}'::jsonb
  )$$,
  'P0001',
  'Too many requests. Please wait and try again.',
  'the secured mutation enforces its fixed rate limit'
);
reset role;

select is(
  (select enabled from public.ambience_profiles
   where scene_id = '20000000-0000-4000-8000-000000000001'),
  true,
  'a rejected rate-limited mutation is rolled back'
);
select is(
  (select count(*)::integer from public.admin_audit_log
   where actor_id = '10000000-0000-4000-8000-000000000001'
     and action = 'ambience.profile.save'),
  1,
  'a rejected mutation does not create an audit record'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal2"}',
  true
);
select throws_ok(
  $$select public.admin_queue_storage_cleanup(
    'scene-media',
    'rooms/admin-hardening-test/background/30000000-0000-4000-8000-000000000001.webp',
    'replaced_object'
  )$$,
  'P0001',
  'Storage object is still referenced',
  'an active background cannot be queued for deletion'
);
reset role;

insert into public.ambience_assets (
  id, storage_path, mime_type, byte_size, duration_seconds, sha256, is_active
) values (
  '40000000-0000-4000-8000-000000000001',
  'rooms/admin-hardening-test/ambience/50000000-0000-4000-8000-000000000001.mp3',
  'audio/mpeg',
  1024,
  1,
  repeat('A', 64),
  true
);
insert into public.ambience_asset_sources (
  id, asset_id, source_order, source_url, source_title, source_sha256,
  original_filename, original_byte_size, original_duration_seconds,
  selected_start_seconds, selected_duration_seconds
) values (
  '60000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  1,
  'https://example.invalid/source',
  'Public attribution',
  repeat('B', 64),
  'private-original.wav',
  2048,
  2,
  0,
  1
);

select is(
  (select original_filename from private.ambience_asset_provenance
   where asset_source_id = '60000000-0000-4000-8000-000000000001'),
  'private-original.wav',
  'upload provenance is copied to the private table'
);
select is(
  (select source_sha256 from public.ambience_asset_sources
   where id = '60000000-0000-4000-8000-000000000001'),
  repeat('0', 64),
  'the public compatibility row does not retain the source hash'
);
select ok(
  has_column_privilege(
    'anon', 'public.ambience_asset_sources', 'source_title', 'SELECT'
  ),
  'listeners can read public attribution'
);
select ok(
  not has_column_privilege(
    'anon', 'public.ambience_asset_sources', 'original_filename', 'SELECT'
  ),
  'listeners cannot read private provenance columns'
);
select ok(
  not has_table_privilege(
    'authenticated', 'private.ambience_asset_provenance', 'SELECT'
  ),
  'browser roles cannot read the private provenance table'
);

select * from finish();
rollback;
