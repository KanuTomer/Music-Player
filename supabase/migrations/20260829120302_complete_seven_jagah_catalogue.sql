-- Complete the inactive seven-Jagah catalogue without changing production playback.
-- Source checksums: staged=fcc8c73ff49577d5fb77317c1414bbdd3fe5db42b6cee6b180539a26c77a6205; sainik=85aadd08843f462d0f6ccd0a51888bf94e0308a832a26bfa6ee9205922e4b877
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 10 THEN RAISE EXCEPTION 'expected ten live scenes'; END IF;
  IF (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN RAISE EXCEPTION 'expected ten active sets'; END IF;
  IF (SELECT count(*) FROM public.curated_sets WHERE NOT is_active) <> 7 THEN RAISE EXCEPTION 'expected seven prior inactive sets'; END IF;
  IF EXISTS (SELECT 1 FROM public.curated_sets cs LEFT JOIN public.curated_set_tracks cst ON cst.curated_set_id = cs.id WHERE NOT cs.is_active GROUP BY cs.id HAVING count(cst.id) <> 25) THEN RAISE EXCEPTION 'expected 25 memberships in every prior inactive set'; END IF;
END $$;

INSERT INTO public.scenes(slug, title_en, title_hi, hook, description, region, category, palette, art_key, is_dark, is_live, chat_mode, gag_label, sort_order, tags)
VALUES
  ('bus-driver', 'Bus Driver', 'बस ड्राइवर', 'Lambi route, khuli sadak, aur dashboard ka purana radio.', 'An overnight intercity bus cabin: humming engine, glowing highway signs and songs keeping the driver awake.', 'Pan India', 'tier1', '{"cool":"#17232D","accent":"#E5A100","accent2":"#C1440E"}'::jsonb, 'bus-driver', true, false, 'closed', 'Horn do', 3, ARRAY['safar', 'shaam']::text[]),
  ('bartan-time', 'Bartan Time', 'बर्तन टाइम', 'Steel ki khanak, nal ka paani, aur kitchen ka radio.', 'A late-night Indian kitchen after dinner: stacked steel plates, running water and songs between every scrub.', 'Pan India', 'tier1', '{"cool":"#183A3A","accent":"#E5A100","accent2":"#6B7B53"}'::jsonb, 'bartan-time', true, false, 'closed', 'Ek aur plate', 4, ARRAY['kaam', 'yaadein']::text[]),
  ('papa-ke-gaane', 'Papa Ke Gaane', 'पापा के गाने', 'Sunday ki safai, purani cassette, aur Papa ki pakki playlist.', 'A familiar family room on a slow Sunday: newspapers, old speakers and the songs Papa never skips.', 'Pan India', 'tier1', '{"cool":"#4A3827","accent":"#E5A100","accent2":"#6B7B53"}'::jsonb, 'papa-ke-gaane', false, false, 'closed', 'Volume badhao', 6, ARRAY['shaam', 'yaadein']::text[])
ON CONFLICT (slug) DO UPDATE SET title_en=EXCLUDED.title_en, title_hi=EXCLUDED.title_hi, hook=EXCLUDED.hook, description=EXCLUDED.description, region=EXCLUDED.region, category=EXCLUDED.category, palette=EXCLUDED.palette, art_key=EXCLUDED.art_key, is_dark=EXCLUDED.is_dark, chat_mode=EXCLUDED.chat_mode, gag_label=EXCLUDED.gag_label, tags=EXCLUDED.tags;

INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Agla stop chai aur diesel ke baad.', 'अगला स्टॉप चाय और डीज़ल के बाद।', 'all' FROM public.scenes s WHERE s.slug='bus-driver' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Agla stop chai aur diesel ke baad.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Conductor ne phir se aadhi neend mein seeti bajayi.', 'कंडक्टर ने फिर आधी नींद में सीटी बजाई।', 'night' FROM public.scenes s WHERE s.slug='bus-driver' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Conductor ne phir se aadhi neend mein seeti bajayi.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'High beam kam rakho, raat lambi hai.', 'हाई बीम कम रखो, रात लंबी है।', 'night' FROM public.scenes s WHERE s.slug='bus-driver' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='High beam kam rakho, raat lambi hai.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Dashboard ka radio signal pakad raha hai.', 'डैशबोर्ड का रेडियो सिग्नल पकड़ रहा है।', 'all' FROM public.scenes s WHERE s.slug='bus-driver' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Dashboard ka radio signal pakad raha hai.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Peechhe wali seat par koi abhi tak soya nahi.', 'पीछे वाली सीट पर कोई अभी तक सोया नहीं।', 'night' FROM public.scenes s WHERE s.slug='bus-driver' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Peechhe wali seat par koi abhi tak soya nahi.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Bas ye patila reh gaya... aur teen katori.', 'बस ये पतीला रह गया... और तीन कटोरी।', 'all' FROM public.scenes s WHERE s.slug='bartan-time' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Bas ye patila reh gaya... aur teen katori.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Jhaag zyada ho toh kaam thoda kam lagta hai.', 'झाग ज़्यादा हो तो काम थोड़ा कम लगता है।', 'all' FROM public.scenes s WHERE s.slug='bartan-time' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Jhaag zyada ho toh kaam thoda kam lagta hai.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Steel ka bartan apna hi taal banata hai.', 'स्टील का बर्तन अपनी ही ताल बनाता है।', 'all' FROM public.scenes s WHERE s.slug='bartan-time' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Steel ka bartan apna hi taal banata hai.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Sab kha ke chale gaye; radio abhi bhi yahin hai.', 'सब खाकर चले गए; रेडियो अभी भी यहीं है।', 'night' FROM public.scenes s WHERE s.slug='bartan-time' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Sab kha ke chale gaye; radio abhi bhi yahin hai.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Kal se turant dho denge — pakka.', 'कल से तुरंत धो देंगे — पक्का।', 'night' FROM public.scenes s WHERE s.slug='bartan-time' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Kal se turant dho denge — pakka.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Is gaane ke time tum paida bhi nahi hue the.', 'इस गाने के समय तुम पैदा भी नहीं हुए थे।', 'all' FROM public.scenes s WHERE s.slug='papa-ke-gaane' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Is gaane ke time tum paida bhi nahi hue the.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Cassette ko pencil se rewind karna padta tha.', 'कैसेट को पेंसिल से रिवाइंड करना पड़ता था।', 'all' FROM public.scenes s WHERE s.slug='papa-ke-gaane' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Cassette ko pencil se rewind karna padta tha.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Sunday ka akhbaar aur side A.', 'रविवार का अख़बार और साइड ए।', 'morning' FROM public.scenes s WHERE s.slug='papa-ke-gaane' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Sunday ka akhbaar aur side A.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Singer ka naam poochho, Papa ko sab yaad hai.', 'गायक का नाम पूछो, पापा को सब याद है।', 'all' FROM public.scenes s WHERE s.slug='papa-ke-gaane' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Singer ka naam poochho, Papa ko sab yaad hai.');
INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, 'Remote nahi milega; volume wahi rahega.', 'रिमोट नहीं मिलेगा; आवाज़ वहीं रहेगी।', 'evening' FROM public.scenes s WHERE s.slug='papa-ke-gaane' AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en='Remote nahi milega; volume wahi rahega.');

