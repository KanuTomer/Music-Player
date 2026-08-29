-- Milestone 4.1 correction: every staged Jagah queue contains exactly the approved 25 songs.
SET lock_timeout = '10s';

DO $$
DECLARE
  v_expected record;
  v_actual integer;
BEGIN
  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 10 THEN
    RAISE EXCEPTION 'preflight failed: expected ten live scenes';
  END IF;
  IF (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN
    RAISE EXCEPTION 'preflight failed: expected ten active curated sets';
  END IF;

  FOR v_expected IN SELECT * FROM (VALUES
    ('8f382722-007c-481f-9b61-82332ee7aae8'::uuid, 'deluxe-salon', 67, 42),
    ('bb2cbc33-29d6-4945-ac7a-164ed1f49c8f'::uuid, 'bus-driver', 25, 0),
    ('fe42b40e-6b02-4b60-9ccb-06b1a7e1649d'::uuid, 'bhojpuri-bangers', 3674, 3649),
    ('d425495b-9938-4a13-a9f0-6014cc3a611d'::uuid, 'bartan-time', 25, 0),
    ('c44a6fb0-ae22-43fb-98b9-843472957d60'::uuid, 'raju-mistri', 353, 328),
    ('359d7737-e012-4f5d-aec0-b0c3fc1faafb'::uuid, 'papa-ke-gaane', 25, 0),
    ('d2d4c91e-5ac6-4bfd-bcba-299e60546b1f'::uuid, 'corporate-majdoor', 243, 218)
  ) AS expected(set_id, slug, membership_count, copied_count) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.curated_sets
      WHERE id = v_expected.set_id AND NOT is_active
    ) THEN
      RAISE EXCEPTION 'preflight failed: staged set missing or active for %', v_expected.slug;
    END IF;

    SELECT count(*) INTO v_actual
    FROM public.curated_set_tracks
    WHERE curated_set_id = v_expected.set_id;
    IF v_actual <> v_expected.membership_count THEN
      RAISE EXCEPTION 'preflight failed for %: expected %, found %', v_expected.slug, v_expected.membership_count, v_actual;
    END IF;

    IF v_expected.copied_count > 0 AND (
      SELECT count(*) FROM public.curated_set_tracks
      WHERE curated_set_id = v_expected.set_id
        AND position > v_expected.copied_count
    ) <> 25 THEN
      RAISE EXCEPTION 'preflight failed: expected 25 approved additions for %', v_expected.slug;
    END IF;
  END LOOP;
END $$;

DELETE FROM public.curated_set_tracks
WHERE
  (curated_set_id = '8f382722-007c-481f-9b61-82332ee7aae8'::uuid AND position <= 42)
  OR (curated_set_id = 'fe42b40e-6b02-4b60-9ccb-06b1a7e1649d'::uuid AND position <= 3649)
  OR (curated_set_id = 'c44a6fb0-ae22-43fb-98b9-843472957d60'::uuid AND position <= 328)
  OR (curated_set_id = 'd2d4c91e-5ac6-4bfd-bcba-299e60546b1f'::uuid AND position <= 218);

UPDATE public.curated_set_tracks
SET position = position - CASE curated_set_id
  WHEN '8f382722-007c-481f-9b61-82332ee7aae8'::uuid THEN 42
  WHEN 'fe42b40e-6b02-4b60-9ccb-06b1a7e1649d'::uuid THEN 3649
  WHEN 'c44a6fb0-ae22-43fb-98b9-843472957d60'::uuid THEN 328
  WHEN 'd2d4c91e-5ac6-4bfd-bcba-299e60546b1f'::uuid THEN 218
END
WHERE curated_set_id IN (
  '8f382722-007c-481f-9b61-82332ee7aae8'::uuid,
  'fe42b40e-6b02-4b60-9ccb-06b1a7e1649d'::uuid,
  'c44a6fb0-ae22-43fb-98b9-843472957d60'::uuid,
  'd2d4c91e-5ac6-4bfd-bcba-299e60546b1f'::uuid
);

DO $$
DECLARE
  v_set record;
BEGIN
  FOR v_set IN SELECT * FROM (VALUES
    ('8f382722-007c-481f-9b61-82332ee7aae8'::uuid, 'deluxe-salon'),
    ('bb2cbc33-29d6-4945-ac7a-164ed1f49c8f'::uuid, 'bus-driver'),
    ('fe42b40e-6b02-4b60-9ccb-06b1a7e1649d'::uuid, 'bhojpuri-bangers'),
    ('d425495b-9938-4a13-a9f0-6014cc3a611d'::uuid, 'bartan-time'),
    ('c44a6fb0-ae22-43fb-98b9-843472957d60'::uuid, 'raju-mistri'),
    ('359d7737-e012-4f5d-aec0-b0c3fc1faafb'::uuid, 'papa-ke-gaane'),
    ('d2d4c91e-5ac6-4bfd-bcba-299e60546b1f'::uuid, 'corporate-majdoor')
  ) AS staged(set_id, slug) LOOP
    IF (
      SELECT count(*) = 25 AND min(position) = 1 AND max(position) = 25
      FROM public.curated_set_tracks
      WHERE curated_set_id = v_set.set_id
    ) IS NOT TRUE THEN
      RAISE EXCEPTION 'correction failed: % does not contain positions 1 through 25', v_set.slug;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.curated_set_tracks cst
      LEFT JOIN public.playback_sources ps ON ps.track_id = cst.track_id AND ps.is_active
      WHERE cst.curated_set_id = v_set.set_id AND ps.id IS NULL
    ) THEN
      RAISE EXCEPTION 'correction failed: % has a membership without an active source', v_set.slug;
    END IF;
  END LOOP;

  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 10 THEN
    RAISE EXCEPTION 'correction changed the live scene count';
  END IF;
  IF (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN
    RAISE EXCEPTION 'correction changed the active set count';
  END IF;
END $$;
