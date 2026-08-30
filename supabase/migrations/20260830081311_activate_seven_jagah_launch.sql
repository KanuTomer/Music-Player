BEGIN;

LOCK TABLE public.scenes IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.curated_sets IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  target_set_count integer;
  target_membership_count integer;
  target_video_count integer;
BEGIN
  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 10 THEN
    RAISE EXCEPTION 'activation requires the accepted ten-scene production baseline';
  END IF;

  IF (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN
    RAISE EXCEPTION 'activation requires exactly ten active rollback queues';
  END IF;

  SELECT count(*)
  INTO target_set_count
  FROM public.curated_sets cs
  JOIN public.scenes s ON s.id = cs.scene_id
  JOIN (VALUES
    ('sainik-dhaba', 'manual:sainik-dhaba:2026-08-29'),
    ('nai-ki-dukaan', 'PLVFLMYM1tErk'),
    ('bus-driver', 'manual:bus-driver:2026-08-29'),
    ('bartan-time', 'PLc1Byv6ESHSaag4naocpjBLSjO58i9MV5'),
    ('raj-mistri', 'PLTcrZKUys_a5zSgv_3ZHsRnTVJ05GbDvY'),
    ('papa-ke-gaane', 'PL3rJgr5HfVCrov_nZV_2ltKKFGWbbjATx'),
    ('corporate-majdoor', 'PLMqSYqU_UWQk')
  ) AS target(slug, origin_external_id)
    ON target.slug = s.slug
   AND target.origin_external_id = cs.origin_external_id
  WHERE NOT cs.is_active;

  IF target_set_count <> 7 THEN
    RAISE EXCEPTION 'expected seven inactive staged launch queues, found %', target_set_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.curated_sets cs
    JOIN public.scenes s ON s.id = cs.scene_id
    JOIN (VALUES
      ('sainik-dhaba', 'manual:sainik-dhaba:2026-08-29'),
      ('nai-ki-dukaan', 'PLVFLMYM1tErk'),
      ('bus-driver', 'manual:bus-driver:2026-08-29'),
      ('bartan-time', 'PLc1Byv6ESHSaag4naocpjBLSjO58i9MV5'),
      ('raj-mistri', 'PLTcrZKUys_a5zSgv_3ZHsRnTVJ05GbDvY'),
      ('papa-ke-gaane', 'PL3rJgr5HfVCrov_nZV_2ltKKFGWbbjATx'),
      ('corporate-majdoor', 'PLMqSYqU_UWQk')
    ) AS target(slug, origin_external_id)
      ON target.slug = s.slug
     AND target.origin_external_id = cs.origin_external_id
    LEFT JOIN public.curated_set_tracks cst ON cst.curated_set_id = cs.id
    GROUP BY cs.id
    HAVING count(cst.id) <> 25 OR count(DISTINCT cst.track_id) <> 25
  ) THEN
    RAISE EXCEPTION 'every staged launch queue must contain exactly 25 distinct tracks';
  END IF;

  SELECT count(*)
  INTO target_membership_count
  FROM public.curated_set_tracks cst
  JOIN public.curated_sets cs ON cs.id = cst.curated_set_id
  JOIN public.scenes s ON s.id = cs.scene_id
  JOIN (VALUES
    ('sainik-dhaba', 'manual:sainik-dhaba:2026-08-29'),
    ('nai-ki-dukaan', 'PLVFLMYM1tErk'),
    ('bus-driver', 'manual:bus-driver:2026-08-29'),
    ('bartan-time', 'PLc1Byv6ESHSaag4naocpjBLSjO58i9MV5'),
    ('raj-mistri', 'PLTcrZKUys_a5zSgv_3ZHsRnTVJ05GbDvY'),
    ('papa-ke-gaane', 'PL3rJgr5HfVCrov_nZV_2ltKKFGWbbjATx'),
    ('corporate-majdoor', 'PLMqSYqU_UWQk')
  ) AS target(slug, origin_external_id)
    ON target.slug = s.slug
   AND target.origin_external_id = cs.origin_external_id;

  IF target_membership_count <> 175 THEN
    RAISE EXCEPTION 'expected 175 staged memberships, found %', target_membership_count;
  END IF;

  SELECT count(DISTINCT ps.provider_item_id)
  INTO target_video_count
  FROM public.curated_set_tracks cst
  JOIN public.curated_sets cs ON cs.id = cst.curated_set_id
  JOIN public.scenes s ON s.id = cs.scene_id
  JOIN public.playback_sources ps ON ps.track_id = cst.track_id AND ps.is_active
  JOIN (VALUES
    ('sainik-dhaba', 'manual:sainik-dhaba:2026-08-29'),
    ('nai-ki-dukaan', 'PLVFLMYM1tErk'),
    ('bus-driver', 'manual:bus-driver:2026-08-29'),
    ('bartan-time', 'PLc1Byv6ESHSaag4naocpjBLSjO58i9MV5'),
    ('raj-mistri', 'PLTcrZKUys_a5zSgv_3ZHsRnTVJ05GbDvY'),
    ('papa-ke-gaane', 'PL3rJgr5HfVCrov_nZV_2ltKKFGWbbjATx'),
    ('corporate-majdoor', 'PLMqSYqU_UWQk')
  ) AS target(slug, origin_external_id)
    ON target.slug = s.slug
   AND target.origin_external_id = cs.origin_external_id;

  IF target_video_count <> 171 THEN
    RAISE EXCEPTION 'expected 171 unique staged YouTube videos, found %', target_video_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.curated_set_tracks cst
    JOIN public.curated_sets cs ON cs.id = cst.curated_set_id
    JOIN public.scenes s ON s.id = cs.scene_id
    JOIN (VALUES
      ('sainik-dhaba', 'manual:sainik-dhaba:2026-08-29'),
      ('nai-ki-dukaan', 'PLVFLMYM1tErk'),
      ('bus-driver', 'manual:bus-driver:2026-08-29'),
      ('bartan-time', 'PLc1Byv6ESHSaag4naocpjBLSjO58i9MV5'),
      ('raj-mistri', 'PLTcrZKUys_a5zSgv_3ZHsRnTVJ05GbDvY'),
      ('papa-ke-gaane', 'PL3rJgr5HfVCrov_nZV_2ltKKFGWbbjATx'),
      ('corporate-majdoor', 'PLMqSYqU_UWQk')
    ) AS target(slug, origin_external_id)
      ON target.slug = s.slug
     AND target.origin_external_id = cs.origin_external_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.playback_sources ps
      WHERE ps.track_id = cst.track_id AND ps.is_active
    )
  ) THEN
    RAISE EXCEPTION 'every staged launch membership must have an active playback source';
  END IF;