DELETE FROM public.curated_sets WHERE NOT is_active AND origin_external_id='PLwyqDgjhF4Qpq6kslMcQ8NR6RHb-Z4Tu-';
DELETE FROM public.tracks t USING public.playback_sources ps WHERE ps.track_id=t.id AND ps.provider='youtube' AND ps.provider_item_id IN (
  'm3uJ165NVm8', 'BdMTcZwCokI', 'F7tRt7EuPJQ', 'bGtlpearGyk', 'K_5N4Jd1jf4', '0_dhbcHmrVA', 'sDJhOHvWuaE', '0G7o18coi14', 'j469OPEkMvA', 'lKycprTHpQ4', 'zaxVOOhgR6Y', 'xJ6t72Iqq2k', 'aXeUvWR2dW8', 'C52R928B0cA', 'r0fm2yGBrnA', 'U4N_zyO5sts', 'zlzR3AOhCmg', 'gyTcDLtuYT4', '9W9d0LAI380', '9AiO8pxRC8E', 'BS6EY0HzKvI', 'YAtgKpugpQ4', 'Tvd4aHVyUwo', 'kbwuCugRFB0', 'Q8V0FcbG0ik'
) AND NOT EXISTS (SELECT 1 FROM public.curated_set_tracks cst WHERE cst.track_id=t.id);

INSERT INTO public.tracks(catalogue_key, scene_id, title, artist, year, daypart_tag, sort_order) VALUES
  ('youtube:lhVceZE1lf4', NULL, 'Bolo Ta Ra Ra', 'Daler Mehndi', 2022, 'all', 0),
  ('youtube:92ydUdqWE1g', NULL, 'Tunak Tunak Tun', 'Daler Mehndi', NULL, 'all', 0),
  ('youtube:KTE6S-Pmhpw', NULL, 'Ho Jayegi Balle Balle', 'Daler Mehndi', NULL, 'all', 0),
  ('youtube:vDolreuYdhA', NULL, 'Na Na Na Re', 'Daler Mehndi, Sudesh Bhosle', NULL, 'all', 0),
  ('youtube:M3UDnXE8m3A', NULL, 'Dardi Rab Rab Kardi', 'Daler Mehndi', NULL, 'all', 0),
  ('youtube:-99Z8E1pOrs', NULL, 'Ishq Tera Tadpave', 'Sukhbir', NULL, 'all', 0),
  ('youtube:AQ3mj1inalQ', NULL, 'Gal Ban Gayee', 'Sukhbir', NULL, 'all', 0),
  ('youtube:DK3cG2xyE1o', NULL, 'Sauda Khara Khara', 'Sukhbir', 1999, 'all', 0),
  ('youtube:lTuedTVFctw', NULL, 'Dil Le Gayee', 'Jasbir Jassi', NULL, 'all', 0),
  ('youtube:_rGz16v3CUM', NULL, 'Gur Nalon Ishq Mitha', 'Malkit Singh', NULL, 'all', 0),
  ('youtube:qF1APiiaIaY', NULL, 'Tutak Tutak Tutian', 'Malkit Singh', NULL, 'all', 0),
  ('youtube:tGiJSnwBwDQ', NULL, 'Tera Yaar Bolda', 'Surjit Bindrakhia', NULL, 'all', 0),
  ('youtube:0JgIYnjj0sk', NULL, 'Dupatta Tera Satrang Da', 'Surjit Bindrakhia', NULL, 'all', 0),
  ('youtube:FlvUFD24mT8', NULL, 'Mukhda Dekh Ke', 'Surjit Bindrakhia', NULL, 'all', 0),
  ('youtube:IifPaKjkMAc', NULL, 'Mittran Di Chhatri', 'Babbu Maan', NULL, 'all', 0),
  ('youtube:Iv7ls3mzPOU', NULL, 'Saun Di Jhadi', 'Babbu Maan', NULL, 'all', 0),
  ('youtube:Nfa0oXVAs3U', NULL, 'Challa', 'Gurdas Maan', NULL, 'all', 0),
  ('youtube:1cHLSWmVnTE', NULL, 'Apna Punjab Hove', 'Gurdas Maan', NULL, 'all', 0),
  ('youtube:jiwKVciHJxM', NULL, 'Dil Da Mamla Hai', 'Gurdas Maan', NULL, 'all', 0),
  ('youtube:pjQyBF2gwjQ', NULL, 'Ki Banu Duniya Da', 'Gurdas Maan, Diljit Dosanjh', NULL, 'all', 0),
  ('youtube:PaDaoNnOQaM', NULL, 'Mauja Hi Mauja', 'Mika Singh', NULL, 'all', 0),
  ('youtube:0gtDICWPTyA', NULL, 'Nagada Nagada', 'Sonu Nigam, Javed Ali', NULL, 'all', 0),
  ('youtube:Qk9bPR2wfJ4', NULL, 'Aahun Aahun', 'Neeraj Shridhar, Master Saleem, Suzi Q', NULL, 'all', 0),
  ('youtube:JpH2A7jMfjY', NULL, 'Main Jat Yamla Pagla Deewana', 'Mohammed Rafi', NULL, 'all', 0),
  ('youtube:2qreMYakSdg', NULL, 'Laung Gawacha', 'Neha Bhasin', NULL, 'all', 0)
