-- Reconstruct the current public MVP catalogue on the Vercel-owned backend.
INSERT INTO public.scenes (
  slug,
  title_en,
  title_hi,
  hook,
  description,
  region,
  category,
  palette,
  art_key,
  is_dark,
  chat_mode,
  gag_label,
  sort_order,
  is_live
)
VALUES
  (
    'bhojpuriya-devara',
    'Bhojpuriya Devara',
    'भोजपुरिया देवरा',
    'Aangan, radio aur Bhojpuri geeton wali shaam.',
    'A warm village courtyard where the radio keeps Bhojpuri favourites playing into the evening.',
    'Bihar & Purvanchal',
    'tier1',
    '{"accent":"#E5A100","accent2":"#C1440E","cool":"#2B5538"}'::jsonb,
    'bhojpuriya-devara',
    true,
    'open',
    NULL,
    9,
    true
  ),
  (
    'corporate-majdoor',
    'Corporate Majdoor',
    'कॉर्पोरेट मजदूर',
    'Cubicle ki thandi hawa aur endless deadlines.',
    'A late-evening Indian office floor: cubicles, glowing monitors and romantic Bollywood on loop.',
    'India',
    'tier1',
    '{}'::jsonb,
    'corporate-majdoor',
    true,
    'open',
    'Ek chai break',
    10,
    true
  )
ON CONFLICT (slug) DO UPDATE SET
  title_en = EXCLUDED.title_en,
  title_hi = EXCLUDED.title_hi,
  hook = EXCLUDED.hook,
  description = EXCLUDED.description,
  region = EXCLUDED.region,
  category = EXCLUDED.category,
  palette = EXCLUDED.palette,
  art_key = EXCLUDED.art_key,
  is_dark = EXCLUDED.is_dark,
  chat_mode = EXCLUDED.chat_mode,
  gag_label = EXCLUDED.gag_label,
  sort_order = EXCLUDED.sort_order,
  is_live = EXCLUDED.is_live;

-- Keep the public catalogue to the ten Jagahs verified against the live baseline.
UPDATE public.scenes
SET is_live = slug IN (
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

-- These rows could not be inserted by the preceding migration because the
-- two scene records did not exist at that point.
INSERT INTO public.oneliners (scene_id, text_en, text_hi, daypart_tag, weight)
SELECT s.id, v.text_en, v.text_hi, v.daypart_tag, 1
FROM public.scenes AS s
JOIN (VALUES
  ('bhojpuriya-devara', 'Naach shuru, dhol baje ta.', 'नाच शुरू, ढोल बजे ता।', 'evening'),
  ('bhojpuriya-devara', 'Gaon ke mele mein bhid ba.', 'गाँव के मेले में भीड़ बा।', 'evening'),
  ('bhojpuriya-devara', 'Balam ji, thoda dhire.', 'बलम जी, थोड़ा धीरे।', 'all'),
  ('corporate-majdoor', 'Ek aur meeting, jo mail bhi ho sakti thi.', 'एक और मीटिंग, जो मेल भी हो सकती थी।', 'day'),
  ('corporate-majdoor', 'AC 18 pe hai aur sweater laana bhool gaye.', 'एसी 18 पे है और स्वेटर लाना भूल गए।', 'day'),
  ('corporate-majdoor', 'Cab 9 baje, kaam 11 tak.', 'कैब 9 बजे, काम 11 तक।', 'night'),
  ('corporate-majdoor', 'Chai break hi asli appraisal hai.', 'चाय ब्रेक ही असली अप्रेज़ल है।', 'evening')
) AS v(slug, text_en, text_hi, daypart_tag) ON v.slug = s.slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.oneliners AS existing
  WHERE existing.scene_id = s.id
    AND existing.text_en = v.text_en
    AND existing.daypart_tag = v.daypart_tag
);

-- Supabase no longer grants Data API table access implicitly. Keep RLS in
-- force while explicitly granting catalogue reads to public clients.
GRANT SELECT ON TABLE
  public.sponsors,
  public.scenes,
  public.tracks,
  public.oneliners,
  public.sound_stems
TO anon, authenticated;

-- Chat, generated rooms, and database reactions are parked for the MVP.
REVOKE INSERT ON TABLE public.generated_rooms FROM anon, authenticated;
REVOKE INSERT ON TABLE public.chat_messages FROM anon, authenticated;
REVOKE INSERT ON TABLE public.reactions FROM anon, authenticated;

DROP POLICY IF EXISTS "anyone can create generated rooms" ON public.generated_rooms;
DROP POLICY IF EXISTS "chat insert" ON public.chat_messages;
DROP POLICY IF EXISTS "reactions insert" ON public.reactions;

-- Presence and broadcast use Realtime channels rather than table writes. The
-- existing publication entries are retained for compatibility with the room.

-- Public objects are readable through the Storage public URL. No write policy
-- is created on storage.objects, so browser clients cannot mutate this bucket.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'scene-media',
  'scene-media',
  true,
  15728640,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'video/mp4',
    'video/webm'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
