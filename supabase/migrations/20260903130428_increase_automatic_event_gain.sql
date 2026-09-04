BEGIN;
WITH event_gains(slug, default_gain, min_gain, max_gain) AS (
  VALUES
    ('sainik-dhaba',      0.39::numeric, 0.27::numeric, 0.51::numeric),
    ('nai-ki-dukaan',     0.36::numeric, 0.24::numeric, 0.47::numeric),
    ('bus-driver',        0.32::numeric, 0.20::numeric, 0.45::numeric),
    ('bartan-time',       0.32::numeric, 0.20::numeric, 0.45::numeric),
    ('raj-mistri',        0.31::numeric, 0.19::numeric, 0.43::numeric),
    ('papa-ke-gaane',     0.36::numeric, 0.24::numeric, 0.49::numeric),
    ('corporate-majdoor', 0.31::numeric, 0.19::numeric, 0.43::numeric)
)
UPDATE public.sound_stems AS stem
SET
  default_volume = gains.default_gain,
  min_gain = gains.min_gain,
  max_gain = gains.max_gain
FROM public.scenes AS scene
JOIN event_gains AS gains ON gains.slug = scene.slug
WHERE stem.scene_id = scene.id
  AND stem.role = 'event'
  AND stem.is_active = true;
DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.sound_stems AS stem
    JOIN public.scenes AS scene ON scene.id = stem.scene_id
    WHERE scene.is_live = true
      AND stem.is_active = true
      AND stem.role = 'event'
      AND stem.default_volume BETWEEN 0.31 AND 0.39
      AND stem.min_gain BETWEEN 0.19 AND 0.27
      AND stem.max_gain BETWEEN 0.43 AND 0.51
  ) <> 7 THEN
    RAISE EXCEPTION 'Expected seven updated live event stems';
  END IF;
END $$;
COMMIT;
