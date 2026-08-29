-- Milestone 4.1: stage the approved seven-Jagah music catalogue without changing production.
-- Approved manifest SHA-256: fcc8c73ff49577d5fb77317c1414bbdd3fe5db42b6cee6b180539a26c77a6205
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
    ('nai-ki-dukaan', 42),
    ('bhojpuriya-devara', 3649),
    ('raj-mistri', 328),
    ('corporate-majdoor', 218)
  ) AS expected(slug, membership_count) LOOP
    SELECT count(*) INTO v_actual
    FROM public.curated_set_tracks cst
    JOIN public.curated_sets cs ON cs.id = cst.curated_set_id
    JOIN public.scenes s ON s.id = cs.scene_id
    WHERE cs.is_active AND s.slug = v_expected.slug;
    IF v_actual <> v_expected.membership_count THEN
      RAISE EXCEPTION 'preflight failed for %: expected %, found %', v_expected.slug, v_expected.membership_count, v_actual;
    END IF;
  END LOOP;
END $$;

INSERT INTO public.scenes(id, slug, title_en, title_hi, hook, description, region, category, palette, art_key, is_dark, is_live, chat_mode, gag_label, sort_order, tags)
VALUES
  ('972a65da-9be8-45ee-9822-71ad9984eb5a'::uuid, 'bus-driver', 'Bus Driver', 'बस ड्राइवर', 'Catalogue staged; final visual copy pending.', NULL, 'Pan India', 'tier1', '{}'::jsonb, 'bus-driver', true, false, 'closed', NULL, 2, ARRAY['safar', 'shaam']::text[]),
  ('ec4207f5-2a4d-45eb-af22-26974505b6af'::uuid, 'bartan-time', 'Bartan Time', 'बर्तन टाइम', 'Catalogue staged; final visual copy pending.', NULL, 'Pan India', 'tier1', '{}'::jsonb, 'bartan-time', true, false, 'closed', NULL, 4, ARRAY['kaam', 'yaadein']::text[]),
  ('4f7e692a-4cca-451c-b2e8-1958b6d2d638'::uuid, 'papa-ke-gaane', 'Papa Ke Gaane', 'पापा के गाने', 'Catalogue staged; final visual copy pending.', NULL, 'Pan India', 'tier1', '{}'::jsonb, 'papa-ke-gaane', true, false, 'closed', NULL, 6, ARRAY['shaam', 'yaadein']::text[])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.curated_sets(id, scene_id, title, sort_order, is_active, shuffle_start, origin_provider, origin_external_id, imported_at)
SELECT v.id, s.id, v.title, v.sort_order, false, true, 'youtube', v.origin_external_id, '2026-08-29T09:58:08.299Z'::timestamptz
FROM (VALUES
  ('8f382722-007c-481f-9b61-82332ee7aae8'::uuid, 'nai-ki-dukaan', 'Deluxe Salon — Seven Jagah Staged', 1, 'PLVFLMYM1tErk'),
  ('bb2cbc33-29d6-4945-ac7a-164ed1f49c8f'::uuid, 'bus-driver', 'Bus Driver — Seven Jagah Staged', 2, 'manual:bus-driver:2026-08-29'),
  ('fe42b40e-6b02-4b60-9ccb-06b1a7e1649d'::uuid, 'bhojpuriya-devara', 'Bhojpuri Bangers — Seven Jagah Staged', 3, 'PLwyqDgjhF4Qpq6kslMcQ8NR6RHb-Z4Tu-'),
  ('d425495b-9938-4a13-a9f0-6014cc3a611d'::uuid, 'bartan-time', 'Bartan Time — Seven Jagah Staged', 4, 'PLc1Byv6ESHSaag4naocpjBLSjO58i9MV5'),
  ('c44a6fb0-ae22-43fb-98b9-843472957d60'::uuid, 'raj-mistri', 'Raju Mistri — Seven Jagah Staged', 5, 'PLTcrZKUys_a5zSgv_3ZHsRnTVJ05GbDvY'),
  ('359d7737-e012-4f5d-aec0-b0c3fc1faafb'::uuid, 'papa-ke-gaane', 'Papa Ke Gaane — Seven Jagah Staged', 6, 'PL3rJgr5HfVCrov_nZV_2ltKKFGWbbjATx'),
  ('d2d4c91e-5ac6-4bfd-bcba-299e60546b1f'::uuid, 'corporate-majdoor', 'Corporate Majdoor — Seven Jagah Staged', 7, 'PLMqSYqU_UWQk')
) AS v(id, scene_slug, title, sort_order, origin_external_id)
JOIN public.scenes s ON s.slug = v.scene_slug
ON CONFLICT (id) DO UPDATE SET
  scene_id = EXCLUDED.scene_id,
  title = EXCLUDED.title,
  sort_order = EXCLUDED.sort_order,
  is_active = false,
  shuffle_start = EXCLUDED.shuffle_start,
  origin_provider = EXCLUDED.origin_provider,
  origin_external_id = EXCLUDED.origin_external_id,
  imported_at = EXCLUDED.imported_at;

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT '8f382722-007c-481f-9b61-82332ee7aae8'::uuid, cst.track_id, cst.position, cst.daypart_tag
FROM public.curated_set_tracks cst
JOIN public.curated_sets cs ON cs.id = cst.curated_set_id
JOIN public.scenes s ON s.id = cs.scene_id
WHERE cs.is_active AND s.slug = 'nai-ki-dukaan'
ON CONFLICT (curated_set_id, position) DO UPDATE SET
  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT 'fe42b40e-6b02-4b60-9ccb-06b1a7e1649d'::uuid, cst.track_id, cst.position, cst.daypart_tag
FROM public.curated_set_tracks cst
JOIN public.curated_sets cs ON cs.id = cst.curated_set_id
JOIN public.scenes s ON s.id = cs.scene_id
WHERE cs.is_active AND s.slug = 'bhojpuriya-devara'
ON CONFLICT (curated_set_id, position) DO UPDATE SET
  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT 'c44a6fb0-ae22-43fb-98b9-843472957d60'::uuid, cst.track_id, cst.position, cst.daypart_tag
FROM public.curated_set_tracks cst
JOIN public.curated_sets cs ON cs.id = cst.curated_set_id
JOIN public.scenes s ON s.id = cs.scene_id
WHERE cs.is_active AND s.slug = 'raj-mistri'
ON CONFLICT (curated_set_id, position) DO UPDATE SET
  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT 'd2d4c91e-5ac6-4bfd-bcba-299e60546b1f'::uuid, cst.track_id, cst.position, cst.daypart_tag
FROM public.curated_set_tracks cst
JOIN public.curated_sets cs ON cs.id = cst.curated_set_id
JOIN public.scenes s ON s.id = cs.scene_id
WHERE cs.is_active AND s.slug = 'corporate-majdoor'
ON CONFLICT (curated_set_id, position) DO UPDATE SET
  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;

