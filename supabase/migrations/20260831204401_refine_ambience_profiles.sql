BEGIN;

ALTER TABLE public.ambience_profiles
  ADD COLUMN audio_theme JSONB NOT NULL DEFAULT '{}'::jsonb
  CHECK (jsonb_typeof(audio_theme) = 'object');

WITH profile_settings(slug, audio_theme, visual_theme) AS (VALUES
  (
    'sainik-dhaba',
    '{"base":{"highpass_hz":60,"lowpass_hz":3800,"peak_hz":220,"peak_gain_db":2,"peak_q":0.8},"texture":{"highpass_hz":120,"lowpass_hz":6000,"peak_hz":1200,"peak_gain_db":1.5,"peak_q":0.9},"event":{"highpass_hz":100,"lowpass_hz":7000,"peak_hz":900,"peak_gain_db":2,"peak_q":1}}'::jsonb,
    '{"accent":"#e59f32","haze":"#d97724","pattern":"dust","overlay_path":"rooms/sainik-dhaba/ambience/overlay.mp4","blend_mode":"screen","playback_rate":0.72,"opacity_floor":0.42,"opacity_ceiling":0.72}'::jsonb
  ),
  (
    'nai-ki-dukaan',
    '{"base":{"highpass_hz":120,"lowpass_hz":8500,"peak_hz":2600,"peak_gain_db":2.5,"peak_q":0.9},"texture":{"highpass_hz":500,"lowpass_hz":9500,"peak_hz":4000,"peak_gain_db":3,"peak_q":1.1},"event":{"highpass_hz":180,"lowpass_hz":9000,"peak_hz":2200,"peak_gain_db":2,"peak_q":1}}'::jsonb,
    '{"accent":"#48a9a6","haze":"#245c5b","pattern":"shimmer","overlay_path":"rooms/nai-ki-dukaan/ambience/overlay.mp4","blend_mode":"soft-light","playback_rate":0.8,"opacity_floor":0.34,"opacity_ceiling":0.58}'::jsonb
  ),
  (
    'bus-driver',
    '{"base":{"highpass_hz":35,"lowpass_hz":3200,"peak_hz":120,"peak_gain_db":3,"peak_q":0.75},"texture":{"highpass_hz":55,"lowpass_hz":4500,"peak_hz":260,"peak_gain_db":2,"peak_q":0.8},"event":{"highpass_hz":90,"lowpass_hz":5200,"peak_hz":480,"peak_gain_db":1.5,"peak_q":0.9}}'::jsonb,
    '{"accent":"#e2a83b","haze":"#31445f","pattern":"streaks","overlay_path":"rooms/bus-driver/ambience/overlay.mp4","blend_mode":"screen","playback_rate":0.85,"opacity_floor":0.36,"opacity_ceiling":0.64}'::jsonb
  ),
  (
    'bartan-time',
    '{"base":{"highpass_hz":100,"lowpass_hz":7500,"peak_hz":2500,"peak_gain_db":2,"peak_q":1},"texture":{"highpass_hz":400,"lowpass_hz":10000,"peak_hz":5200,"peak_gain_db":3,"peak_q":1.2},"event":{"highpass_hz":180,"lowpass_hz":9000,"peak_hz":3600,"peak_gain_db":2.5,"peak_q":1.1}}'::jsonb,
    '{"accent":"#8bc7bc","haze":"#315f58","pattern":"ripples","overlay_path":"rooms/bartan-time/ambience/overlay.mp4","blend_mode":"screen","playback_rate":0.68,"opacity_floor":0.38,"opacity_ceiling":0.66}'::jsonb
  ),
  (
    'raj-mistri',
    '{"base":{"highpass_hz":70,"lowpass_hz":6500,"peak_hz":900,"peak_gain_db":3,"peak_q":0.9},"texture":{"highpass_hz":120,"lowpass_hz":7000,"peak_hz":1800,"peak_gain_db":2,"peak_q":1},"event":{"highpass_hz":90,"lowpass_hz":7200,"peak_hz":1200,"peak_gain_db":2.5,"peak_q":0.9}}'::jsonb,
    '{"accent":"#d16a3a","haze":"#6d3528","pattern":"dust","overlay_path":"rooms/raj-mistri/ambience/overlay.mp4","blend_mode":"screen","playback_rate":0.76,"opacity_floor":0.32,"opacity_ceiling":0.56}'::jsonb
  ),
  (
    'papa-ke-gaane',
    '{"base":{"highpass_hz":80,"lowpass_hz":4200,"peak_hz":240,"peak_gain_db":2,"peak_q":0.8},"texture":{"highpass_hz":450,"lowpass_hz":5200,"peak_hz":1800,"peak_gain_db":3,"peak_q":1.1},"event":{"highpass_hz":180,"lowpass_hz":5600,"peak_hz":1400,"peak_gain_db":2,"peak_q":1}}'::jsonb,
    '{"accent":"#d8a15d","haze":"#6d3429","pattern":"scanlines","overlay_path":"rooms/papa-ke-gaane/ambience/overlay.mp4","blend_mode":"screen","playback_rate":0.72,"opacity_floor":0.28,"opacity_ceiling":0.5}'::jsonb
  ),
  (
    'corporate-majdoor',
    '{"base":{"highpass_hz":120,"lowpass_hz":5000,"peak_hz":900,"peak_gain_db":-1,"peak_q":0.8},"texture":{"highpass_hz":500,"lowpass_hz":6500,"peak_hz":2400,"peak_gain_db":1.5,"peak_q":1},"event":{"highpass_hz":120,"lowpass_hz":5500,"peak_hz":700,"peak_gain_db":1,"peak_q":0.9}}'::jsonb,
    '{"accent":"#6aa6c8","haze":"#253d52","pattern":"grid","overlay_path":"rooms/corporate-majdoor/ambience/overlay.mp4","blend_mode":"soft-light","playback_rate":0.62,"opacity_floor":0.3,"opacity_ceiling":0.52}'::jsonb
  )
)
UPDATE public.ambience_profiles profile
SET
  max_master_gain = 0.55,
  audio_theme = settings.audio_theme,
  visual_theme = settings.visual_theme
