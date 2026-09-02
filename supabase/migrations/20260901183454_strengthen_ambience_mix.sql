BEGIN;

WITH base_settings(slug, default_gain, min_gain, max_gain) AS (VALUES
  ('sainik-dhaba',0.35,0.24,0.45),
  ('nai-ki-dukaan',0.33,0.23,0.44),
  ('bus-driver',0.36,0.26,0.47),
  ('bartan-time',0.32,0.21,0.42),
  ('raj-mistri',0.32,0.21,0.42),
  ('papa-ke-gaane',0.50,0.38,0.62),
  ('corporate-majdoor',0.32,0.21,0.42)
)
UPDATE public.sound_stems stem
SET
  default_volume = settings.default_gain,
  min_gain = settings.min_gain,
  max_gain = settings.max_gain
FROM base_settings settings
JOIN public.scenes scene ON scene.slug = settings.slug
WHERE stem.scene_id = scene.id
  AND stem.role = 'base'
  AND stem.is_active;

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.sound_stems stem
    JOIN public.scenes scene ON scene.id = stem.scene_id
    WHERE stem.is_active
      AND stem.role = 'base'
      AND scene.slug IN (
        'sainik-dhaba',
        'nai-ki-dukaan',
        'bus-driver',
        'bartan-time',
        'raj-mistri',
        'papa-ke-gaane',
        'corporate-majdoor'
      )
      AND stem.min_gain <= stem.default_volume
      AND stem.default_volume <= stem.max_gain
  ) <> 7 THEN
    RAISE EXCEPTION 'Expected seven strengthened live Ambience base stems';
  END IF;
END
$$;

COMMIT;