INSERT INTO public.tracks(catalogue_key, scene_id, title, artist, year, daypart_tag, sort_order)
SELECT 'youtube:' || v.video_id, NULL, v.title, v.artist, v.year, 'all', 0
FROM (VALUES
  ('jHxKiazJ__w', 'Chaahat Na Hoti | Alka Yagnik, Vinod Rathod | Chaahat | Shah Rukh Khan, Pooja Bhatt', 'Red Chillies Entertainment', NULL),
  ('JSEZcXGRrdE', 'Altaf Raja | kya karoge Tum Aakhir Qabar par meri Aakar _ Tum To Thehre Pardesi Sath Kya nibhao gi', 'sade song all', NULL),
  ('Waw0kSd8bik', 'Dil Tote Tote Ho Gaya - Full Video Song | Bichhoo | Shweta Shetty, Hansraj Han | Bobby Deol', 'T-Series Bollywood Classics', NULL),
  ('HdYiYy-tau8', 'Mujhko Rana Ji Maaf Karna Galti Mare Se Ho Gayi | Ila Arun, Alka Yagnik | Item Song', 'Bollywood Junction', NULL),
  ('HBYWSpBR6hA', 'Dil Laga Liya Maine Tumse Pyaar Karke | Alka Yagnik | Udit Narayan | Dil Hai Tumhaara', 'Filmi Gaane Purane Wale', NULL),
  ('b6VhJ5SjyTQ', 'Kitna Pagal Dil Hai (From "Andaaz")', 'Alka Yagnik', 2003),
  ('weqnfSgDQeo', 'Utha Le Jaoonga | Kumar Sanu | Anuradha Paudwal | Karan Nath | Jividha | Yeh Dil Aashiqana |90s Song', 'Tips Official', NULL),
  ('MbIRbYjLdqM', 'Hum Tumko Nigahon Mein Lyrical Video | Garv-Pride & Honour | Udit N,Shreya G|Salman Khan, Shilpa S', 'T-Series Bollywood Classics', NULL),
  ('c_K2sf6QWFY', 'Mujhse Mohabbat Ka Izhar Karta - Hum Hain Rahi Pyar Ke | Juhi Chawla, Aamir Khan | Alka, Kumar', '90''s Gaane', NULL),
  ('HJbxUGehTUw', 'Aap Ke Pyaar Mein Hum Savarne Lage | Raaz | Dino Morea, Malini Sharma, Alka Yagnik | Romantic Song', 'Bollywood Film Songs', NULL),
  ('ZG6zDWbp_6U', 'Kyaa Dil Ne Kahaa Title Song (Lyrical Video) | Tusshar Kapoor | Esha | Udit Narayan | Alka Yagnik', 'Sony Music India', NULL),
  ('47DstHmE-bE', 'Tu Pyar Hai Kisi Aur Ka - Video Song | Kumar Sanu, Anuradha Paudwal | Aamir Khan, Pooja Bhatt', 'T-Series Bollywood Classics', NULL),
  ('Ef0OGt1jwbQ', 'O yaaron maaf karna(sad)', 'Kumar Abhishek AA', NULL),
  ('8_qUi4PyrYk', 'Tu Jo Hans Hans Ke Sanam Mujhse Baat | Raja Bhaiya 2003 | Udit Narayan, Govinda', 'Er Fazil Creation', NULL),
  ('nNtGRkTdU9Q', 'Hum Yaar Hain Tumhare Lyrical - Haan Maine Bhi Pyaar Kiya | Akshay, Karisma, Abhishek | Alka, Udit', 'Tips Official', NULL),
  ('yMUW3GEWNjo', 'LYRICS : BEPANAH PYAR HAI AAJA | SHREYA GHOSHAL | NILESH MISHRA | ANU MALIK | KRISHNA COTTAGE |', 'Lyrical King', NULL),
  ('jSkBtDg-8lg', 'Full Video: Sajan Tumse Pyar | Maine Pyaar Kyun Kiya | Salmaan Khan, Sushmita Sen', 'T-Series', NULL),
  ('HHgVlMrkloQ', 'Ek Din Aap', 'Kumar Sanu, Alka Yagnik', 1999),
  ('34E5n54EdbY', 'Dil Ka Kya Kare Saheb - Jeet | Sunny Deol, Tabu | Kavita Krishnamurthy | 90''s Hits | Mujara Song', 'Bollywood Dhamaka', NULL),
  ('lFdSi01tpYM', 'Sochenge Tumhe Pyar- Lyrical | #Deewana | #RishiKapoor, Divya Bharti | 90''s Best Song', 'Ishtar Music', NULL),
  ('Ghs-GA8ehD8', 'Rab Kare Tujhko Bhi Pyar Ho Jaye | Jaan Kar HD | Udit Narayan & Alka Yagnik | Salman Khan |', 'duggu', NULL),
  ('BtdiNnrftYM', 'Chand Tare Phool - 4K Video | Tum Se Achcha Kaun Hai | Nakul Kapoor | 90''s Best Romantic Songs', 'Ishtar Music', NULL),
  ('6lDU1HE7o0M', 'Pehli Pehli Baar Mohabbat Ki Hai , Sirf Tum , Kumar Sanu,Alka Yagnik, Sanjay K, Priya G', 'kanika Patra', 2024),
  ('O6elyd1Ba5k', 'Kisise Tum Pyaar Karo (From "Andaaz")', 'Alka Yagnik, Kumar Sanu', 2003),
  ('OtKa_eN88Qo', 'Full Video : Pehle Kabhi Na Mera Haal | Baghban | Salman Khan, Mahima Chaudhary', 'T-Series', NULL),
  ('IJNR_UVLDhs', 'Gadar - Main Nikla Gaddi Leke - Full Song Video | Sunny Deol - Ameesha Patel - HD', 'Zee Music Company', NULL),
  ('ZN2eEGH5lAo', 'Long Drive', 'Mika Singh', NULL),
  ('1T8G_d5o5Gs', 'Yeh Dosti Hum Nahi Todenge | Sholay(1975)| Amitabh Bachchan | Dharmendra | Evergreen Friendship Song', 'Shemaroo Filmi Gaane', NULL),
  ('mzxHflxI-es', 'Zindagi Ek Safar Hai Suhana with lyrics | ज़िंदगी एक सफर है सुहाना के बोल | Kishore Kumar', 'Saregama Music', NULL),
  ('Yd62azPw4hI', 'Musafir Hoon Yaron with lyrics | मुसाफ़िर हूँ यारों ना घर है ना ठिकान | Kishore Kumar | Parichay |', 'Saregama Music', NULL),
  ('CcrXejLuQ9M', 'Chala Jata Hoon | Rajesh Khanna | Kishore Kumar | R.D. Burman | Mere Jeevan Saathi | Old Is Gold', 'Saregama Music', NULL),
  ('tBgquvIYD-I', 'Hum Dono Do Premi', 'Lata Mangeshkar， Kishore Kumar', 2020),
  ('eEeX2QMlSlo', 'Yun Hi Chala Chal Lyrical Video | Swades | A.R. Rahman | Javed Akhtar | Udit Narayan | Shahrukh Khan', 'T-Series Bollywood Classics', NULL),
  ('Mo5tQDcs__g', 'Full Video:Aao Milo Chalen|Jab We Met|Shahid Kapoor, Kareena Kapoor|Pritam, Shaan, Ustad Sultan Khan', 'T-Series', NULL),
  ('fdubeMFwuGs', 'Ilahi Full Video Song | Yeh Jawaani Hai Deewani | Ranbir Kapoor, Deepika Padukone | Pritam', 'T-Series', NULL),
  ('7mTDBsdfw88', '"Safarnama" Video Song | Tamasha | Ranbir Kapoor, Deepika Padukone | T-Series', 'T-Series', NULL),
  ('2mWaqsC3U7k', 'ROCKSTAR: Phir Se Ud Chala (Full Song) | Ranbir Kapoor, Nargis Fakhri | A. R. Rahman, Mohit Chauhan', 'T-Series', NULL),
  ('8HDTS80dlr4', 'Patakha Guddi Highway Full Video Song (Official) || A.R Rahman | Alia Bhatt, Randeep Hooda', 'T-Series', NULL),
  ('R0XjwtP_iTY', 'Khaabon Ke Parinday (Full video song) Zindagi Na Milegi Dobara | Hrithik Roshan, Kartina Kaif', 'T-Series', NULL),
  ('2__nNm0NK4A', 'Journey Song | Piku | Amitabh Bachchan, Irrfan Khan & Deepika Padukone | Anupam Roy & Shreya Ghoshal', 'Zee Music Company', NULL),
  ('9coA7bcpJII', 'Dil Chahta Hai [Full Song] Dil Chahta Hai', 'T-Series', NULL),
  ('wqTQNs9sO6M', 'Hairat Full Video | Anjaana Anjaani | Ranbir Kapoor, Priyanka Chopra | Lucky Ali | Vishal - Shekhar', 'T-Series', NULL),
  ('8kMv5ssr6Dw', 'A.R. Rahman - Roobaroo Best Video|Rang De Basanti|Aamir Khan|Siddharth|Sharman|Naresh', 'SonyMusicIndiaVEVO', NULL),
  ('a6XkY53VlhM', 'Official: Banjarey Video Song | Fugly | Yo Yo Honey Singh', 'T-Series', NULL),
  ('5PbWtDGOL8A', 'Ik Junoon (Paint it red) Full Song Zindagi Na Milegi Dobara | Hrithik, Katrina, Farhan Akhtar', 'T-Series', NULL),
  ('7U84JOhHFpE', 'Lucky Ali - Dekha Hai Aise Bhi', 'SonyMusicIndiaVEVO', NULL),
  ('64KSVbMDr0c', 'Shaan - Tanha Dil Tanha Safar (Music Video) | Popular Hindi Song', 'Universal Music India', NULL),
  ('WiFLnY9NdRw', 'Ammy Virk | Gaddi Jaandi Ae Chalaangaan Maardi | Binnu D | Jasmin B | Maahi S | New Punjabi Song', 'Saregama Punjabi', 2023),
  ('IssysxAisfo', 'Hardy Sandhu: HORNN BLOW Video Song | Jaani | B Praak | New Song 2016 | T-Series', 'T-Series', NULL),
  ('dCmp56tSSmA', 'Diljit Dosanjh: Born To Shine (Official Music Video) G.O.A.T', 'Diljit Dosanjh', 2020),
  ('m3uJ165NVm8', 'Laal Ghaghra', 'Shilpi Raj, Pawan Singh', 2022),
  ('BdMTcZwCokI', 'Palang Sagwan Ke (From "Doli Saja Ke Rakhna")', 'Khesari Lal Yadav, Chhote Baba, Indu Sonali', 2022),
  ('F7tRt7EuPJQ', 'Heroine', 'R Jay Kang, Neelkamal Singh, Arun Bihari', 2022),
  ('bGtlpearGyk', 'Pahin Ke Chali Bikini', 'Purav Jha, Saurabh Safary', 2024),
  ('K_5N4Jd1jf4', 'Kamariya Dole', 'Neelkamal Singh, Shilpi Raj', 2022),
  ('0_dhbcHmrVA', 'Dhani Ho Sab Dhan', 'Pawan Singh, Shivani Singh', 2023),
  ('sDJhOHvWuaE', 'Marad Ha Matha Ke Darad', 'Shivani Singh', 2024),
  ('0G7o18coi14', 'Choliya Ke Hook', 'Arvind Akela Kallu', 2024),
  ('j469OPEkMvA', 'Chadhal Jawani Rasgulla', 'Neelkamal Singh, Shilpi Raj, Priyanshu Singh, Ashutosh Tiwari', 2023),
  ('lKycprTHpQ4', 'Badhata Jawani Jaise Bhaw Petrol Ke', 'Neelkamal Singh', 2021),
  ('zaxVOOhgR6Y', 'Darad Ba Halke Halke', 'Neelkamal Singh', 2023),
  ('xJ6t72Iqq2k', 'Odhani Sar Sar Sarake', 'Neelkamal Singh, Shilpi Raj, Vinay Vinayak, Himesh Reshammiya, Ashutosh Tiwari', 2024),
  ('aXeUvWR2dW8', 'Kala Chashma Laga Lijiye', 'Neelkamal Singh', 2024),
  ('C52R928B0cA', 'Kamar Kare Lach Lach Lach', 'Neelkamal Singh', 2023),
  ('r0fm2yGBrnA', 'Jiyra Ke Jari Raha', 'Neelkamal Singh， Shilpi Raj', 2024),
  ('U4N_zyO5sts', 'Godi Me Leke', 'Pawan Singh, Shilpi Raj', 2023),
  ('zlzR3AOhCmg', 'Chhalakata Hamro Jawaniya', 'Pawan Singh, Priyanka Singh', 2016),
  ('gyTcDLtuYT4', 'Sadiya', 'Pawan Singh, Shivani Singh', 2024),
  ('9W9d0LAI380', 'Raja Ji', 'Pawan Singh ， Shivani Singh', 2023),
  ('9AiO8pxRC8E', 'Piya Chhod Dihin Na', 'Pawan Singh, Priyanshu Singh, Prince Priyadarshi', 2024),
  ('BS6EY0HzKvI', 'Saj Ke Sawar Ke', 'Khesari Lal Yadav', 2017),
  ('YAtgKpugpQ4', 'Pagli Dekhave Agarbatti', 'Neelkamal Singh', 2023),
  ('Tvd4aHVyUwo', 'Maroon Color Sadiya (From "Fasal")', 'Neelkamal Singh, Kalpana, Om Jha', 2024),
  ('kbwuCugRFB0', 'Shaky', 'Sanju Rathod, G-SPXRK', 2025),
  ('Q8V0FcbG0ik', 'Balamuwa Ke Ballam', 'Samar Singh, Neha Raj, Adr Anand, Alok Yadav', 2024),
  ('mClF6mJV5xM', 'Teri Aankhon Mein Song: Divya K | Darshan R, Neha K | Pearl V Manan B | Radhika, Vinay | Bhushan K', 'T-Series', NULL),
  ('4dvPgVeKgbc', 'Show Me The Thumka', 'Pritam, Sunidhi Chauhan, Shashwat Singh, Amitabh Bhattacharya', 2023),
  ('YEp76bA-6rA', 'Teri Baaton Mein Aisa Uljha Jiya Title Song', 'Raghav, Tanishk Bagchi, Asees Kaur, Raghav, Tanishk Bagchi, Nina Mathur, Tanishk Bagchi', 2024),
  ('4z-oDk1utVo', 'Lut Gaye', 'Jubin Nautiyal, Tanishk Bagchi, Nusrat Fateh Ali Khan, Manoj Muntashir, Nusrat Fateh Ali Khan', 2021),
  ('YALvuUpY_b0', 'Apna Bana Le (From "Bhediya")', 'Arijit Singh, Sachin-Jigar', 2022),
  ('qnQCd_nZn_g', 'O Maahi', 'Arijit Singh, Pritam, Irshad Kamil', 2023),
  ('_9FyH8PmRSU', 'Maan Meri Jaan', 'King', 2022),
  ('dNvqJIeHPis', 'Ishq Di Baajiyaan', 'Shankar Ehsaan Loy, Diljit Dosanjh', 2018),
  ('Z0VbANbyH2o', 'Tere Hawaale', 'Pritam, Arijit Singh, Shilpa Rao, Amitabh Bhattacharya', 2022),
  ('gDonh4XgrdA', 'Nayan', 'Dhvani Bhanushali, Jubin Nautiyal, Lijo George-Dj Chetas, Manoj Muntashir', 2020),
  ('sFFEvhlJP6Q', 'Wedding Mashup 2023 | VDJ Ayush | Mihir | Best Romantic Wedding Songs | Wedding Songs 2023', 'VDJ Ayush', NULL),
  ('eesw_fW7bt0', 'Laal Peeli Akhiyaan', 'Romy, Tanishk Bagchi, Tanishk Bagchi, Neeraj Rajawat', 2024),
  ('9Z0jxv-QMS0', 'Bachke Tu Rehna (Khallas) (Most Viral VS Trending Mix) Dj SR Frm Nagar || Unreleased King Dj''s of MH', 'Unreleased King Dj''s of MH', NULL),
  ('tYdPptlvZPo', 'Raataan Lambiyan', 'Tanishk Bagchi, Jubin Nautiyal, Asees Kaur', 2021),
  ('2aLO6Ecof4s', 'Stay', 'Rihanna, Mikky Ekko', 2012),
  ('n6N1_sxlBU8', 'We Found Love (Album Version)', 'Rihanna, Calvin Harris', 2011),
  ('PlgJGC7-cNs', 'Kurchi Madathapetti Megamix - Sush & Yohan (Marathi × Hindi × Telugu × Tamil)', 'Sush & Yohan Music', NULL),
  ('iFLuvFiCwJE', 'BOLLYWOOD NAVRATRI MASHUP 2023 by Musical Trip | Latest Garba Mashup | Bollywood Dandiya 2023', 'Musical Trip', NULL),
  ('uySQog3MjWE', 'Best Bollywood Dandiya 2023 by Musical Trip | Navratri Special 2023 | Best Dandiya Collection', 'Musical Trip', NULL),
  ('XFOVXD1qttc', 'Suniyan Suniyan', 'Juss, Mixsingh', 2024),
  ('8_riOFhwAw4', 'Gulabi Sadi', 'Sanju Rathod, G - SPXRK', 2024),
  ('UO8D53fjxqk', 'Taaron Ke Shehar', 'Neha Kakkar, Jubin Nautiyal, Jaani, Jaani', 2020),
  ('ejDDk5n7AbM', 'Pyaar Hota Kayi Baar Hai', 'Pritam, Arijit Singh, Charan, Amitabh Bhattacharya', 2023),
  ('4mVo93E9wpU', 'Diamonds', 'Rihanna', 2012),
  ('PmRkeYVU1BE', 'Dekhha Tenu (From "Mr. And Mrs. Mahi")', 'Mohammad Faiz, Jaani', 2024)
) AS v(video_id, title, artist, year)
WHERE NOT EXISTS (
  SELECT 1 FROM public.playback_sources ps
  WHERE ps.provider = 'youtube' AND ps.provider_item_id = v.video_id
)
ON CONFLICT (catalogue_key) DO NOTHING;