FROM profile_settings settings
JOIN public.scenes scene ON scene.slug = settings.slug
WHERE profile.scene_id = scene.id
  AND profile.enabled;

WITH stem_settings(slug, role, default_gain, min_gain, max_gain) AS (VALUES
  ('sainik-dhaba','base',0.23,0.16,0.30),
  ('sainik-dhaba','texture',0.12,0.08,0.17),
  ('sainik-dhaba','event',0.29,0.20,0.38),
  ('nai-ki-dukaan','base',0.22,0.15,0.29),
  ('nai-ki-dukaan','texture',0.11,0.07,0.16),
  ('nai-ki-dukaan','event',0.27,0.18,0.35),
  ('bus-driver','base',0.24,0.17,0.31),
  ('bus-driver','texture',0.11,0.07,0.16),
  ('bus-driver','event',0.24,0.15,0.33),
  ('bartan-time','base',0.21,0.14,0.28),
  ('bartan-time','texture',0.12,0.08,0.17),
  ('bartan-time','event',0.24,0.15,0.33),
  ('raj-mistri','base',0.21,0.14,0.28),
  ('raj-mistri','texture',0.11,0.06,0.15),
  ('raj-mistri','event',0.23,0.14,0.32),
  ('papa-ke-gaane','base',0.34,0.26,0.42),
  ('papa-ke-gaane','texture',0.13,0.09,0.18),
  ('papa-ke-gaane','event',0.27,0.18,0.36),
  ('corporate-majdoor','base',0.21,0.14,0.28),
  ('corporate-majdoor','texture',0.10,0.06,0.14),
  ('corporate-majdoor','event',0.23,0.14,0.32)
)
UPDATE public.sound_stems stem
SET
  default_volume = settings.default_gain,
  min_gain = settings.min_gain,
  max_gain = settings.max_gain
FROM stem_settings settings
JOIN public.scenes scene ON scene.slug = settings.slug
WHERE stem.scene_id = scene.id
  AND stem.role = settings.role
  AND stem.is_active;

DO $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.ambience_profiles profile
    JOIN public.scenes scene ON scene.id = profile.scene_id
    WHERE profile.enabled AND scene.is_live
  ) <> 7 THEN
    RAISE EXCEPTION 'Expected seven enabled live ambience profiles';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.ambience_profiles profile
    JOIN public.scenes scene ON scene.id = profile.scene_id
    WHERE profile.enabled AND scene.is_live
      AND (
        profile.max_master_gain <> 0.55
        OR profile.audio_theme = '{}'::jsonb
        OR NOT (profile.visual_theme ? 'overlay_path')
      )
  ) THEN
    RAISE EXCEPTION 'Ambience refinement profile configuration is incomplete';
  END IF;
  IF (
    SELECT count(*) FROM public.sound_stems stem
    JOIN public.scenes scene ON scene.id = stem.scene_id
    WHERE stem.is_active AND scene.is_live
  ) <> 21 THEN
    RAISE EXCEPTION 'Expected 21 active live ambience stems';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.sound_stems stem
    JOIN public.scenes scene ON scene.id = stem.scene_id
    WHERE stem.is_active AND scene.is_live
      AND NOT (stem.min_gain <= stem.default_volume AND stem.default_volume <= stem.max_gain)
  ) THEN
    RAISE EXCEPTION 'Ambience stem gains are invalid';
  END IF;
END
$$;

COMMIT;
