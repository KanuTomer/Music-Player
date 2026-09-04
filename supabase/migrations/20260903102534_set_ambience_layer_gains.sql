BEGIN;

UPDATE public.sound_stems stem
SET
  default_volume = CASE stem.role WHEN 'base' THEN 0.90 ELSE 0.60 END,
  min_gain = CASE stem.role WHEN 'base' THEN 0.82 ELSE 0.52 END,
  max_gain = CASE stem.role WHEN 'base' THEN 0.96 ELSE 0.68 END
WHERE stem.is_active
  AND stem.role IN ('base', 'texture')
  AND EXISTS (
    SELECT 1
    FROM public.scenes scene
    WHERE scene.id = stem.scene_id
      AND scene.is_live
  );

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.sound_stems stem
    JOIN public.scenes scene ON scene.id = stem.scene_id
    WHERE scene.is_live
      AND stem.is_active
      AND stem.role = 'base'
      AND stem.default_volume = 0.90
      AND stem.min_gain = 0.82
      AND stem.max_gain = 0.96
  ) <> 7 THEN
    RAISE EXCEPTION 'Expected seven live base stems at the revised gain';
  END IF;

  IF (
    SELECT count(*)
    FROM public.sound_stems stem
    JOIN public.scenes scene ON scene.id = stem.scene_id
    WHERE scene.is_live
      AND stem.is_active
      AND stem.role = 'texture'
      AND stem.default_volume = 0.60
      AND stem.min_gain = 0.52
      AND stem.max_gain = 0.68
  ) <> 7 THEN
    RAISE EXCEPTION 'Expected seven live texture stems at the revised gain';
  END IF;
END $$;

COMMIT;