INSERT INTO public.playback_sources(track_id, provider, provider_item_id, source_url, provider_title, provider_channel, priority, validated_at, is_active)
SELECT t.id, 'youtube', v.video_id, 'https://www.youtube.com/watch?v=' || v.video_id, v.provider_title, v.provider_channel, 0, '2026-08-29T09:58:08.299Z'::timestamptz, true
FROM (VALUES
  ('jHxKiazJ__w', 'Chaahat Na Hoti | Alka Yagnik, Vinod Rathod | Chaahat | Shah Rukh Khan, Pooja Bhatt', 'Red Chillies Entertainment'),
  ('JSEZcXGRrdE', 'Altaf Raja | kya karoge Tum Aakhir Qabar par meri Aakar _ Tum To Thehre Pardesi Sath Kya nibhao gi', 'sade song all'),
  ('Waw0kSd8bik', 'Dil Tote Tote Ho Gaya - Full Video Song | Bichhoo | Shweta Shetty, Hansraj Han | Bobby Deol', 'T-Series Bollywood Classics'),
  ('HdYiYy-tau8', 'Mujhko Rana Ji Maaf Karna Galti Mare Se Ho Gayi | Ila Arun, Alka Yagnik | Item Song', 'Bollywood Junction'),
  ('HBYWSpBR6hA', 'Dil Laga Liya Maine Tumse Pyaar Karke | Alka Yagnik | Udit Narayan | Dil Hai Tumhaara', 'Filmi Gaane Purane Wale'),
  ('b6VhJ5SjyTQ', 'Kitna Pagal Dil Hai (From "Andaaz")', 'Alka Yagnik'),
  ('weqnfSgDQeo', 'Utha Le Jaoonga | Kumar Sanu | Anuradha Paudwal | Karan Nath | Jividha | Yeh Dil Aashiqana |90s Song', 'Tips Official'),
  ('MbIRbYjLdqM', 'Hum Tumko Nigahon Mein Lyrical Video | Garv-Pride & Honour | Udit N,Shreya G|Salman Khan, Shilpa S', 'T-Series Bollywood Classics'),
  ('c_K2sf6QWFY', 'Mujhse Mohabbat Ka Izhar Karta - Hum Hain Rahi Pyar Ke | Juhi Chawla, Aamir Khan | Alka, Kumar', '90''s Gaane'),
  ('HJbxUGehTUw', 'Aap Ke Pyaar Mein Hum Savarne Lage | Raaz | Dino Morea, Malini Sharma, Alka Yagnik | Romantic Song', 'Bollywood Film Songs'),
  ('ZG6zDWbp_6U', 'Kyaa Dil Ne Kahaa Title Song (Lyrical Video) | Tusshar Kapoor | Esha | Udit Narayan | Alka Yagnik', 'Sony Music India'),
  ('47DstHmE-bE', 'Tu Pyar Hai Kisi Aur Ka - Video Song | Kumar Sanu, Anuradha Paudwal | Aamir Khan, Pooja Bhatt', 'T-Series Bollywood Classics'),
  ('Ef0OGt1jwbQ', 'O yaaron maaf karna(sad)', 'Kumar Abhishek AA'),
  ('8_qUi4PyrYk', 'Tu Jo Hans Hans Ke Sanam Mujhse Baat | Raja Bhaiya 2003 | Udit Narayan, Govinda', 'Er Fazil Creation'),
  ('nNtGRkTdU9Q', 'Hum Yaar Hain Tumhare Lyrical - Haan Maine Bhi Pyaar Kiya | Akshay, Karisma, Abhishek | Alka, Udit', 'Tips Official'),
  ('yMUW3GEWNjo', 'LYRICS : BEPANAH PYAR HAI AAJA | SHREYA GHOSHAL | NILESH MISHRA | ANU MALIK | KRISHNA COTTAGE |', 'Lyrical King'),
  ('jSkBtDg-8lg', 'Full Video: Sajan Tumse Pyar | Maine Pyaar Kyun Kiya | Salmaan Khan, Sushmita Sen', 'T-Series'),
  ('HHgVlMrkloQ', 'Ek Din Aap', 'The Kumar Sanu Official'),
  ('34E5n54EdbY', 'Dil Ka Kya Kare Saheb - Jeet | Sunny Deol, Tabu | Kavita Krishnamurthy | 90''s Hits | Mujara Song', 'Bollywood Dhamaka'),
  ('lFdSi01tpYM', 'Sochenge Tumhe Pyar- Lyrical | #Deewana | #RishiKapoor, Divya Bharti | 90''s Best Song', 'Ishtar Music'),
  ('Ghs-GA8ehD8', 'Rab Kare Tujhko Bhi Pyar Ho Jaye | Jaan Kar HD | Udit Narayan & Alka Yagnik | Salman Khan |', 'duggu'),
  ('BtdiNnrftYM', 'Chand Tare Phool - 4K Video | Tum Se Achcha Kaun Hai | Nakul Kapoor | 90''s Best Romantic Songs', 'Ishtar Music'),
  ('6lDU1HE7o0M', 'Pehli Pehli Baar Mohabbat Ki Hai , Sirf Tum , Kumar Sanu,Alka Yagnik, Sanjay K, Priya G', 'kanika Patra'),
  ('O6elyd1Ba5k', 'Kisise Tum Pyaar Karo (From "Andaaz")', 'Release - Topic'),
  ('OtKa_eN88Qo', 'Full Video : Pehle Kabhi Na Mera Haal | Baghban | Salman Khan, Mahima Chaudhary', 'T-Series'),
  ('IJNR_UVLDhs', 'Gadar - Main Nikla Gaddi Leke - Full Song Video | Sunny Deol - Ameesha Patel - HD', 'Zee Music Company'),
  ('ZN2eEGH5lAo', 'Long Drive', 'Mika Singh'),
  ('1T8G_d5o5Gs', 'Yeh Dosti Hum Nahi Todenge | Sholay(1975)| Amitabh Bachchan | Dharmendra | Evergreen Friendship Song', 'Shemaroo Filmi Gaane'),
  ('mzxHflxI-es', 'Zindagi Ek Safar Hai Suhana with lyrics | ज़िंदगी एक सफर है सुहाना के बोल | Kishore Kumar', 'Saregama Music'),
  ('Yd62azPw4hI', 'Musafir Hoon Yaron with lyrics | मुसाफ़िर हूँ यारों ना घर है ना ठिकान | Kishore Kumar | Parichay |', 'Saregama Music'),
  ('CcrXejLuQ9M', 'Chala Jata Hoon | Rajesh Khanna | Kishore Kumar | R.D. Burman | Mere Jeevan Saathi | Old Is Gold', 'Saregama Music'),
  ('tBgquvIYD-I', 'Hum Dono Do Premi', 'Lata Mangeshkar - Topic'),
  ('eEeX2QMlSlo', 'Yun Hi Chala Chal Lyrical Video | Swades | A.R. Rahman | Javed Akhtar | Udit Narayan | Shahrukh Khan', 'T-Series Bollywood Classics'),
  ('Mo5tQDcs__g', 'Full Video:Aao Milo Chalen|Jab We Met|Shahid Kapoor, Kareena Kapoor|Pritam, Shaan, Ustad Sultan Khan', 'T-Series'),
  ('fdubeMFwuGs', 'Ilahi Full Video Song | Yeh Jawaani Hai Deewani | Ranbir Kapoor, Deepika Padukone | Pritam', 'T-Series'),
  ('7mTDBsdfw88', '"Safarnama" Video Song | Tamasha | Ranbir Kapoor, Deepika Padukone | T-Series', 'T-Series'),
  ('2mWaqsC3U7k', 'ROCKSTAR: Phir Se Ud Chala (Full Song) | Ranbir Kapoor, Nargis Fakhri | A. R. Rahman, Mohit Chauhan', 'T-Series'),
  ('8HDTS80dlr4', 'Patakha Guddi Highway Full Video Song (Official) || A.R Rahman | Alia Bhatt, Randeep Hooda', 'T-Series'),
  ('R0XjwtP_iTY', 'Khaabon Ke Parinday (Full video song) Zindagi Na Milegi Dobara | Hrithik Roshan, Kartina Kaif', 'T-Series'),
  ('2__nNm0NK4A', 'Journey Song | Piku | Amitabh Bachchan, Irrfan Khan & Deepika Padukone | Anupam Roy & Shreya Ghoshal', 'Zee Music Company'),
  ('9coA7bcpJII', 'Dil Chahta Hai [Full Song] Dil Chahta Hai', 'T-Series'),
  ('wqTQNs9sO6M', 'Hairat Full Video | Anjaana Anjaani | Ranbir Kapoor, Priyanka Chopra | Lucky Ali | Vishal - Shekhar', 'T-Series'),
  ('8kMv5ssr6Dw', 'A.R. Rahman - Roobaroo Best Video|Rang De Basanti|Aamir Khan|Siddharth|Sharman|Naresh', 'SonyMusicIndiaVEVO'),
  ('a6XkY53VlhM', 'Official: Banjarey Video Song | Fugly | Yo Yo Honey Singh', 'T-Series'),
  ('5PbWtDGOL8A', 'Ik Junoon (Paint it red) Full Song Zindagi Na Milegi Dobara | Hrithik, Katrina, Farhan Akhtar', 'T-Series'),
  ('7U84JOhHFpE', 'Lucky Ali - Dekha Hai Aise Bhi', 'SonyMusicIndiaVEVO'),
  ('64KSVbMDr0c', 'Shaan - Tanha Dil Tanha Safar (Music Video) | Popular Hindi Song', 'Universal Music India'),
  ('WiFLnY9NdRw', 'Ammy Virk | Gaddi Jaandi Ae Chalaangaan Maardi | Binnu D | Jasmin B | Maahi S | New Punjabi Song', 'Saregama Punjabi'),
  ('IssysxAisfo', 'Hardy Sandhu: HORNN BLOW Video Song | Jaani | B Praak | New Song 2016 | T-Series', 'T-Series'),
  ('dCmp56tSSmA', 'Diljit Dosanjh: Born To Shine (Official Music Video) G.O.A.T', 'Diljit Dosanjh'),
  ('m3uJ165NVm8', 'Laal Ghaghra', 'Shilpi Raj Hits'),
  ('BdMTcZwCokI', 'Palang Sagwan Ke (From "Doli Saja Ke Rakhna")', 'Khesari Music World'),
  ('F7tRt7EuPJQ', 'Heroine', 'R Jay Kang - Topic'),
  ('bGtlpearGyk', 'Pahin Ke Chali Bikini', 'purav jha - Topic'),
  ('K_5N4Jd1jf4', 'Kamariya Dole', 'Neelkamal Singh Official'),
  ('0_dhbcHmrVA', 'Dhani Ho Sab Dhan', 'Pawan Singh Official'),
  ('sDJhOHvWuaE', 'Marad Ha Matha Ke Darad', 'Shivani Singh Official'),
  ('0G7o18coi14', 'Choliya Ke Hook', 'Kallu Music World'),
  ('j469OPEkMvA', 'Chadhal Jawani Rasgulla', 'Neelkamal Singh Official'),
  ('lKycprTHpQ4', 'Badhata Jawani Jaise Bhaw Petrol Ke', 'Neelkamal Singh Official'),
  ('zaxVOOhgR6Y', 'Darad Ba Halke Halke', 'Neelkamal Singh Official'),
  ('xJ6t72Iqq2k', 'Odhani Sar Sar Sarake', 'Neelkamal Singh Official'),
  ('aXeUvWR2dW8', 'Kala Chashma Laga Lijiye', 'Neelkamal Singh Official'),
  ('C52R928B0cA', 'Kamar Kare Lach Lach Lach', 'Neelkamal Singh Official'),
  ('r0fm2yGBrnA', 'Jiyra Ke Jari Raha', 'Neelkamal Singh Official'),
  ('U4N_zyO5sts', 'Godi Me Leke', 'Pawan Singh Official'),
  ('zlzR3AOhCmg', 'Chhalakata Hamro Jawaniya', 'Pawan Singh Official'),
  ('gyTcDLtuYT4', 'Sadiya', 'Pawan Singh Official'),
  ('9W9d0LAI380', 'Raja Ji', 'Pawan Singh Official'),
  ('9AiO8pxRC8E', 'Piya Chhod Dihin Na', 'Pawan Singh Official'),
  ('BS6EY0HzKvI', 'Saj Ke Sawar Ke', 'Khesari Music World'),
  ('YAtgKpugpQ4', 'Pagli Dekhave Agarbatti', 'Neelkamal Singh Official'),
  ('Tvd4aHVyUwo', 'Maroon Color Sadiya (From "Fasal")', 'Neelkamal Singh Official'),
  ('kbwuCugRFB0', 'Shaky', 'Sanju Rathod SR'),
  ('Q8V0FcbG0ik', 'Balamuwa Ke Ballam', 'Samar Singh Official'),
  ('mClF6mJV5xM', 'Teri Aankhon Mein Song: Divya K | Darshan R, Neha K | Pearl V Manan B | Radhika, Vinay | Bhushan K', 'T-Series'),
  ('4dvPgVeKgbc', 'Show Me The Thumka', 'Pritam'),
  ('YEp76bA-6rA', 'Teri Baaton Mein Aisa Uljha Jiya Title Song', 'Raghav - Topic'),
  ('4z-oDk1utVo', 'Lut Gaye', 'Jubin Nautiyal'),
  ('YALvuUpY_b0', 'Apna Bana Le (From "Bhediya")', 'Arijit Singh'),
  ('qnQCd_nZn_g', 'O Maahi', 'Arijit Singh'),
  ('_9FyH8PmRSU', 'Maan Meri Jaan', 'King'),
  ('dNvqJIeHPis', 'Ishq Di Baajiyaan', 'Shankar Ehsaan Loy'),
  ('Z0VbANbyH2o', 'Tere Hawaale', 'Pritam'),
  ('gDonh4XgrdA', 'Nayan', 'Dhvani Bhanushali'),
  ('sFFEvhlJP6Q', 'Wedding Mashup 2023 | VDJ Ayush | Mihir | Best Romantic Wedding Songs | Wedding Songs 2023', 'VDJ Ayush'),
  ('eesw_fW7bt0', 'Laal Peeli Akhiyaan', 'Romy'),
  ('9Z0jxv-QMS0', 'Bachke Tu Rehna (Khallas) (Most Viral VS Trending Mix) Dj SR Frm Nagar || Unreleased King Dj''s of MH', 'Unreleased King Dj''s of MH'),
  ('tYdPptlvZPo', 'Raataan Lambiyan', 'Release - Topic'),
  ('2aLO6Ecof4s', 'Stay', 'Rihanna'),
  ('n6N1_sxlBU8', 'We Found Love (Album Version)', 'Rihanna'),
  ('PlgJGC7-cNs', 'Kurchi Madathapetti Megamix - Sush & Yohan (Marathi × Hindi × Telugu × Tamil)', 'Sush & Yohan Music'),
  ('iFLuvFiCwJE', 'BOLLYWOOD NAVRATRI MASHUP 2023 by Musical Trip | Latest Garba Mashup | Bollywood Dandiya 2023', 'Musical Trip'),
  ('uySQog3MjWE', 'Best Bollywood Dandiya 2023 by Musical Trip | Navratri Special 2023 | Best Dandiya Collection', 'Musical Trip'),
  ('XFOVXD1qttc', 'Suniyan Suniyan', 'Juss'),
  ('8_riOFhwAw4', 'Gulabi Sadi', 'Sanju Rathod SR'),
  ('UO8D53fjxqk', 'Taaron Ke Shehar', 'Neha Kakkar'),
  ('ejDDk5n7AbM', 'Pyaar Hota Kayi Baar Hai', 'Pritam'),
  ('4mVo93E9wpU', 'Diamonds', 'Rihanna'),
  ('PmRkeYVU1BE', 'Dekhha Tenu (From "Mr. And Mrs. Mahi")', 'Mohammad Faiz')
) AS v(video_id, provider_title, provider_channel)
JOIN public.tracks t ON t.catalogue_key = 'youtube:' || v.video_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.playback_sources ps
  WHERE ps.provider = 'youtube' AND ps.provider_item_id = v.video_id
);