ON CONFLICT (catalogue_key) DO UPDATE SET title=EXCLUDED.title, artist=EXCLUDED.artist, year=COALESCE(EXCLUDED.year, public.tracks.year);

INSERT INTO public.playback_sources(track_id, provider, provider_item_id, source_url, provider_title, provider_channel, priority, validated_at, is_active)
SELECT t.id, 'youtube', v.video_id, 'https://www.youtube.com/watch?v=' || v.video_id, v.provider_title, v.provider_channel, 0, v.validated_at::timestamptz, true FROM (VALUES
  ('lhVceZE1lf4', 'Bolo Ta Ra Ra (Lyrical) Daler Mehndi | Punjabi Pop Song | Superhit Punjabi Party Song', 'Daler Mehndi', '2026-08-29T11:40:56.887Z'),
  ('92ydUdqWE1g', 'Tunak Tunak Tun Video | Daler Mehndi | Full Song | Daler Mehndi Music', 'Daler Mehndi Music', '2026-08-29T11:40:56.887Z'),
  ('KTE6S-Pmhpw', 'Ho Jayegi Balle Balle - Daler Mehndi | Official Video | Jawahar Wattal | Pravin Mani', 'SonyMusicIndiaVEVO', '2026-08-29T11:40:56.887Z'),
  ('vDolreuYdhA', 'Na Na Na Re Full HD Song | Mrityudaata | Amitabh Bachchan | Daler Mehandi | Sudesh Bhonsle', 'T-Series Bollywood Classics', '2026-08-29T11:40:56.887Z'),
  ('M3UDnXE8m3A', 'Daler Mehndi - Dardi Rab Rab Kardi Video', 'SonyMusicIndiaVEVO', '2026-08-29T11:40:56.887Z'),
  ('-99Z8E1pOrs', 'OH Ho Ho Ho | ORIGINAL SONG | Ishq Tera Tadpave | Sukhbir | Original Video', 'Sukhbir', '2026-08-29T11:40:56.887Z'),
  ('AQ3mj1inalQ', 'Gal Ban Gayee | Sukhbir | Original Video', 'Sukhbir', '2026-08-29T11:40:56.887Z'),
  ('DK3cG2xyE1o', 'Sauda Khara Khara', 'Sukhbir', '2026-08-29T11:40:56.887Z'),
  ('lTuedTVFctw', 'Dil Le Gayee (8K Video) | Dil Le Gayi Kudi Gujrat Ki | Jasbir Jassi | Party Song | Indipop Music', 'Times Music', '2026-08-29T11:40:56.887Z'),
  ('_rGz16v3CUM', 'Gur Nalon Ishq Mitha (Official Video) Malaika Arora | Bally Sagoo Ft Malkit Singh | Jas Arora', 'Universal Music India', '2026-08-29T11:40:56.887Z'),
  ('qF1APiiaIaY', 'Tutak Tutak Tutian (Hey Jamalo) | Malkit Singh | Old Punjabi Songs | Punjabi Songs 2022', 'Saregama Punjabi', '2026-08-29T11:40:56.887Z'),
  ('tGiJSnwBwDQ', 'Tera Yaar Bolda [Full Song] Surjit Bindrakhia | Phulkari', 'T-Series Apna Punjab', '2026-08-29T11:40:56.887Z'),
  ('0JgIYnjj0sk', '"Dupatta Tera Satrang Da Surjit Bindrakhia" (full song) Punjabi Songs', 'T-Series Apna Punjab', '2026-08-29T11:40:56.887Z'),
  ('FlvUFD24mT8', 'Mukhda Dekh Ke [Full Song] Mukhda Dekh Ke', 'T-Series', '2026-08-29T11:40:56.887Z'),
  ('IifPaKjkMAc', 'Mittran Di Chhatri [Full Song] - Pyass', 'T-Series', '2026-08-29T11:40:56.887Z'),
  ('Iv7ls3mzPOU', 'Babbu Maan : Saun Di Jhadi Full Video Song | Saun Di Jhadi | Hit Punjabi Song', 'T-Series Apna Punjab', '2026-08-29T11:40:56.887Z'),
  ('Nfa0oXVAs3U', 'Challa with lyrics | ਛੱਲਾ | Laung Da Lishkara | Gurdaas Maan | Jagjit Singh | Sukhpal Sukh', 'Saregama Music', '2026-08-29T11:40:56.887Z'),
  ('1cHLSWmVnTE', '"Apna Punjab Hove" (Full Song) | Gurdas Maan | Yaar Mera Pyaar', 'T-Series', '2026-08-29T11:40:56.887Z'),
  ('jiwKVciHJxM', 'Dil Da Mamla Hai | 1980 | Gurdas Maan | First Ever Performance on TV', 'Gurdas Maan', '2026-08-29T11:40:56.887Z'),
  ('pjQyBF2gwjQ', '''Ki Banu Duniya Da'' - Gurdas Maan feat. Diljit Dosanjh & Jatinder Shah - Coke Studio @ MTV Season 4', 'Coke Studio India ', '2026-08-29T11:40:56.887Z'),
  ('PaDaoNnOQaM', 'Full Video: Mauja Hi Mauja | Jab We Met | Shahid kapoor, Kareena Kapoor | Mika Singh |  Pritam', 'T-Series', '2026-08-29T11:40:56.887Z'),
  ('0gtDICWPTyA', 'Nagada Nagada Full Video Song HD | Jab We Met | Kareena Kapoor, Shahid Kapoor', 'T-Series', '2026-08-29T11:40:56.887Z'),
  ('Qk9bPR2wfJ4', 'Aahun Aahun - Full Video Song | Saif Ali Khan | Deepika Padukone | Neeraj Shridhar | Love Aaj Kal', 'Sony Music India', '2026-08-29T11:40:56.887Z'),
  ('JpH2A7jMfjY', 'Main Jat Yamla Pagla Deewana (Original Version) | Mohammed Rafi | Pratigya 1975 Songs | Dharmendra', 'Goldmines Gaane Sune Ansune', '2026-08-29T11:40:56.887Z'),
  ('2qreMYakSdg', 'Laung Gawacha | Neha Bhasin | Punjabi Folk Song', 'Neha Bhasin', '2026-08-29T11:40:56.887Z')
) AS v(video_id, provider_title, provider_channel, validated_at) JOIN public.tracks t ON t.catalogue_key='youtube:' || v.video_id ON CONFLICT (provider, provider_item_id) DO NOTHING;

UPDATE public.tracks t SET title=v.title, artist=v.artist, year=COALESCE(v.year, t.year) FROM public.playback_sources ps JOIN (VALUES
  ('lhVceZE1lf4', 'Bolo Ta Ra Ra', 'Daler Mehndi', 2022),
  ('92ydUdqWE1g', 'Tunak Tunak Tun', 'Daler Mehndi', NULL),
  ('KTE6S-Pmhpw', 'Ho Jayegi Balle Balle', 'Daler Mehndi', NULL),
  ('vDolreuYdhA', 'Na Na Na Re', 'Daler Mehndi, Sudesh Bhosle', NULL),
  ('M3UDnXE8m3A', 'Dardi Rab Rab Kardi', 'Daler Mehndi', NULL),
  ('-99Z8E1pOrs', 'Ishq Tera Tadpave', 'Sukhbir', NULL),
  ('AQ3mj1inalQ', 'Gal Ban Gayee', 'Sukhbir', NULL),
  ('DK3cG2xyE1o', 'Sauda Khara Khara', 'Sukhbir', 1999),
  ('lTuedTVFctw', 'Dil Le Gayee', 'Jasbir Jassi', NULL),
  ('_rGz16v3CUM', 'Gur Nalon Ishq Mitha', 'Malkit Singh', NULL),
  ('qF1APiiaIaY', 'Tutak Tutak Tutian', 'Malkit Singh', NULL),
  ('tGiJSnwBwDQ', 'Tera Yaar Bolda', 'Surjit Bindrakhia', NULL),
  ('0JgIYnjj0sk', 'Dupatta Tera Satrang Da', 'Surjit Bindrakhia', NULL),
  ('FlvUFD24mT8', 'Mukhda Dekh Ke', 'Surjit Bindrakhia', NULL),
  ('IifPaKjkMAc', 'Mittran Di Chhatri', 'Babbu Maan', NULL),
  ('Iv7ls3mzPOU', 'Saun Di Jhadi', 'Babbu Maan', NULL),
  ('Nfa0oXVAs3U', 'Challa', 'Gurdas Maan', NULL),
  ('1cHLSWmVnTE', 'Apna Punjab Hove', 'Gurdas Maan', NULL),
  ('jiwKVciHJxM', 'Dil Da Mamla Hai', 'Gurdas Maan', NULL),
  ('pjQyBF2gwjQ', 'Ki Banu Duniya Da', 'Gurdas Maan, Diljit Dosanjh', NULL),
  ('PaDaoNnOQaM', 'Mauja Hi Mauja', 'Mika Singh', NULL),
  ('0gtDICWPTyA', 'Nagada Nagada', 'Sonu Nigam, Javed Ali', NULL),
  ('Qk9bPR2wfJ4', 'Aahun Aahun', 'Neeraj Shridhar, Master Saleem, Suzi Q', NULL),
  ('JpH2A7jMfjY', 'Main Jat Yamla Pagla Deewana', 'Mohammed Rafi', NULL),
  ('2qreMYakSdg', 'Laung Gawacha', 'Neha Bhasin', NULL),
  ('jHxKiazJ__w', 'Chaahat Na Hoti', 'Alka Yagnik, Vinod Rathod', NULL),
  ('JSEZcXGRrdE', 'Tum To Thehre Pardesi', 'Altaf Raja', NULL),
  ('Waw0kSd8bik', 'Dil Tote Tote Ho Gaya', 'Shweta Shetty, Hans Raj Hans', NULL),
  ('HdYiYy-tau8', 'Mujhko Rana Ji Maaf Karna', 'Ila Arun, Alka Yagnik', NULL),
  ('HBYWSpBR6hA', 'Dil Laga Liya Maine', 'Alka Yagnik, Udit Narayan', NULL),
  ('b6VhJ5SjyTQ', 'Kitna Pagal Dil Hai', 'Alka Yagnik', 2003),
  ('weqnfSgDQeo', 'Utha Le Jaoonga', 'Kumar Sanu, Anuradha Paudwal', NULL),
  ('MbIRbYjLdqM', 'Hum Tumko Nigahon Mein', 'Udit Narayan, Shreya Ghoshal', NULL),
  ('c_K2sf6QWFY', 'Mujhse Mohabbat Ka Izhar', 'Alka Yagnik, Kumar Sanu', NULL),
  ('HJbxUGehTUw', 'Aap Ke Pyaar Mein', 'Alka Yagnik', NULL),
  ('ZG6zDWbp_6U', 'Kyaa Dil Ne Kahaa', 'Udit Narayan, Alka Yagnik', NULL),
  ('47DstHmE-bE', 'Tu Pyar Hai Kisi Aur Ka', 'Kumar Sanu, Anuradha Paudwal', NULL),
  ('Ef0OGt1jwbQ', 'O Yaaron Maaf Karna (Sad Version)', 'Kumar Sanu, Alka Yagnik', NULL),
  ('8_qUi4PyrYk', 'Tu Jo Hans Hans Ke', 'Udit Narayan', NULL),
  ('nNtGRkTdU9Q', 'Hum Yaar Hain Tumhare', 'Alka Yagnik, Udit Narayan', NULL),
  ('yMUW3GEWNjo', 'Bepanah Pyar Hai Aaja', 'Shreya Ghoshal', NULL),
  ('jSkBtDg-8lg', 'Sajan Tumse Pyar', 'Udit Narayan, Alka Yagnik', NULL),
  ('HHgVlMrkloQ', 'Ek Din Aap', 'Kumar Sanu, Alka Yagnik', 1999),
  ('34E5n54EdbY', 'Dil Ka Kya Kare Saheb', 'Kavita Krishnamurthy', NULL),
  ('lFdSi01tpYM', 'Sochenge Tumhe Pyar', 'Kumar Sanu', NULL),
  ('Ghs-GA8ehD8', 'Rab Kare Tujhko Bhi Pyar Ho Jaye', 'Udit Narayan, Alka Yagnik', NULL),
  ('BtdiNnrftYM', 'Chand Tare Phool', 'Tauseef Akhtar', NULL),
  ('6lDU1HE7o0M', 'Pehli Pehli Baar Mohabbat Ki Hai', 'Kumar Sanu, Alka Yagnik', 2024),
  ('O6elyd1Ba5k', 'Kisise Tum Pyaar Karo', 'Alka Yagnik, Kumar Sanu', 2003),
  ('OtKa_eN88Qo', 'Pehle Kabhi Na Mera Haal', 'Udit Narayan, Alka Yagnik', NULL),
  ('IJNR_UVLDhs', 'Main Nikla Gaddi Leke', 'Udit Narayan', NULL),
  ('ZN2eEGH5lAo', 'Long Drive', 'Mika Singh', NULL),
  ('1T8G_d5o5Gs', 'Yeh Dosti Hum Nahi Todenge', 'Kishore Kumar, Manna Dey', NULL),
  ('mzxHflxI-es', 'Zindagi Ek Safar Hai Suhana', 'Kishore Kumar', NULL),
  ('Yd62azPw4hI', 'Musafir Hoon Yaron', 'Kishore Kumar', NULL),
  ('CcrXejLuQ9M', 'Chala Jata Hoon', 'Kishore Kumar', NULL),
  ('tBgquvIYD-I', 'Hum Dono Do Premi', 'Lata Mangeshkar, Kishore Kumar', 2020),
  ('eEeX2QMlSlo', 'Yun Hi Chala Chal', 'Udit Narayan, Hariharan, Kailash Kher', NULL),
  ('Mo5tQDcs__g', 'Aao Milo Chalen', 'Shaan, Ustad Sultan Khan', NULL),
  ('fdubeMFwuGs', 'Ilahi', 'Arijit Singh', NULL),
  ('7mTDBsdfw88', 'Safarnama', 'Lucky Ali', NULL),
  ('2mWaqsC3U7k', 'Phir Se Ud Chala', 'Mohit Chauhan', NULL),
  ('8HDTS80dlr4', 'Patakha Guddi', 'Nooran Sisters', NULL),
  ('R0XjwtP_iTY', 'Khaabon Ke Parinday', 'Alyssa Mendonsa, Mohit Chauhan', NULL),
  ('2__nNm0NK4A', 'Journey Song', 'Anupam Roy, Shreya Ghoshal', NULL),
  ('9coA7bcpJII', 'Dil Chahta Hai', 'Shankar Mahadevan', NULL),
  ('wqTQNs9sO6M', 'Hairat', 'Lucky Ali', NULL),
  ('8kMv5ssr6Dw', 'Roobaroo', 'A. R. Rahman, Naresh Iyer', NULL),
  ('a6XkY53VlhM', 'Banjarey', 'Yo Yo Honey Singh', NULL),
  ('5PbWtDGOL8A', 'Ik Junoon (Paint It Red)', 'Vishal Dadlani, Alyssa Mendonsa, Gulraj Singh, Shankar Mahadevan', NULL),
  ('7U84JOhHFpE', 'Dekha Hai Aise Bhi', 'Lucky Ali', NULL),
  ('64KSVbMDr0c', 'Tanha Dil', 'Shaan', NULL),
  ('WiFLnY9NdRw', 'Gaddi Jaandi Ae Chalaangaan Maardi', 'Ammy Virk', 2023),
  ('IssysxAisfo', 'Hornn Blow', 'Harrdy Sandhu', NULL),
  ('dCmp56tSSmA', 'Born to Shine', 'Diljit Dosanjh', 2020),
  ('mClF6mJV5xM', 'Teri Aankhon Mein', 'Darshan Raval, Neha Kakkar', NULL),
  ('4dvPgVeKgbc', 'Show Me the Thumka', 'Sunidhi Chauhan, Shashwat Singh', 2023),
  ('YEp76bA-6rA', 'Teri Baaton Mein Aisa Uljha Jiya', 'Raghav, Tanishk Bagchi, Asees Kaur', 2024),
  ('4z-oDk1utVo', 'Lut Gaye', 'Jubin Nautiyal', 2021),
  ('YALvuUpY_b0', 'Apna Bana Le', 'Arijit Singh', 2022),
  ('qnQCd_nZn_g', 'O Maahi', 'Arijit Singh', 2023),
  ('_9FyH8PmRSU', 'Maan Meri Jaan', 'King', 2022),
  ('dNvqJIeHPis', 'Ishq Di Baajiyaan', 'Diljit Dosanjh', 2018),
  ('Z0VbANbyH2o', 'Tere Hawaale', 'Arijit Singh, Shilpa Rao', 2022),
  ('gDonh4XgrdA', 'Nayan', 'Dhvani Bhanushali, Jubin Nautiyal', 2020),
  ('sFFEvhlJP6Q', 'Wedding Mashup 2023', 'VDJ Ayush, Mihir', NULL),
  ('eesw_fW7bt0', 'Laal Peeli Akhiyaan', 'Romy', 2024),
  ('9Z0jxv-QMS0', 'Bachke Tu Rehna (Khallas Remix)', 'DJ SR', NULL),
  ('tYdPptlvZPo', 'Raataan Lambiyan', 'Jubin Nautiyal, Asees Kaur', 2021),
  ('2aLO6Ecof4s', 'Stay', 'Rihanna, Mikky Ekko', 2012),
  ('n6N1_sxlBU8', 'We Found Love', 'Rihanna, Calvin Harris', 2011),
  ('PlgJGC7-cNs', 'Kurchi Madathapetti Megamix', 'Sush & Yohan', NULL),
  ('iFLuvFiCwJE', 'Bollywood Navratri Mashup 2023', 'Musical Trip', NULL),
  ('uySQog3MjWE', 'Bollywood Dandiya 2023', 'Musical Trip', NULL),
  ('XFOVXD1qttc', 'Suniyan Suniyan', 'Juss', 2024),
  ('8_riOFhwAw4', 'Gulabi Sadi', 'Sanju Rathod, G-SPXRK', 2024),
  ('UO8D53fjxqk', 'Taaron Ke Shehar', 'Neha Kakkar, Jubin Nautiyal', 2020),
  ('ejDDk5n7AbM', 'Pyaar Hota Kayi Baar Hai', 'Arijit Singh', 2023),
  ('4mVo93E9wpU', 'Diamonds', 'Rihanna', 2012),
  ('PmRkeYVU1BE', 'Dekhha Tenu', 'Mohammad Faiz', 2024),
  ('U0qBRoeQa-g', 'Tu Pyar Hai Kisi Aur Ka', 'Kumar Sanu, Anuradha Paudwal', NULL),
  ('sWqjZpBtcxc', 'Aye Mere Humsafar', 'Udit Narayan, Alka Yagnik', NULL),
  ('maqLiqpClqU', 'Woh Ladki Bohot Yaad Aati Hai', 'Kumar Sanu, Alka Yagnik', 2024),
  ('NzZxyWr9OA4', 'Kitna Haseen Chehra', 'Kumar Sanu', NULL),
  ('uIOrAkrjwp4', 'Hum Yaar Hai Tumhare', 'Alka Yagnik, Udit Narayan', NULL),
  ('sBFKHnNp-8c', 'Abhi To Mohabbat Ka', 'Udit Narayan, Alka Yagnik', NULL),
  ('xvevXfFGPFY', 'Teri Umeed Tera Intezar', 'Kumar Sanu', NULL),
  ('HubRXgH0Erc', 'Tumsa Koi Pyaara', 'Kumar Sanu, Alka Yagnik', NULL),
  ('vYGPudMvxvI', 'Raah Mein Unse Mulaqat', 'Kumar Sanu, Alka Yagnik', NULL),
  ('_wDJTSfB4bQ', 'Dil Cheer Ke Dekh', 'Kumar Sanu', NULL),
  ('L3gOr6vwSjg', 'Is Pyar Se Meri Taraf Na Dekho', 'Kumar Sanu', NULL),
  ('00V7IokvbTA', 'Chaaha Toh Bahut', 'Kumar Sanu, Bela Sulakhe', NULL),
  ('GBRifFvAJX8', 'Pucho Zara Pucho', 'Alka Yagnik, Kumar Sanu', 2021),
  ('HIr_kpG4Fnc', 'Tumse Milne Ki Tamanna Hai', 'S. P. Balasubrahmanyam', NULL),
  ('Gg9ZUppafLo', 'Too Shayar Hai Main Teri Shayari', 'Alka Yagnik', NULL),
  ('qSAVrkUsI6o', 'Lagi Aaj Sawan Ki', 'Anupama Deshpande, Suresh Wadkar', NULL),
  ('OsBqRHx2JAA', 'Chhupana Bhi Nahi Aata', 'Vinod Rathod', NULL),
  ('ieu6xnwJxdA', 'Kitaben Bahut Si', 'Asha Bhosle, Vinod Rathod', NULL),
  ('5c5u3JRm_lA', 'Baazigar O Baazigar', 'Kumar Sanu, Alka Yagnik', NULL),
  ('MB6jaF_iAnc', 'Koi Na Koi Chahiye', 'Vinod Rathod', NULL),
  ('fa5Yzxdh8e4', 'Jeeta Tha Jiske Liye', 'Kumar Sanu, Alka Yagnik', NULL),
  ('tPNwGuu_rQ4', 'Tumhein Apna Banane Ki Kasam', 'Kumar Sanu, Anuradha Paudwal', NULL),
  ('KC-DuX51NY0', 'Yeh Kaali Kaali Aankhen', 'Kumar Sanu, Alka Yagnik', NULL),
  ('odrhc32fiLo', 'Mere Mehboob Qayamat Hogi', 'Kishore Kumar', 2020),
  ('V0TejHIZLV8', 'Pal Pal Dil Ke Paas', 'Kishore Kumar', 1973),
  ('eAXSrnHDlfQ', 'Likhe Jo Khat Tujhe', 'Mohammed Rafi', 2020),
  ('qq-_7Q6zq80', 'Ankhiyon Ke Jharokhon Se', 'Hemlata', 1978),
  ('oPlHNekNTtI', 'Dekha Ek Khwab', 'Lata Mangeshkar, Kishore Kumar', 2020),
  ('dIolaq-Cd9E', 'Inteha Ho Gai', 'Kishore Kumar, Asha Bhosle', 1984),
  ('p0FY8rRrZ6Y', 'Meri Bheegi Bheegi Si', 'Kishore Kumar', 2020),
  ('GMLFuNHHB6s', 'Main Pal Do Pal Ka Shair Hoon', 'Mukesh', 2020),
  ('EYE61OWUUm8', 'Ek Ajnabee Haseena Se', 'Kishore Kumar', 2020),
  ('wJ2by202hDI', 'Chala Jata Hoon', 'Kishore Kumar', 2020),
  ('HKN3RkwGEaY', 'Aate Jate Khoobsurat Awara', 'Kishore Kumar', 2020),
  ('JVVs-qR7IrU', 'O Saathi Re', 'Kishore Kumar', 2020),
  ('iWgT21xoJtY', 'Chhalka Yeh Jaam', 'Mohammed Rafi', 2020),
  ('1V6p1gDsBW4', 'Teri Galiyon Mein', 'Mohammed Rafi', 2020),
  ('-7iWJUOfS8Y', 'Manzilen Apni Jagah Hai', 'Kishore Kumar', 2020),
  ('QSv4VZvTUGg', 'Mere Dil Mein Aaj Kya Hai', 'Kishore Kumar', 2020),
  ('55Ya9kZ5iFs', 'Tere Jaisa Yaar Kahan', 'Kishore Kumar', 1981),
  ('41FWDaUFzDY', 'Tumne Kisi Se Kabhi Pyar Kiya Hai', 'Mukesh, Kanchan', 2020),
  ('oqUdGfzKHe8', 'Hamen Tumse Pyar Kitna', 'Kishore Kumar', 2020),
  ('wURInzaTetM', 'Wada Karo', 'Kishore Kumar, Lata Mangeshkar', 1973),
  ('9Eg4d56rt-U', 'Neele Neele Ambar Par', 'Kishore Kumar', 1983),
  ('wBKOlVvVQs0', 'Salam-E-Ishq Meri Jaan', 'Lata Mangeshkar, Kishore Kumar', 1978),
  ('RVeLrwoB_xw', 'Mere Sapnon Ki Rani', 'Kishore Kumar', 2020),
  ('BQJVOJUPJ30', 'Yeh Raaten Yeh Mausam', 'Kishore Kumar, Asha Bhosle', 2020),
  ('EjSIjGhTEFE', 'Shayad Meri Shaadi', 'Lata Mangeshkar, Kishore Kumar', 2014),
  ('9a26mBBK4jE', 'Tere Sang Yaara', 'Atif Aslam', 2016),
  ('l2hvSNbg_f0', 'Tu Banja Gali Benaras Ki', 'Asit Tripathy', NULL),
  ('H2f7MZaw3Yo', 'Samjhawan', 'Arijit Singh, Shreya Ghoshal', NULL),
  ('HexFqifusOk', 'Jogi', 'Yasser Desai, Aakanksha Sharma', NULL),
  ('4tYktXxNspo', 'Nainowale Ne', 'Neeti Mohan', NULL),
  ('atVof3pjT-I', 'Kaun Tujhe', 'Palak Muchhal', NULL),
  ('I94fhjQ-U30', 'Tum Se Hi', 'Mohit Chauhan', 2007),
  ('9Cp-hNvSWZs', 'Maiyya Mainu', 'Sachet Tandon', 2021),
  ('LQzByGZHiQ8', 'Tum Jo Aaye', 'Rahat Fateh Ali Khan, Tulsi Kumar', 2010),
  ('8PEqEh1lnNE', 'Main Agar Kahoon', 'Sonu Nigam, Shreya Ghoshal', 2007),
  ('82P9aa28DoE', 'Jaan Ban Gaye', 'Mithoon, Vishal Mishra, Asees Kaur', 2020),
  ('Mc1MZkvMvCk', 'Dooron Dooron (Unplugged)', 'Paresh Pahuja', 2025),
  ('SMlGGRAB3Hc', 'Afreen Afreen', 'Rahat Fateh Ali Khan, Momina Mustehsan', 2016),
  ('gvyUuxdRdR4', 'Raataan Lambiyan', 'Jubin Nautiyal, Asees Kaur', 2021),
  ('FA_J8XwpCaQ', 'Tu Jaane Na', 'Atif Aslam', 2009),
  ('pqBKTLnowdM', 'Saiyyan', 'Kailash Kher', 2007),
  ('ii9KLQoV78I', 'Hawayein', 'Arijit Singh', 2017),
  ('r6yFwzExp0w', 'Bahara', 'Shreya Ghoshal, Sona Mohapatra', 2010),
  ('64lEY8jj4RA', 'Dil Mein Ho Tum', 'Armaan Malik', 2018),
  ('2CAiycLVy7s', 'Tu Hi Haqeeqat', 'Javed Ali, Irshan Ashraf, Shadab', 2009),
  ('R_T2uJX2r8A', 'Kinna Sona', 'Sunil Kamath', 2015),
  ('oOvSWET7xSA', 'Subhanallah', 'Sreeram, Shilpa Rao', 2015),
  ('8ZLFwzPPk7Q', 'Saiyaara', 'Mohit Chauhan, Taraannum Mallik', 2012)
) AS v(video_id, title, artist, year) ON v.video_id=ps.provider_item_id WHERE ps.track_id=t.id AND ps.provider='youtube';

INSERT INTO public.curated_sets(scene_id, title, sort_order, is_active, shuffle_start, origin_provider, origin_external_id, imported_at) SELECT s.id, 'Sainik Dhaba — Seven Jagah Staged', 1, false, true, 'youtube', 'manual:sainik-dhaba:2026-08-29', now() FROM public.scenes s WHERE s.slug='sainik-dhaba' AND NOT EXISTS (SELECT 1 FROM public.curated_sets cs WHERE cs.scene_id=s.id AND cs.origin_external_id='manual:sainik-dhaba:2026-08-29');
UPDATE public.curated_sets cs SET title=v.title, sort_order=v.sort_order, is_active=false FROM public.scenes s JOIN (VALUES
  ('sainik-dhaba', 'Sainik Dhaba — Seven Jagah Staged', 1, 'manual:sainik-dhaba:2026-08-29'),
  ('nai-ki-dukaan', 'Deluxe Salon — Seven Jagah Staged', 2, 'PLVFLMYM1tErk'),
  ('bus-driver', 'Bus Driver — Seven Jagah Staged', 3, 'manual:bus-driver:2026-08-29'),
  ('bartan-time', 'Bartan Time — Seven Jagah Staged', 4, 'PLc1Byv6ESHSaag4naocpjBLSjO58i9MV5'),
  ('raj-mistri', 'Raju Mistri — Seven Jagah Staged', 5, 'PLTcrZKUys_a5zSgv_3ZHsRnTVJ05GbDvY'),
  ('papa-ke-gaane', 'Papa Ke Gaane — Seven Jagah Staged', 6, 'PL3rJgr5HfVCrov_nZV_2ltKKFGWbbjATx'),
  ('corporate-majdoor', 'Corporate Majdoor — Seven Jagah Staged', 7, 'PLMqSYqU_UWQk')
) AS v(scene_slug, title, sort_order, origin_id) ON v.scene_slug=s.slug WHERE cs.scene_id=s.id AND cs.origin_external_id=v.origin_id;

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag) SELECT cs.id, ps.track_id, v.position, 'all' FROM public.curated_sets cs JOIN public.scenes s ON s.id=cs.scene_id JOIN (VALUES
  ('lhVceZE1lf4', 1),
  ('92ydUdqWE1g', 2),
  ('KTE6S-Pmhpw', 3),
  ('vDolreuYdhA', 4),
  ('M3UDnXE8m3A', 5),
  ('-99Z8E1pOrs', 6),
  ('AQ3mj1inalQ', 7),
  ('DK3cG2xyE1o', 8),
  ('lTuedTVFctw', 9),
  ('_rGz16v3CUM', 10),
  ('qF1APiiaIaY', 11),
  ('tGiJSnwBwDQ', 12),
  ('0JgIYnjj0sk', 13),
  ('FlvUFD24mT8', 14),
  ('IifPaKjkMAc', 15),
  ('Iv7ls3mzPOU', 16),
  ('Nfa0oXVAs3U', 17),
  ('1cHLSWmVnTE', 18),
  ('jiwKVciHJxM', 19),
  ('pjQyBF2gwjQ', 20),
  ('PaDaoNnOQaM', 21),
  ('0gtDICWPTyA', 22),
  ('Qk9bPR2wfJ4', 23),
  ('JpH2A7jMfjY', 24),
  ('2qreMYakSdg', 25)
) AS v(video_id, position) ON true JOIN public.playback_sources ps ON ps.provider='youtube' AND ps.provider_item_id=v.video_id AND ps.is_active WHERE s.slug='sainik-dhaba' AND cs.origin_external_id='manual:sainik-dhaba:2026-08-29' ON CONFLICT (curated_set_id, position) DO UPDATE SET track_id=EXCLUDED.track_id, daypart_tag=EXCLUDED.daypart_tag;

DROP POLICY IF EXISTS "oneliners public read" ON public.oneliners;
CREATE POLICY "oneliners public read" ON public.oneliners FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.scenes s WHERE s.id=oneliners.scene_id AND s.is_live));

DO $$ DECLARE v record; BEGIN
  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 10 OR (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN RAISE EXCEPTION 'production catalogue changed'; END IF;
  IF (SELECT count(*) FROM public.scenes WHERE slug IN ('bus-driver','bartan-time','papa-ke-gaane') AND NOT is_live) <> 3 THEN RAISE EXCEPTION 'new scenes must remain hidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.curated_sets cs LEFT JOIN public.curated_set_tracks cst ON cst.curated_set_id=cs.id WHERE NOT cs.is_active GROUP BY cs.id HAVING count(cst.id)<>25) THEN RAISE EXCEPTION 'staged queue count is not 25'; END IF;
  IF (SELECT count(*) FROM public.curated_sets WHERE NOT is_active) <> 7 THEN RAISE EXCEPTION 'expected seven inactive target sets'; END IF;
  IF (SELECT count(*) FROM public.curated_set_tracks cst JOIN public.curated_sets cs ON cs.id=cst.curated_set_id WHERE NOT cs.is_active) <> 175 THEN RAISE EXCEPTION 'expected 175 staged memberships'; END IF;
  IF (SELECT count(DISTINCT ps.provider_item_id) FROM public.curated_set_tracks cst JOIN public.curated_sets cs ON cs.id=cst.curated_set_id JOIN public.playback_sources ps ON ps.track_id=cst.track_id AND ps.is_active WHERE NOT cs.is_active AND ps.provider='youtube') <> 171 THEN RAISE EXCEPTION 'expected 171 staged videos'; END IF;
  IF (SELECT count(DISTINCT ps.provider_item_id) FROM public.curated_set_tracks cst JOIN public.curated_sets cs ON cs.id=cst.curated_set_id JOIN public.scenes s ON s.id=cs.scene_id JOIN public.playback_sources ps ON ps.track_id=cst.track_id AND ps.provider='youtube' WHERE NOT cs.is_active AND s.slug='sainik-dhaba') <> 25 THEN RAISE EXCEPTION 'expected 25 distinct Sainik Dhaba videos'; END IF;
  IF EXISTS (SELECT 1 FROM public.curated_set_tracks own_cst JOIN public.curated_sets own_cs ON own_cs.id=own_cst.curated_set_id JOIN public.scenes own_s ON own_s.id=own_cs.scene_id JOIN public.playback_sources own_ps ON own_ps.track_id=own_cst.track_id AND own_ps.provider='youtube' JOIN public.playback_sources other_ps ON other_ps.provider='youtube' AND other_ps.provider_item_id=own_ps.provider_item_id JOIN public.curated_set_tracks other_cst ON other_cst.track_id=other_ps.track_id JOIN public.curated_sets other_cs ON other_cs.id=other_cst.curated_set_id WHERE NOT own_cs.is_active AND own_s.slug='sainik-dhaba' AND NOT other_cs.is_active AND other_cs.id<>own_cs.id) THEN RAISE EXCEPTION 'Sainik Dhaba overlaps another staged queue'; END IF;
  IF EXISTS (SELECT 1 FROM public.curated_set_tracks cst JOIN public.curated_sets cs ON cs.id=cst.curated_set_id LEFT JOIN public.playback_sources ps ON ps.track_id=cst.track_id AND ps.is_active WHERE NOT cs.is_active AND ps.id IS NULL) THEN RAISE EXCEPTION 'staged membership lacks an active source'; END IF;
  IF EXISTS (SELECT 1 FROM public.curated_sets WHERE NOT is_active AND origin_external_id='PLwyqDgjhF4Qpq6kslMcQ8NR6RHb-Z4Tu-') THEN RAISE EXCEPTION 'obsolete Bhojpuri staged set remains'; END IF;
  IF EXISTS (SELECT 1 FROM public.tracks t JOIN public.curated_set_tracks cst ON cst.track_id=t.id JOIN public.curated_sets cs ON cs.id=cst.curated_set_id WHERE NOT cs.is_active AND t.title ~* '(official|full[ -]?(video|song)|lyrical|#[[:alnum:]])') THEN RAISE EXCEPTION 'unclean staged display title remains'; END IF;
END $$;

COMMIT;
