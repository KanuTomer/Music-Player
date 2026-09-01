BEGIN;

DO $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.ambience_profiles profile
  SET visual_theme = '{"accent":"#e59f32","haze":"#9a5b2f","pattern":"dust","overlay_path":"rooms/sainik-dhaba/ambience/warm-road-light-v2.mp4","blend_mode":"soft-light","playback_rate":0.58,"opacity_floor":0.16,"opacity_ceiling":0.30}'::jsonb
  FROM public.scenes scene
  WHERE profile.scene_id = scene.id
    AND scene.slug = 'sainik-dhaba'
    AND profile.enabled;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count <> 1 THEN
    RAISE EXCEPTION 'Expected one enabled Sainik Dhaba ambience profile, updated %', updated_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.ambience_profiles profile
    JOIN public.scenes scene ON scene.id = profile.scene_id
    WHERE scene.slug = 'sainik-dhaba'
      AND profile.enabled
      AND profile.visual_theme ->> 'overlay_path' =
        'rooms/sainik-dhaba/ambience/warm-road-light-v2.mp4'
      AND profile.visual_theme ->> 'blend_mode' = 'soft-light'
  ) THEN
    RAISE EXCEPTION 'Sainik Dhaba ambience visual replacement was not verified';
  END IF;
END
$$;

COMMIT;