INSERT INTO public.tracks(catalogue_key, scene_id, title, artist, year, daypart_tag, sort_order)
SELECT 'youtube:' || v.video_id, NULL, v.title, v.artist, v.year, 'all', 0
FROM (VALUES
  ('U0qBRoeQa-g', 'Tu Pyar Hai Kisi Aur Ka (Full Song):Aamir K, Pooja B| Anuradha P, Kumar Sanu| Dil Hai Ke Manta Nahin', 'T-Series', NULL),
  ('sWqjZpBtcxc', 'Aye Mere Humsafar Full Song | Qayamat Se Qayamat Tak | Udit N | Alka Y| Aamir Khan, Juhi Chawla', 'T-Series Bollywood Classics', NULL),
  ('maqLiqpClqU', 'Woh Ladki Bohot Yaad Aati Hai | Duet Lyrical | Kumar Sanu & Alka Yagnik | Qayamat |', 'Ishtar Music', 2024),
  ('NzZxyWr9OA4', 'कितना हसीन चेहरा HD - दिलवाले - अजय देवगन, रवीना टंडन - कुमार सानु', 'Goldmines Gaane Sune Ansune', NULL),
  ('uIOrAkrjwp4', 'Hum Yaar Hai Tumhare | Alka Yagnik | Udit Narayan | Haan Maine Bhi Pyaar Kiya (2002)', 'Bollywood Sadabahar', NULL),
  ('sBFKHnNp-8c', 'Abhi To Mohabbat Ka -4K Video |Hum Ho Gaye Aap Ke| Apurva Agnihotri & Reema Sen |Hindi Romantic Song', 'Ishtar Music', NULL),
  ('xvevXfFGPFY', 'Teri Umeed Tera Intezar - LYRICAL VIDEO | Deewana | Rishi Kapoor, Divya Bharti | 90''s Romantic Song', 'Ishtar Music', NULL),
  ('HubRXgH0Erc', 'Tumsa Koi Pyaara | Kumar Sanu | Alka Yagnik | Khuddar (1994)', '90''s Gaane', NULL),
  ('vYGPudMvxvI', 'Raah Mein Unse Mulaqat | Vijaypath | Ajay Devgn, Tabu | Kumar Sanu, Alka Yagnik | Anu Malik | 90''s', 'Tips Official', NULL),
  ('_wDJTSfB4bQ', 'Dil Cheer Ke Dekh Tera Hi Naam Hoga | Divya Bharti | Kumar Sanu | 90''s Hits Song', 'Bollywood Classic Hits', NULL),
  ('L3gOr6vwSjg', 'Is Pyar Se Meri Taraf Na Dekho (Male) | Chamatkar | Shah Rukh khan, Urmila | Kumar Sanu | 90''s Hits', 'Tips Official', NULL),
  ('00V7IokvbTA', 'Chaaha Toh Bahut Na Chahe Tujhe | Imtihan | Saif Ali Khan, Raveena Tandon | Kumar Sanu, Bela | 90s', 'Tips Official', NULL),
  ('GBRifFvAJX8', 'Pucho Zara Pucho | Raja Hindustani | Aamir Khan | Karisma Kapoor | Alka Yagnik | Kumar Sanu', '90''s Gaane', 2021),
  ('HIr_kpG4Fnc', 'S. P. Balasubrahmanyam sings Tumse Milne Ki Tamanna Hai - तुमसे मिलने की तमन्ना from Saajan (1991)', 'Hemantkumar Mahale', NULL),
  ('Gg9ZUppafLo', 'Too Shayar Hai Main Teri Shayari - Saajan Alka Yagnik.', 'IDeal Music', NULL),
  ('qSAVrkUsI6o', 'Lagi Aaj Sawan Ki Lyrical Video | Chandni | Vinod Khanna | Sridevi | Anupama Deshpande,Suresh Wadkar', '70s, 80s, 90s, Songs', NULL),
  ('OsBqRHx2JAA', 'Chhupana Bhi Nahi Aata - 4K VIDEO | Baazigar | Shahrukh & Kajol | Vinod Rathod | 90''s Romantic Song', 'Ishtar Music', NULL),
  ('ieu6xnwJxdA', 'किताबें बहुत सी | | Baazigar | Shah Rukh Khan & Kajol | Asha Bhosle | Vinod Rathod   Romantic Songs', 'Ishtar Music', NULL),
  ('5c5u3JRm_lA', 'Baazigar O Baazigar 4k Video Song | Shahrukh Khan, Kajol | Kumar Sanu, Alka Yagnik | 90s Songs', 'media', NULL),
  ('MB6jaF_iAnc', 'Koi Na Koi Chahiye Pyar Karne Wala | Deewana | Shahrukh Khan | Romantic Hindi Songs', 'Shemaroo Romantic Songs', NULL),
  ('fa5Yzxdh8e4', 'जीता था जिसके लिये HD - दिलवाले - अजय देवगन, रवीना टंडन, सुनील शेट्टी - कुमार सानु, अलका याग्निक', 'Goldmines Gaane Sune Ansune', NULL),
  ('tPNwGuu_rQ4', 'Lyrical: Tumhein Apna Banane Ki Kasam | Sadak | Kumar Sanu,Anuradha Paudwal |Sanjay Dutt,Pooja Bhatt', 'T-Series Bollywood Classics', NULL),
  ('KC-DuX51NY0', 'Yeh Kaali Kaali Aankhen - LYRICAL VIDEO | Shah Rukh Khan & Kajol | Baazigar | Ishtar Music', 'Ishtar Music', NULL),
  ('odrhc32fiLo', 'Mere Mehboob Qayamat Hogi', 'Kishore Kumar', 2020),
  ('V0TejHIZLV8', 'Pal Pal Dil Ke Paas (From "Blackmail")', 'Kishore Kumar', 1973),
  ('eAXSrnHDlfQ', 'Likhe Jo Khat Tujhe', 'Mohammed Rafi', 2020),
  ('qq-_7Q6zq80', 'Ankhiyon Ke Jharokhon Se', 'Hemlata', 1978),
  ('oPlHNekNTtI', 'Dekha Ek Khwab', 'Lata Mangeshkar， Kishore Kumar', 2020),
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
  ('55Ya9kZ5iFs', 'Tere Jaisa Yaar Kahan (From "Yaarana")', 'Kishore Kumar', 1981),
  ('41FWDaUFzDY', 'Tumne Kisi Se Kabhi Pyar Kiya Hai', 'Mukesh， Kanchan', 2020),
  ('oqUdGfzKHe8', 'Hamen Tumse Pyar Kitna -kishore Kumar', 'Kishore Kumar', 2020),
  ('wURInzaTetM', 'Wada Karo (From "Aa Gale Lag Jaa")', 'Kishore Kumar, Lata Mangeshkar, R. D. Burman', 1973),
  ('9Eg4d56rt-U', 'Neele Neele Ambar Par (Male Version)', 'Kalyanji - Anandji, Kishore Kumar', 1983),
  ('wBKOlVvVQs0', 'SalamEIshq Meri Jaan', 'Lata Mangeshkar, Kishore Kumar', 1978),
  ('RVeLrwoB_xw', 'Mere Sapnon Ki Rani', 'Kishore Kumar', 2020),
  ('BQJVOJUPJ30', 'Yeh Raaten Yeh Mausam', 'Kishore Kumar， Asha Bhosle', 2020),
  ('EjSIjGhTEFE', 'Shayad Meri Shaadi', 'Lata Mangeshkar, Kishore Kumar', 2014),
  ('9a26mBBK4jE', 'Tere Sang Yaara', 'Atif Aslam, Manoj Muntashir', 2016),
  ('l2hvSNbg_f0', 'Tu Banja Gali Benaras Ki - Full Audio | Shaadi Mein Zaroor Aana | Rajkummar R,Kriti K|Asit Tripathy', 'Zee Music Company', NULL),
  ('H2f7MZaw3Yo', 'Arijit Singh, Shreya Ghoshal - Samjhawan - Lyric video | Alia B, Varun D | Humpty Sharma Ki Dulhania', 'Sony Music India', NULL),
  ('HexFqifusOk', 'Jogi - Lyrical | Shaadi Mein Zaroor Aana | Rajkummar Rao, Kriti Kharbanda | Arko, Yasser, Aakanksha', 'Zee Music Company', NULL),
  ('4tYktXxNspo', 'Padmaavat: Nainowale Ne Lyrical Video Song | Deepika Padukone | Shahid Kapoor | Ranveer Singh', 'T-Series', NULL),
  ('atVof3pjT-I', 'KAUN TUJHE Full  Video | M.S. DHONI -THE UNTOLD STORY |Amaal Mallik Palak|Sushant Singh Disha Patani', 'T-Series', NULL),
  ('I94fhjQ-U30', 'Tum Se Hi', 'Pritam, Mohit Chauhan, Irshad Kamil', 2007),
  ('9Cp-hNvSWZs', 'Maiyya Mainu', 'Sachet Tandon, Shellee', 2021),
  ('LQzByGZHiQ8', 'Tum Jo Aaye', 'Pritam, Rahat Fateh Ali Khan, Tulsi Kumar, Irshad Kamil', 2010),
  ('8PEqEh1lnNE', 'Main Agar Kahoon', 'Vishal-Shekhar, Sonu Nigam, Shreya Ghoshal, Vishal-Shekhar, Javed Akhtar', 2007),
  ('82P9aa28DoE', 'Jaan Ban Gaye', 'Mithoon, Vishal Mishra, Asees Kaur', 2020),
  ('Mc1MZkvMvCk', 'Dooron Dooron - Unplugged', 'Paresh Pahuja, Paresh Pahuja, Shiv Tandan', 2025),
  ('SMlGGRAB3Hc', 'Afreen Afreen', 'Rahat Fateh Ali Khan & Momina Mustehsan', 2016),
  ('gvyUuxdRdR4', 'Raataan Lambiyan – Official Video | Shershaah | Sidharth – Kiara | Tanishk B| Jubin Nautiyal  |Asees', 'Sony Music India', 2021),
  ('FA_J8XwpCaQ', 'Tu Jaane Na', 'Pritam Chakraborty, Atif Aslam', 2009),
  ('pqBKTLnowdM', 'Saiyyan', 'Kailash Kher, Paresh Kamath, Naresh Kamath', 2007),
  ('ii9KLQoV78I', 'Hawayein (From "Jab Harry Met Sejal")', 'Pritam, Arijit Singh', 2017),
  ('r6yFwzExp0w', 'Bahara', 'Vishal & Shekhar, Shreya Ghoshal, Sona Mohapatra', 2010),
  ('64lEY8jj4RA', 'Dil Mein Ho Tum (From "Cheat India")', 'Armaan Malik, Rochak Kohli, Bappi Lahiri, Manoj Muntashir, Farooq Qaiser, Soumik Sen, Emraan Hashmi, Shreya Dhanwanthary', 2018),
  ('2CAiycLVy7s', 'Tu Hi Haqeeqat', 'Pritam, Javed Ali, Irshan Ashraf, Shadab, Sayeed Quadri', 2009),
  ('R_T2uJX2r8A', 'KINNA SONA', 'SUNIL KAMATH, MITHOON, AMITABH VERMA', 2015),
  ('oOvSWET7xSA', 'Subhanallah (From "Yeh Jawaani Hai Deewani")', 'Sreeram, Shilpa Rao, Pritam, Amitabh Bhattacharya', 2015),
  ('8ZLFwzPPk7Q', 'Saiyaara', 'Mohit Chauhan, Taraannum Mallik', 2012)
) AS v(video_id, title, artist, year)
WHERE NOT EXISTS (
  SELECT 1 FROM public.playback_sources ps
  WHERE ps.provider = 'youtube' AND ps.provider_item_id = v.video_id
)
ON CONFLICT (catalogue_key) DO NOTHING;