END
$$;

UPDATE public.curated_sets
SET is_active = false
WHERE is_active;

UPDATE public.curated_sets cs
SET
  is_active = true,
  sort_order = target.sort_order,
  title = target.title
FROM public.scenes s
JOIN (VALUES
  ('sainik-dhaba', 'manual:sainik-dhaba:2026-08-29', 1, 'Sainik Dhaba Radio'),
  ('nai-ki-dukaan', 'PLVFLMYM1tErk', 2, 'Deluxe Salon Radio'),
  ('bus-driver', 'manual:bus-driver:2026-08-29', 3, 'Bus Driver Radio'),
  ('bartan-time', 'PLc1Byv6ESHSaag4naocpjBLSjO58i9MV5', 4, 'Bartan Time Radio'),
  ('raj-mistri', 'PLTcrZKUys_a5zSgv_3ZHsRnTVJ05GbDvY', 5, 'Raju Mistri Radio'),
  ('papa-ke-gaane', 'PL3rJgr5HfVCrov_nZV_2ltKKFGWbbjATx', 6, 'Papa Ke Gaane Radio'),
  ('corporate-majdoor', 'PLMqSYqU_UWQk', 7, 'Corporate Majdoor Radio')
) AS target(slug, origin_external_id, sort_order, title)
  ON target.slug = s.slug
WHERE cs.scene_id = s.id
  AND cs.origin_external_id = target.origin_external_id;

UPDATE public.scenes
SET is_live = false
WHERE is_live;

UPDATE public.scenes s
SET
  is_live = true,
  sort_order = target.sort_order,
  chat_mode = 'closed',
  title_en = target.title_en,
  title_hi = target.title_hi
FROM (VALUES
  ('sainik-dhaba', 1, 'Sainik Dhaba', 'सैनिक ढाबा'),
  ('nai-ki-dukaan', 2, 'Deluxe Salon', 'डीलक्स सैलून'),
  ('bus-driver', 3, 'Bus Driver', 'बस ड्राइवर'),
  ('bartan-time', 4, 'Bartan Time', 'बर्तन टाइम'),
  ('raj-mistri', 5, 'Raju Mistri', 'राजू मिस्त्री'),
  ('papa-ke-gaane', 6, 'Papa Ke Gaane', 'पापा के गाने'),
  ('corporate-majdoor', 7, 'Corporate Majdoor', 'कॉर्पोरेट मज़दूर')
) AS target(slug, sort_order, title_en, title_hi)
WHERE s.slug = target.slug;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 7 THEN
    RAISE EXCEPTION 'activation did not produce exactly seven live scenes';
  END IF;

  IF (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 7 THEN
    RAISE EXCEPTION 'activation did not produce exactly seven active queues';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.curated_sets cs
    LEFT JOIN public.curated_set_tracks cst ON cst.curated_set_id = cs.id
    WHERE cs.is_active
    GROUP BY cs.id
    HAVING count(cst.id) <> 25 OR count(DISTINCT cst.track_id) <> 25
  ) THEN
    RAISE EXCEPTION 'an active launch queue does not contain exactly 25 distinct tracks';
  END IF;

  IF (
    SELECT count(*)
    FROM public.curated_set_tracks cst
    JOIN public.curated_sets cs ON cs.id = cst.curated_set_id
    WHERE cs.is_active
  ) <> 175 THEN
    RAISE EXCEPTION 'active launch membership total is not 175';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.curated_sets cs
    JOIN public.scenes s ON s.id = cs.scene_id
    WHERE cs.is_active AND NOT s.is_live
  ) THEN
    RAISE EXCEPTION 'an active queue belongs to a hidden scene';
  END IF;
END
$$;

COMMIT;
