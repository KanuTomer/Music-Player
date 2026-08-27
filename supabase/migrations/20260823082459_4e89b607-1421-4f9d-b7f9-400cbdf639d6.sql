-- Hindi-first room set
UPDATE public.scenes SET is_live = false WHERE category = 'regional';

UPDATE public.scenes SET
  slug = 'sainik-dhaba', title_en = 'Sainik Dhaba', title_hi = 'सैनिक ढाबा',
  hook = 'Highway ke kinare, dal makhani aur truck ki headlight.',
  region = 'North India', category = 'tier1', sort_order = 1, is_live = true,
  gag_label = 'Tadka maaro'
WHERE slug = 'highway-dhaba';

UPDATE public.scenes SET
  title_en = 'Deluxe Salon', title_hi = 'डीलक्स सैलून',
  hook = 'Kainchi ki khat-khat, aur ek purana radio.',
  sort_order = 2
WHERE slug = 'nai-ki-dukaan';

UPDATE public.scenes SET sort_order = 5 WHERE slug = 'rail-yatra';
UPDATE public.scenes SET sort_order = 6 WHERE slug = 'raat-ki-bus';
UPDATE public.scenes SET sort_order = 7 WHERE slug = 'sarkari-daftar';
UPDATE public.scenes SET sort_order = 8 WHERE slug = 'doordarshan-shaam';

INSERT INTO public.scenes (slug, title_en, title_hi, hook, description, region, category, art_key, is_dark, chat_mode, gag_label, sort_order, is_live)
VALUES
  ('chai-ki-tapri', 'Chai ki Tapri', 'चाय की टपरी', 'Kulhad wali chai, adrak ki khushbu, endless bakwaas.', 'A roadside tea stall where the kettle never stops and the conversation never ends.', 'North India', 'tier1', 'chai-ki-tapri', false, 'open', 'Ek cutting chai', 3, true),
  ('raj-mistri', 'Raj Mistri', 'राज मिस्त्री', 'Chhat ki dhalai, sariya, aur dopahar ka radio.', 'A half-built house at noon: trowels, bricks and film songs on a paint-splattered radio.', 'North India', 'tier1', 'raj-mistri', false, 'open', 'Thap thap', 4, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.tracks (scene_id, title, artist, year, search_query, daypart_tag, sort_order)
SELECT s.id, t.title, t.artist, t.year, t.q, t.dp, t.so
FROM public.scenes s
JOIN (VALUES
  ('chai-ki-tapri', 'Chai Garam', 'Kishore Kumar', 1975, 'kishore kumar morning hindi song audio', 'morning', 1),
  ('chai-ki-tapri', 'Ek Ajnabee Haseena Se', 'Kishore Kumar', 1973, 'ek ajnabee haseena se kishore kumar', 'all', 2),
  ('chai-ki-tapri', 'Yeh Shaam Mastani', 'Kishore Kumar', 1971, 'yeh shaam mastani kishore kumar', 'evening', 3),
  ('raj-mistri', 'Yaari Hai Iman Mera', 'Manna Dey', 1973, 'yaari hai iman mera manna dey', 'all', 1),
  ('raj-mistri', 'Mehngai Maar Gayi', 'Lata Mangeshkar', 1974, 'mehngai maar gayi roti kapda aur makaan song', 'day', 2),
  ('raj-mistri', 'Saathi Haath Badhana', 'Mohammed Rafi', 1957, 'saathi haath badhana naya daur song', 'day', 3)
) AS t(slug, title, artist, year, q, dp, so) ON t.slug = s.slug;

INSERT INTO public.oneliners (scene_id, text_en, text_hi, daypart_tag)
SELECT s.id, o.en, o.hi, o.dp
FROM public.scenes s
JOIN (VALUES
  ('chai-ki-tapri', 'One more cutting, boss?', 'Ek cutting aur, boss?', 'all'),
  ('chai-ki-tapri', 'The kettle has been whistling since 6 am.', 'Kettle subah chhe baje se seeti maar rahi hai.', 'morning'),
  ('chai-ki-tapri', 'Politics settled, cricket next.', 'Rajneeti nipat gayi, ab cricket.', 'evening'),
  ('raj-mistri', 'Hold the level straight, ustad.', 'Level seedha pakdo, ustad.', 'all'),
  ('raj-mistri', 'Lunch under the shade of the slab.', 'Chhat ki chhaya mein khana.', 'day'),
  ('sainik-dhaba', 'Truck drivers park, the tandoor lights up.', 'Truck ruke, tandoor jala.', 'night'),
  ('sainik-dhaba', 'Dal makhani takes its own sweet time.', 'Dal makhani apna time leti hai.', 'all')
) AS o(slug, en, hi, dp) ON o.slug = s.slug;