INSERT INTO public.playback_sources(track_id, provider, provider_item_id, source_url, provider_title, provider_channel, priority, validated_at, is_active)
SELECT t.id, 'youtube', v.video_id, 'https://www.youtube.com/watch?v=' || v.video_id, v.provider_title, v.provider_channel, 0, '2026-08-29T09:58:08.299Z'::timestamptz, true
FROM (VALUES
  ('U0qBRoeQa-g', 'Tu Pyar Hai Kisi Aur Ka (Full Song):Aamir K, Pooja B| Anuradha P, Kumar Sanu| Dil Hai Ke Manta Nahin', 'T-Series'),
  ('sWqjZpBtcxc', 'Aye Mere Humsafar Full Song | Qayamat Se Qayamat Tak | Udit N | Alka Y| Aamir Khan, Juhi Chawla', 'T-Series Bollywood Classics'),
  ('maqLiqpClqU', 'Woh Ladki Bohot Yaad Aati Hai | Duet Lyrical | Kumar Sanu & Alka Yagnik | Qayamat |', 'Ishtar Music'),
  ('NzZxyWr9OA4', 'कितना हसीन चेहरा HD - दिलवाले - अजय देवगन, रवीना टंडन - कुमार सानु', 'Goldmines Gaane Sune Ansune'),
  ('uIOrAkrjwp4', 'Hum Yaar Hai Tumhare | Alka Yagnik | Udit Narayan | Haan Maine Bhi Pyaar Kiya (2002)', 'Bollywood Sadabahar'),
  ('sBFKHnNp-8c', 'Abhi To Mohabbat Ka -4K Video |Hum Ho Gaye Aap Ke| Apurva Agnihotri & Reema Sen |Hindi Romantic Song', 'Ishtar Music'),
  ('xvevXfFGPFY', 'Teri Umeed Tera Intezar - LYRICAL VIDEO | Deewana | Rishi Kapoor, Divya Bharti | 90''s Romantic Song', 'Ishtar Music'),
  ('HubRXgH0Erc', 'Tumsa Koi Pyaara | Kumar Sanu | Alka Yagnik | Khuddar (1994)', '90''s Gaane'),
  ('vYGPudMvxvI', 'Raah Mein Unse Mulaqat | Vijaypath | Ajay Devgn, Tabu | Kumar Sanu, Alka Yagnik | Anu Malik | 90''s', 'Tips Official'),
  ('_wDJTSfB4bQ', 'Dil Cheer Ke Dekh Tera Hi Naam Hoga | Divya Bharti | Kumar Sanu | 90''s Hits Song', 'Bollywood Classic Hits'),
  ('L3gOr6vwSjg', 'Is Pyar Se Meri Taraf Na Dekho (Male) | Chamatkar | Shah Rukh khan, Urmila | Kumar Sanu | 90''s Hits', 'Tips Official'),
  ('00V7IokvbTA', 'Chaaha Toh Bahut Na Chahe Tujhe | Imtihan | Saif Ali Khan, Raveena Tandon | Kumar Sanu, Bela | 90s', 'Tips Official'),
  ('GBRifFvAJX8', 'Pucho Zara Pucho | Raja Hindustani | Aamir Khan | Karisma Kapoor | Alka Yagnik | Kumar Sanu', '90''s Gaane'),
  ('HIr_kpG4Fnc', 'S. P. Balasubrahmanyam sings Tumse Milne Ki Tamanna Hai - तुमसे मिलने की तमन्ना from Saajan (1991)', 'Hemantkumar Mahale'),
  ('Gg9ZUppafLo', 'Too Shayar Hai Main Teri Shayari - Saajan Alka Yagnik.', 'IDeal Music'),
  ('qSAVrkUsI6o', 'Lagi Aaj Sawan Ki Lyrical Video | Chandni | Vinod Khanna | Sridevi | Anupama Deshpande,Suresh Wadkar', '70s, 80s, 90s, Songs'),
  ('OsBqRHx2JAA', 'Chhupana Bhi Nahi Aata - 4K VIDEO | Baazigar | Shahrukh & Kajol | Vinod Rathod | 90''s Romantic Song', 'Ishtar Music'),
  ('ieu6xnwJxdA', 'किताबें बहुत सी | | Baazigar | Shah Rukh Khan & Kajol | Asha Bhosle | Vinod Rathod   Romantic Songs', 'Ishtar Music'),
  ('5c5u3JRm_lA', 'Baazigar O Baazigar 4k Video Song | Shahrukh Khan, Kajol | Kumar Sanu, Alka Yagnik | 90s Songs', 'media'),
  ('MB6jaF_iAnc', 'Koi Na Koi Chahiye Pyar Karne Wala | Deewana | Shahrukh Khan | Romantic Hindi Songs', 'Shemaroo Romantic Songs'),
  ('fa5Yzxdh8e4', 'जीता था जिसके लिये HD - दिलवाले - अजय देवगन, रवीना टंडन, सुनील शेट्टी - कुमार सानु, अलका याग्निक', 'Goldmines Gaane Sune Ansune'),
  ('tPNwGuu_rQ4', 'Lyrical: Tumhein Apna Banane Ki Kasam | Sadak | Kumar Sanu,Anuradha Paudwal |Sanjay Dutt,Pooja Bhatt', 'T-Series Bollywood Classics'),
  ('KC-DuX51NY0', 'Yeh Kaali Kaali Aankhen - LYRICAL VIDEO | Shah Rukh Khan & Kajol | Baazigar | Ishtar Music', 'Ishtar Music'),
  ('odrhc32fiLo', 'Mere Mehboob Qayamat Hogi', 'Kishore Kumar - Topic'),
  ('V0TejHIZLV8', 'Pal Pal Dil Ke Paas (From "Blackmail")', 'Kishore Kumar - Topic'),
  ('eAXSrnHDlfQ', 'Likhe Jo Khat Tujhe', 'Mohammed Rafi - Topic'),
  ('qq-_7Q6zq80', 'Ankhiyon Ke Jharokhon Se', 'Hemlata - Topic'),
  ('oPlHNekNTtI', 'Dekha Ek Khwab', 'Lata Mangeshkar - Topic'),
  ('dIolaq-Cd9E', 'Inteha Ho Gai', 'Kishore Kumar - Topic'),
  ('p0FY8rRrZ6Y', 'Meri Bheegi Bheegi Si', 'Kishore Kumar - Topic'),
  ('GMLFuNHHB6s', 'Main Pal Do Pal Ka Shair Hoon', 'Mukesh - Topic'),
  ('EYE61OWUUm8', 'Ek Ajnabee Haseena Se', 'Kishore Kumar - Topic'),
  ('wJ2by202hDI', 'Chala Jata Hoon', 'Kishore Kumar - Topic'),
  ('HKN3RkwGEaY', 'Aate Jate Khoobsurat Awara', 'Kishore Kumar - Topic'),
  ('JVVs-qR7IrU', 'O Saathi Re', 'Kishore Kumar - Topic'),
  ('iWgT21xoJtY', 'Chhalka Yeh Jaam', 'Mohammed Rafi - Topic'),
  ('1V6p1gDsBW4', 'Teri Galiyon Mein', 'Mohammed Rafi - Topic'),
  ('-7iWJUOfS8Y', 'Manzilen Apni Jagah Hai', 'Kishore Kumar - Topic'),
  ('QSv4VZvTUGg', 'Mere Dil Mein Aaj Kya Hai', 'Kishore Kumar - Topic'),
  ('55Ya9kZ5iFs', 'Tere Jaisa Yaar Kahan (From "Yaarana")', 'Kishore Kumar - Topic'),
  ('41FWDaUFzDY', 'Tumne Kisi Se Kabhi Pyar Kiya Hai', 'Mukesh - Topic'),
  ('oqUdGfzKHe8', 'Hamen Tumse Pyar Kitna -kishore Kumar', 'Kishore Kumar - Topic'),
  ('wURInzaTetM', 'Wada Karo (From "Aa Gale Lag Jaa")', 'Kishore Kumar - Topic'),
  ('9Eg4d56rt-U', 'Neele Neele Ambar Par (Male Version)', 'Kishore Kumar - Topic'),
  ('wBKOlVvVQs0', 'SalamEIshq Meri Jaan', 'Lata Mangeshkar - Topic'),
  ('RVeLrwoB_xw', 'Mere Sapnon Ki Rani', 'Kishore Kumar - Topic'),
  ('BQJVOJUPJ30', 'Yeh Raaten Yeh Mausam', 'Kishore Kumar - Topic'),
  ('EjSIjGhTEFE', 'Shayad Meri Shaadi', 'Lata Mangeshkar - Topic'),
  ('9a26mBBK4jE', 'Tere Sang Yaara', 'Atif Aslam'),
  ('l2hvSNbg_f0', 'Tu Banja Gali Benaras Ki - Full Audio | Shaadi Mein Zaroor Aana | Rajkummar R,Kriti K|Asit Tripathy', 'Zee Music Company'),
  ('H2f7MZaw3Yo', 'Arijit Singh, Shreya Ghoshal - Samjhawan - Lyric video | Alia B, Varun D | Humpty Sharma Ki Dulhania', 'Sony Music India'),
  ('HexFqifusOk', 'Jogi - Lyrical | Shaadi Mein Zaroor Aana | Rajkummar Rao, Kriti Kharbanda | Arko, Yasser, Aakanksha', 'Zee Music Company'),
  ('4tYktXxNspo', 'Padmaavat: Nainowale Ne Lyrical Video Song | Deepika Padukone | Shahid Kapoor | Ranveer Singh', 'T-Series'),
  ('atVof3pjT-I', 'KAUN TUJHE Full  Video | M.S. DHONI -THE UNTOLD STORY |Amaal Mallik Palak|Sushant Singh Disha Patani', 'T-Series'),
  ('I94fhjQ-U30', 'Tum Se Hi', 'Pritam'),
  ('9Cp-hNvSWZs', 'Maiyya Mainu', 'Sachet Tandon - Topic'),
  ('LQzByGZHiQ8', 'Tum Jo Aaye', 'Pritam'),
  ('8PEqEh1lnNE', 'Main Agar Kahoon', 'Vishal-Shekhar - Topic'),
  ('82P9aa28DoE', 'Jaan Ban Gaye', 'Mithoon - Topic'),
  ('Mc1MZkvMvCk', 'Dooron Dooron - Unplugged', 'Paresh Pahuja'),
  ('SMlGGRAB3Hc', 'Afreen Afreen', 'The Folk & Soul Studio'),
  ('gvyUuxdRdR4', 'Raataan Lambiyan – Official Video | Shershaah | Sidharth – Kiara | Tanishk B| Jubin Nautiyal  |Asees', 'Sony Music India'),
  ('FA_J8XwpCaQ', 'Tu Jaane Na', 'Pritam'),
  ('pqBKTLnowdM', 'Saiyyan', 'Kailasa Records '),
  ('ii9KLQoV78I', 'Hawayein (From "Jab Harry Met Sejal")', 'Pritam'),
  ('r6yFwzExp0w', 'Bahara', 'Vishal-Shekhar - Topic'),
  ('64lEY8jj4RA', 'Dil Mein Ho Tum (From "Cheat India")', 'Armaan Malik'),
  ('2CAiycLVy7s', 'Tu Hi Haqeeqat', 'Pritam'),
  ('R_T2uJX2r8A', 'KINNA SONA', 'Sunil Kamath - Topic'),
  ('oOvSWET7xSA', 'Subhanallah (From "Yeh Jawaani Hai Deewani")', 'Sreerama Chandra'),
  ('8ZLFwzPPk7Q', 'Saiyaara', 'Mohit Chauhan')
) AS v(video_id, provider_title, provider_channel)
JOIN public.tracks t ON t.catalogue_key = 'youtube:' || v.video_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.playback_sources ps
  WHERE ps.provider = 'youtube' AND ps.provider_item_id = v.video_id
);

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT '8f382722-007c-481f-9b61-82332ee7aae8'::uuid, ps.track_id, v.position, 'all'
FROM (VALUES
  ('jHxKiazJ__w', 43),
  ('JSEZcXGRrdE', 44),
  ('Waw0kSd8bik', 45),
  ('HdYiYy-tau8', 46),
  ('HBYWSpBR6hA', 47),
  ('b6VhJ5SjyTQ', 48),
  ('weqnfSgDQeo', 49),
  ('MbIRbYjLdqM', 50),
  ('c_K2sf6QWFY', 51),
  ('HJbxUGehTUw', 52),
  ('ZG6zDWbp_6U', 53),
  ('47DstHmE-bE', 54),
  ('Ef0OGt1jwbQ', 55),
  ('8_qUi4PyrYk', 56),
  ('nNtGRkTdU9Q', 57),
  ('yMUW3GEWNjo', 58),
  ('jSkBtDg-8lg', 59),
  ('HHgVlMrkloQ', 60),
  ('34E5n54EdbY', 61),
  ('lFdSi01tpYM', 62),
  ('Ghs-GA8ehD8', 63),
  ('BtdiNnrftYM', 64),
  ('6lDU1HE7o0M', 65),
  ('O6elyd1Ba5k', 66),
  ('OtKa_eN88Qo', 67)
) AS v(video_id, position)
JOIN public.playback_sources ps ON ps.provider = 'youtube' AND ps.provider_item_id = v.video_id AND ps.is_active
ON CONFLICT (curated_set_id, position) DO UPDATE SET
  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT 'bb2cbc33-29d6-4945-ac7a-164ed1f49c8f'::uuid, ps.track_id, v.position, 'all'
FROM (VALUES
  ('IJNR_UVLDhs', 1),
  ('ZN2eEGH5lAo', 2),
  ('1T8G_d5o5Gs', 3),
  ('mzxHflxI-es', 4),
  ('Yd62azPw4hI', 5),
  ('CcrXejLuQ9M', 6),
  ('tBgquvIYD-I', 7),
  ('eEeX2QMlSlo', 8),
  ('Mo5tQDcs__g', 9),
  ('fdubeMFwuGs', 10),
  ('7mTDBsdfw88', 11),
  ('2mWaqsC3U7k', 12),
  ('8HDTS80dlr4', 13),
  ('R0XjwtP_iTY', 14),
  ('2__nNm0NK4A', 15),
  ('9coA7bcpJII', 16),
  ('wqTQNs9sO6M', 17),
  ('8kMv5ssr6Dw', 18),
  ('a6XkY53VlhM', 19),
  ('5PbWtDGOL8A', 20),
  ('7U84JOhHFpE', 21),
  ('64KSVbMDr0c', 22),
  ('WiFLnY9NdRw', 23),
  ('IssysxAisfo', 24),
  ('dCmp56tSSmA', 25)
) AS v(video_id, position)
JOIN public.playback_sources ps ON ps.provider = 'youtube' AND ps.provider_item_id = v.video_id AND ps.is_active
ON CONFLICT (curated_set_id, position) DO UPDATE SET
  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT 'fe42b40e-6b02-4b60-9ccb-06b1a7e1649d'::uuid, ps.track_id, v.position, 'all'
FROM (VALUES
  ('m3uJ165NVm8', 3650),
  ('BdMTcZwCokI', 3651),
  ('F7tRt7EuPJQ', 3652),
  ('bGtlpearGyk', 3653),
  ('K_5N4Jd1jf4', 3654),
  ('0_dhbcHmrVA', 3655),
  ('sDJhOHvWuaE', 3656),
  ('0G7o18coi14', 3657),
  ('j469OPEkMvA', 3658),
  ('lKycprTHpQ4', 3659),
  ('zaxVOOhgR6Y', 3660),
  ('xJ6t72Iqq2k', 3661),
  ('aXeUvWR2dW8', 3662),
  ('C52R928B0cA', 3663),
  ('r0fm2yGBrnA', 3664),
  ('U4N_zyO5sts', 3665),
  ('zlzR3AOhCmg', 3666),
  ('gyTcDLtuYT4', 3667),
  ('9W9d0LAI380', 3668),
  ('9AiO8pxRC8E', 3669),
  ('BS6EY0HzKvI', 3670),
  ('YAtgKpugpQ4', 3671),
  ('Tvd4aHVyUwo', 3672),
  ('kbwuCugRFB0', 3673),
  ('Q8V0FcbG0ik', 3674)
) AS v(video_id, position)
JOIN public.playback_sources ps ON ps.provider = 'youtube' AND ps.provider_item_id = v.video_id AND ps.is_active
ON CONFLICT (curated_set_id, position) DO UPDATE SET
  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT 'd425495b-9938-4a13-a9f0-6014cc3a611d'::uuid, ps.track_id, v.position, 'all'
FROM (VALUES
  ('mClF6mJV5xM', 1),
  ('4dvPgVeKgbc', 2),
  ('YEp76bA-6rA', 3),
  ('4z-oDk1utVo', 4),
  ('YALvuUpY_b0', 5),
  ('qnQCd_nZn_g', 6),
  ('_9FyH8PmRSU', 7),
  ('dNvqJIeHPis', 8),
  ('Z0VbANbyH2o', 9),
  ('gDonh4XgrdA', 10),
  ('sFFEvhlJP6Q', 11),
  ('eesw_fW7bt0', 12),
  ('9Z0jxv-QMS0', 13),
  ('tYdPptlvZPo', 14),
  ('2aLO6Ecof4s', 15),
  ('n6N1_sxlBU8', 16),
  ('PlgJGC7-cNs', 17),
  ('iFLuvFiCwJE', 18),
  ('uySQog3MjWE', 19),
  ('XFOVXD1qttc', 20),
  ('8_riOFhwAw4', 21),
  ('UO8D53fjxqk', 22),
  ('ejDDk5n7AbM', 23),
  ('4mVo93E9wpU', 24),
  ('PmRkeYVU1BE', 25)
) AS v(video_id, position)
JOIN public.playback_sources ps ON ps.provider = 'youtube' AND ps.provider_item_id = v.video_id AND ps.is_active
ON CONFLICT (curated_set_id, position) DO UPDATE SET
  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT 'c44a6fb0-ae22-43fb-98b9-843472957d60'::uuid, ps.track_id, v.position, 'all'
FROM (VALUES
  ('U0qBRoeQa-g', 329),
  ('lFdSi01tpYM', 330),
  ('sWqjZpBtcxc', 331),
  ('maqLiqpClqU', 332),
  ('NzZxyWr9OA4', 333),
  ('uIOrAkrjwp4', 334),
  ('sBFKHnNp-8c', 335),
  ('xvevXfFGPFY', 336),
  ('c_K2sf6QWFY', 337),
  ('HubRXgH0Erc', 338),
  ('vYGPudMvxvI', 339),
  ('_wDJTSfB4bQ', 340),
  ('L3gOr6vwSjg', 341),
  ('00V7IokvbTA', 342),
  ('GBRifFvAJX8', 343),
  ('HIr_kpG4Fnc', 344),
  ('Gg9ZUppafLo', 345),
  ('qSAVrkUsI6o', 346),
  ('OsBqRHx2JAA', 347),
  ('ieu6xnwJxdA', 348),
  ('5c5u3JRm_lA', 349),
  ('MB6jaF_iAnc', 350),
  ('fa5Yzxdh8e4', 351),
  ('tPNwGuu_rQ4', 352),
  ('KC-DuX51NY0', 353)
) AS v(video_id, position)
JOIN public.playback_sources ps ON ps.provider = 'youtube' AND ps.provider_item_id = v.video_id AND ps.is_active
ON CONFLICT (curated_set_id, position) DO UPDATE SET
  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT '359d7737-e012-4f5d-aec0-b0c3fc1faafb'::uuid, ps.track_id, v.position, 'all'
FROM (VALUES
  ('odrhc32fiLo', 1),
  ('V0TejHIZLV8', 2),
  ('eAXSrnHDlfQ', 3),
  ('qq-_7Q6zq80', 4),
  ('oPlHNekNTtI', 5),
  ('dIolaq-Cd9E', 6),
  ('p0FY8rRrZ6Y', 7),
  ('GMLFuNHHB6s', 8),
  ('EYE61OWUUm8', 9),
  ('wJ2by202hDI', 10),
  ('HKN3RkwGEaY', 11),
  ('JVVs-qR7IrU', 12),
  ('iWgT21xoJtY', 13),
  ('1V6p1gDsBW4', 14),
  ('-7iWJUOfS8Y', 15),
  ('QSv4VZvTUGg', 16),
  ('55Ya9kZ5iFs', 17),
  ('41FWDaUFzDY', 18),
  ('oqUdGfzKHe8', 19),
  ('wURInzaTetM', 20),
  ('9Eg4d56rt-U', 21),
  ('wBKOlVvVQs0', 22),
  ('RVeLrwoB_xw', 23),
  ('BQJVOJUPJ30', 24),
  ('EjSIjGhTEFE', 25)
) AS v(video_id, position)
JOIN public.playback_sources ps ON ps.provider = 'youtube' AND ps.provider_item_id = v.video_id AND ps.is_active
ON CONFLICT (curated_set_id, position) DO UPDATE SET
  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT 'd2d4c91e-5ac6-4bfd-bcba-299e60546b1f'::uuid, ps.track_id, v.position, 'all'
FROM (VALUES
  ('YALvuUpY_b0', 219),
  ('9a26mBBK4jE', 220),
  ('l2hvSNbg_f0', 221),
  ('H2f7MZaw3Yo', 222),
  ('HexFqifusOk', 223),
  ('4tYktXxNspo', 224),
  ('atVof3pjT-I', 225),
  ('Z0VbANbyH2o', 226),
  ('I94fhjQ-U30', 227),
  ('9Cp-hNvSWZs', 228),
  ('LQzByGZHiQ8', 229),
  ('8PEqEh1lnNE', 230),
  ('82P9aa28DoE', 231),
  ('Mc1MZkvMvCk', 232),
  ('SMlGGRAB3Hc', 233),
  ('gvyUuxdRdR4', 234),
  ('FA_J8XwpCaQ', 235),
  ('pqBKTLnowdM', 236),
  ('ii9KLQoV78I', 237),
  ('r6yFwzExp0w', 238),
  ('64lEY8jj4RA', 239),
  ('2CAiycLVy7s', 240),
  ('R_T2uJX2r8A', 241),
  ('oOvSWET7xSA', 242),
  ('8ZLFwzPPk7Q', 243)
) AS v(video_id, position)
JOIN public.playback_sources ps ON ps.provider = 'youtube' AND ps.provider_item_id = v.video_id AND ps.is_active
ON CONFLICT (curated_set_id, position) DO UPDATE SET
  track_id = EXCLUDED.track_id, daypart_tag = EXCLUDED.daypart_tag;

DO $$
DECLARE
  v_expected record;
  v_actual integer;
BEGIN
  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 10 THEN
    RAISE EXCEPTION 'staging changed the live scene count';
  END IF;
  IF (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN
    RAISE EXCEPTION 'staging changed the active set count';
  END IF;
  IF (SELECT count(*) FROM public.scenes WHERE slug IN ('bus-driver', 'bartan-time', 'papa-ke-gaane') AND NOT is_live) <> 3 THEN
    RAISE EXCEPTION 'expected three hidden staged scenes';
  END IF;
  FOR v_expected IN SELECT * FROM (VALUES
    ('8f382722-007c-481f-9b61-82332ee7aae8'::uuid, 'deluxe-salon', 67),
    ('bb2cbc33-29d6-4945-ac7a-164ed1f49c8f'::uuid, 'bus-driver', 25),
    ('fe42b40e-6b02-4b60-9ccb-06b1a7e1649d'::uuid, 'bhojpuri-bangers', 3674),
    ('d425495b-9938-4a13-a9f0-6014cc3a611d'::uuid, 'bartan-time', 25),
    ('c44a6fb0-ae22-43fb-98b9-843472957d60'::uuid, 'raju-mistri', 353),
    ('359d7737-e012-4f5d-aec0-b0c3fc1faafb'::uuid, 'papa-ke-gaane', 25),
    ('d2d4c91e-5ac6-4bfd-bcba-299e60546b1f'::uuid, 'corporate-majdoor', 243)
  ) AS expected(set_id, slug, membership_count) LOOP
    SELECT count(*) INTO v_actual FROM public.curated_set_tracks WHERE curated_set_id = v_expected.set_id;
    IF v_actual <> v_expected.membership_count THEN
      RAISE EXCEPTION 'staged count failed for %: expected %, found %', v_expected.slug, v_expected.membership_count, v_actual;
    END IF;
    IF (SELECT is_active FROM public.curated_sets WHERE id = v_expected.set_id) THEN
      RAISE EXCEPTION 'staged set unexpectedly active: %', v_expected.slug;
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM public.curated_set_tracks cst
    LEFT JOIN public.playback_sources ps ON ps.track_id = cst.track_id AND ps.is_active
    WHERE cst.curated_set_id IN ('8f382722-007c-481f-9b61-82332ee7aae8'::uuid, 'bb2cbc33-29d6-4945-ac7a-164ed1f49c8f'::uuid, 'fe42b40e-6b02-4b60-9ccb-06b1a7e1649d'::uuid, 'd425495b-9938-4a13-a9f0-6014cc3a611d'::uuid, 'c44a6fb0-ae22-43fb-98b9-843472957d60'::uuid, '359d7737-e012-4f5d-aec0-b0c3fc1faafb'::uuid, 'd2d4c91e-5ac6-4bfd-bcba-299e60546b1f'::uuid)
      AND ps.id IS NULL
  ) THEN
    RAISE EXCEPTION 'staged membership without an active playback source';
  END IF;
END $$;
