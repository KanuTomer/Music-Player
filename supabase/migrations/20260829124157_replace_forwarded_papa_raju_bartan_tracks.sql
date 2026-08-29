-- Replace Papa Ke Gaane, Raju Mistri, and Bartan Time staged queues with team-forwarded sources.
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$ BEGIN
  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 10 OR (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN RAISE EXCEPTION 'production catalogue baseline changed'; END IF;
  IF (SELECT count(*) FROM public.curated_sets WHERE NOT is_active) <> 7 THEN RAISE EXCEPTION 'expected seven inactive target sets'; END IF;
  IF EXISTS (SELECT 1 FROM public.curated_sets cs LEFT JOIN public.curated_set_tracks cst ON cst.curated_set_id=cs.id WHERE NOT cs.is_active GROUP BY cs.id HAVING count(cst.id)<>25) THEN RAISE EXCEPTION 'expected 25 tracks in every staged set'; END IF;
END $$;

CREATE TEMP TABLE stale_forwarded_track_candidates(id uuid PRIMARY KEY) ON COMMIT DROP;
INSERT INTO stale_forwarded_track_candidates(id)
SELECT DISTINCT cst.track_id FROM public.curated_set_tracks cst JOIN public.curated_sets cs ON cs.id=cst.curated_set_id JOIN public.scenes s ON s.id=cs.scene_id
WHERE NOT cs.is_active AND s.slug IN ('papa-ke-gaane', 'raj-mistri', 'bartan-time');

INSERT INTO public.tracks(catalogue_key, scene_id, title, artist, year, daypart_tag, sort_order) VALUES
  ('youtube:SEO4Afg7lKY', NULL, 'Pardesi Pardesi', 'Udit Narayan, Alka Yagnik, Sapna Awasthi', NULL, 'all', 0),
  ('youtube:T7IZuj5fvYM', NULL, 'Is Tarah Aashiqui Ka', 'Kumar Sanu', NULL, 'all', 0),
  ('youtube:DLYp9GWowYQ', NULL, 'Is Pyar Se Meri Taraf Na Dekho', 'Kumar Sanu, Alka Yagnik', NULL, 'all', 0),
  ('youtube:AQ2r7XOTnyI', NULL, 'Chand Se Parda Kijiye', 'Kumar Sanu', NULL, 'all', 0),
  ('youtube:jO7KrjYBHiY', NULL, 'Tu Pyar Hai Kisi Aur Ka', 'Kumar Sanu, Anuradha Paudwal', NULL, 'all', 0),
  ('youtube:BMXRic0byxE', NULL, 'Hamen Tumse Pyar Kitna', 'Kishore Kumar', NULL, 'all', 0),
  ('youtube:GGn2N0KZGsI', NULL, 'Dilbar Dilbar', 'Alka Yagnik', NULL, 'all', 0),
  ('youtube:q_MxDz18l4I', NULL, 'Janu Meri Jaan', 'Mohammed Rafi, Kishore Kumar, Asha Bhosle, Usha Mangeshkar', NULL, 'all', 0),
  ('youtube:hD0vuSJxzmc', NULL, 'Inteha Ho Gai', 'Kishore Kumar, Asha Bhosle', NULL, 'all', 0),
  ('youtube:hh7Ps61ws5Q', NULL, 'Wada Karo', 'Kishore Kumar, Lata Mangeshkar', NULL, 'all', 0),
  ('youtube:S9SjRIkexoM', NULL, 'Main Tere Pyar Mein Pagal', 'Lata Mangeshkar, Kishore Kumar', NULL, 'all', 0),
  ('youtube:E2WqfG8OBds', NULL, 'Thodi Si Beqarari', 'Alka Yagnik, Kumar Sanu', NULL, 'all', 0),
  ('youtube:zWPsjhBaRb0', NULL, 'Humko Humise Chura Lo', 'Lata Mangeshkar, Udit Narayan', NULL, 'all', 0),
  ('youtube:1cWR8QVhJLE', NULL, 'Zinda Rehti Hain Mohabbatein', 'Lata Mangeshkar, Udit Narayan', NULL, 'all', 0),
  ('youtube:8cwuAsz5qo4', NULL, 'Hadh Kar Di Aapne', 'Udit Narayan, Kavita Krishnamurthy', NULL, 'all', 0),
  ('youtube:6_p1jrZU10k', NULL, 'O Phirkiwali', 'Mohammed Rafi', NULL, 'all', 0),
  ('youtube:DvU57seTCZI', NULL, 'Teri Galiyon Mein', 'Mohammed Rafi', NULL, 'all', 0),
  ('youtube:e9_Jf2BfrsY', NULL, 'Akele Hain Chale Aao', 'Mohammed Rafi', NULL, 'all', 0),
  ('youtube:AQSRq6eGWp0', NULL, 'Raah Mein Unse Mulaqat', 'Kumar Sanu, Alka Yagnik', NULL, 'all', 0),
  ('youtube:tIALY5lEzfA', NULL, 'Na Kajre Ki Dhar', 'Pankaj Udhas, Sadhana Sargam', NULL, 'all', 0),
  ('youtube:3Z_x7vBqr6E', NULL, 'Tum Dil Ki Dhadkan Mein', 'Abhijeet Bhattacharya, Alka Yagnik', NULL, 'all', 0),
  ('youtube:Xuq6a29AVxM', NULL, 'Baazigar O Baazigar', 'Kumar Sanu, Alka Yagnik', NULL, 'all', 0),
  ('youtube:UxLj89bUflc', NULL, 'Waada Raha Sanam', 'Abhijeet Bhattacharya, Alka Yagnik', NULL, 'all', 0),
  ('youtube:ioWh9vMixyw', NULL, 'Tu Shayar Hai Main Teri Shayari', 'Alka Yagnik', NULL, 'all', 0),
  ('youtube:pn8L64hTXB4', NULL, 'Jo Bhi Kasmein', 'Udit Narayan, Alka Yagnik', NULL, 'all', 0),
  ('youtube:LvqEcIAsh5k', NULL, 'Mujhe Neend Na Aaye', 'Udit Narayan, Anuradha Paudwal', NULL, 'all', 0),
  ('youtube:IhKXq5dhTag', NULL, 'Yeh Kaali Kaali Aankhen', 'Kumar Sanu, Anu Malik', NULL, 'all', 0),
  ('youtube:rG_ky9Mc_4Q', NULL, 'Mohabbat Ki Nahi Jati', 'Udit Narayan, Sadhana Sargam', NULL, 'all', 0),
  ('youtube:doeVBPCylmg', NULL, 'Kitna Haseen Chehra', 'Kumar Sanu', NULL, 'all', 0),
  ('youtube:FPjmi3Q6aho', NULL, 'Teri Umeed Tera Intezaar', 'Kumar Sanu, Sadhana Sargam', NULL, 'all', 0),
  ('youtube:YjJAJEw_duM', NULL, 'Tumhein Apna Banane Ki Kasam', 'Kumar Sanu, Anuradha Paudwal', NULL, 'all', 0),
  ('youtube:9f6GhUb-WdM', NULL, 'Dil Cheer Ke Dekh', 'Kumar Sanu', NULL, 'all', 0),
  ('youtube:DH_XHR09jxY', NULL, 'Hum Yaar Hain Tumhare', 'Alka Yagnik, Udit Narayan', NULL, 'all', 0),
  ('youtube:6x_aBA3trGQ', NULL, 'Mubarak Ho Tumko Yeh Shaadi Tumhari', 'Udit Narayan', NULL, 'all', 0),
  ('youtube:gE3XkDXpB74', NULL, 'Udi Udi Jaye', 'Sukhwinder Singh, Bhoomi Trivedi, Karsan Sagathia', NULL, 'all', 0),
  ('youtube:fqP5pTPvqZ8', NULL, 'Rangtaari', 'Dev Negi, Yo Yo Honey Singh', NULL, 'all', 0),
  ('youtube:UaHLcQFlhrc', NULL, 'Dandiya Mashup (Param Sundari x Nadiyon Paar)', 'DJ Lijo', NULL, 'all', 0),
  ('youtube:ey0ktniv8bs', NULL, 'Bhammariyo', 'Shruti Pathak, Divya Kumar', 2021, 'all', 0),
  ('youtube:dh1_OPW9xl8', NULL, 'Jhume Re Gori', 'Archana Gore, Tarannum Malik Jain, Dipti Rege, Aditi Prabhudesai', NULL, 'all', 0),
  ('youtube:Z6Fr5hMvjtA', NULL, 'Ghoonghat Mein Chand Hoga', 'Kumar Sanu, Kavita Krishnamurthy', NULL, 'all', 0),
  ('youtube:FyOwgSvKnKU', NULL, 'Bani Bani', 'K. S. Chithra', NULL, 'all', 0),
  ('youtube:_4fdo3Y5_6g', NULL, 'Chunari Chunari', 'Abhijeet Bhattacharya, Anuradha Sriram', NULL, 'all', 0),
  ('youtube:h6mK-OJ5YRo', NULL, 'Khallas', 'Asha Bhosle, Sapna Awasthi, Sudesh Bhosle', NULL, 'all', 0),
  ('youtube:I0VB0c90NFc', NULL, 'Nakhrewali', 'Prashant Nakti, Sonali Sonawane, Rohit Raut', 2024, 'all', 0),
  ('youtube:SE7mK-52KC0', NULL, 'Dekhha Tenu', 'Mohammad Faiz', 2024, 'all', 0),
  ('youtube:uKHlnmepnNA', NULL, 'Nayan', 'Dhvani Bhanushali, Jubin Nautiyal', NULL, 'all', 0),
  ('youtube:8zkUFoXku0Y', NULL, 'Tainu Khabar Nahi', 'Arijit Singh', 2024, 'all', 0),
  ('youtube:YqaJrE7Di_s', NULL, 'Teri Aankhon Mein', 'Darshan Raval, Neha Kakkar', 2020, 'all', 0),
  ('youtube:BddP6PYo2gs', NULL, 'Kesariya', 'Arijit Singh', 2022, 'all', 0),
  ('youtube:uucoiREuIy4', NULL, 'Saawariya', 'Kumar Sanu, Aastha Gill', 2021, 'all', 0),
  ('youtube:niy16TKkMTA', NULL, 'Sukh Kalale', 'Shreya Ghoshal', 2022, 'all', 0),
  ('youtube:KUpwupYj_tY', NULL, 'Tere Hawaale', 'Arijit Singh, Shilpa Rao', NULL, 'all', 0)
ON CONFLICT (catalogue_key) DO UPDATE SET title=EXCLUDED.title, artist=EXCLUDED.artist, year=COALESCE(EXCLUDED.year, public.tracks.year);

INSERT INTO public.playback_sources(track_id, provider, provider_item_id, source_url, provider_title, provider_channel, priority, validated_at, is_active)
SELECT t.id, 'youtube', v.video_id, 'https://www.youtube.com/watch?v=' || v.video_id, v.provider_title, v.provider_channel, 0, '2026-08-29T12:40:00Z'::timestamptz, true FROM (VALUES
  ('SEO4Afg7lKY', 'Pardesi Pardesi Full Video - Raja Hindustani | Aamir Khan,Karisma Kapoor | Udit Narayan, Alka Yagnik', 'FAMOUS MUSIC''S'),
  ('T7IZuj5fvYM', 'Is Tarah Aashiqui Ka Full Song | Imtihan | Saif Ali Khan, Raveena | Kumar Sanu | 90''s Hindi Songs', 'Tips Official'),
  ('DLYp9GWowYQ', 'Is Pyar Se Meri Taraf Na Dekho | Kumar Sanu, Alka Yagnik | Chamatkar | Shah Rukh Khan', 'Red Chillies Entertainment'),
  ('AQ2r7XOTnyI', 'Chand Se Parda Kijiye (4K) Video Song | Aao Pyaar Karen | Kumar Sanu | Saif Ali Khan & Shilpa Shetty', 'Hindi Filmi Songs'),
  ('jO7KrjYBHiY', 'Tu Pyar Hai Kisi Aur Ka | Full video in 1080P FULL HD- (Dil Hai Ke Manta Nahin) | Aamir, Pooja', 'HD MUSIC VIDEOS'),
  ('BMXRic0byxE', 'Hamen Tumse Pyar Kitna | Kudrat | Rajesh Khanna,Hema Malini | Kishore Kumar', 'Shemaroo Filmi Gaane'),
  ('GGn2N0KZGsI', 'Dilbar Dilbar - Sirf Tum (1999) HD Music Video', 'Backer .K'),
  ('q_MxDz18l4I', 'Janu Meri Jaan | Shaan | Amitabh Bachchan | Parveen Babi | Kishore Kumar | Mohd Rafi | HD', 'NH Hindi Songs'),
  ('hD0vuSJxzmc', 'Intaha Ho Gai Intezar Ki - Audio | Sharaabi | Amitabh Bachchan, Jaya P, Asha Bhosle, Kishore Kumar', 'Old Hindi Songs'),
  ('hh7Ps61ws5Q', 'Wada Karo Nahin Chodoge Full Song With Lyrics| Kishore Kumar, Lata Mangeshkar| Aa Gale Lag Jaa Songs', 'Goldmines Gaane Sune Ansune'),
  ('S9SjRIkexoM', 'Main Tere Pyar Mein Pagal | Lata Mangeshkar, Kishore Kumar | Prem Bandhan 1979 Songs | Rajesh Khanna', 'Goldmines Gaane Sune Ansune'),
  ('E2WqfG8OBds', 'Thodi Si Bekarari 4K Video Song | Chal Mere Bhai | Salman Khan, Karishma Kapoor | Alka Yagnik, Kumar', 'BollyHD 1080p Music'),
  ('zWPsjhBaRb0', 'Humko Humise Chura Lo Song | Mohabbatein | Shah Rukh Khan, Aishwarya Rai | Lata Mangeshkar, Udit N', 'YRF'),
  ('1cWR8QVhJLE', 'Zinda Rehti Hain Mohabbatein Song | Mohabbatein | Shah Rukh Khan, Aishwarya Rai | Lata Mangeshkar', 'YRF'),
  ('8cwuAsz5qo4', 'Hadh Kardi Aapne - Title Track | Udit Narayan | Kavita Krishnamurthy | Govinda | Rani Mukherjee', 'T-Series Bollywood Classics'),
  ('6_p1jrZU10k', 'O Phirkiwali 4K Raja Aur Runk (1968) | Mohammed Rafi | Sanjeev Kumar, KumKum', 'SuperHit Gaane'),
  ('DvU57seTCZI', 'Full Video: Teri Galiyon Mein Na Rakhenge Kadam | Hawas (1974) | Neetu Singh,Anil Dhawan | Mohd Rafi', 'Dard Bhare Gaane'),
  ('e9_Jf2BfrsY', 'Akele Hain Chale Aao (HD) | Raaz (1967) | Rajesh Khanna, Babita | Mohammed Rafi | Old Romantic Songs', 'Shemaroo Filmi Gaane'),
  ('AQSRq6eGWp0', 'Raah Mein Unse Mulaqat Ho Gayi | Ajay Devgn, Tabu | Kumar Sanu, Alka Yagnik | Vijaypath (1994)', 'Hot Hits Hindi'),
  ('tIALY5lEzfA', 'Na Kajre Ki Dhar - Video Song | Mohra | Sunil Shetty | Sadhana Sargam | Pankaj Udhas | 90''s Songs', '90s Hindi Songs'),
  ('3Z_x7vBqr6E', 'Tum Dil Ki Dhadkan Mein - 4K Romantic Video | Dhadkan | Suniel Shetty & Shilpa Shetty', 'Ishtar Music'),
  ('Xuq6a29AVxM', 'Baazigar O Baazigar HD Video | Shahrukh Khan , Kajol | Kumar Sanu , Alka Yagnik | 90s Songs', 'Abhijeet Bharti'),
  ('UxLj89bUflc', 'Waada Raha Sanam Lyrical Video Song | Khiladi | Akshay Kumar & Ayesha Jhulka', 'Ishtar Music'),
  ('ioWh9vMixyw', 'Tu Shayar Hai Main Teri Shayari | Saajan | Lyrical Video | Alka Yagnik | Sanjay | Madhuri | Salman', 'Ishtar Music'),
  ('pn8L64hTXB4', 'Jo Bhi Kasmein Full Video - Raaz | Bipasha Basu & Dino Morea | Udit Narayan & Alka Yagnik', 'Best Of Alka Yagnik'),
  ('LvqEcIAsh5k', 'Mujhe Neend Na Aaye - Video Song | Udit Narayan, Anuradha Paudwal | Dil | Amir Khan, Madhuri Dixit', 'T-Series Bollywood Classics'),
  ('IhKXq5dhTag', 'Yeh Kaali Kaali Aankhen | Baazigar | Shahrukh Khan & Kajol | HD VIDEO | 90''s Song', 'Ishtar Music'),
  ('rG_ky9Mc_4Q', 'Mohabbat Ki Nahi Jati | Udit Narayan | Sadhana Sargam | Hero No.1 | 1997', 'Gaane Filmi'),
  ('doeVBPCylmg', 'Kitna Haseen Chehra [Full Video Song] (HQ) With Lyrics - Dilwale', 'bollysongs4video'),
  ('FPjmi3Q6aho', 'Teri Umeed Tera Intezaar - Deewana - Rishi Kapoor - Divya Bharti superhit', 'Gaana Khazana'),
  ('YjJAJEw_duM', 'Tumhein Apna Banane Ki Kasam Khai Hai - Sadak [FHD]', 'BondTune Hindi'),
  ('9f6GhUb-WdM', 'Dil Cheer Ke Dekh | Divya Bharti | Kamal Sadanah | Kumar Sanu | Rang Movie | 90''s Romantic Song', 'Tips Official'),
  ('DH_XHR09jxY', 'Full Video: Hum Yaar Hain Tumhare | Haan Maine Bhi Pyar Kiya | Karisma Kapoor, Abhishek Bachchan', '90s Hindi Songs'),
  ('6x_aBA3trGQ', 'Mubarak Ho Tumko Ye Shadi Tumhari | Udit Narayan | Haan Maine Bhi Pyaar Kiya(2002) | Karisma, Akshay', 'Shemaroo Filmi Gaane'),
  ('gE3XkDXpB74', 'Udi Udi Jaye - Full Video | Raees | Shah Rukh Khan | Ram Sampath', 'Zee Music Company'),
  ('fqP5pTPvqZ8', 'Rangtaari Full Video | Loveyatri | Aayush Sharma | Warina Hussain |Yo Yo Honey Singh |Tanishk Bagchi', 'T-Series'),
  ('UaHLcQFlhrc', 'Dandiya Mashup - Param Sundari x Nadiyon Paar | DJ Lijo | Janhvi Kapoor | Kriti Sanon | Roohi | Mimi', 'Sony Music India'),
  ('ey0ktniv8bs', 'Bhammariyo | Shruti Pathak | Divya Kumar | Priya Saraiya | Artiste First', 'Artiste First'),
  ('dh1_OPW9xl8', 'Jhume Re Gori | Full Music Video | Gangubai Kathiawadi | Alia Bhatt | Sanjay Leela Bhansali', 'Saregama Music'),
  ('Z6Fr5hMvjtA', 'Ghoonghat Mein Chand Hoga-Khoobsurat 1999 HD Video Song, Sanjay Dutt, Urmila Matondkar', 'Indian Music HD'),
  ('FyOwgSvKnKU', 'Bani Bani - Main Prem Ki Diwani Hoon - Kareena Kapoor, Hrithik Roshan & Abhishek Bachchan', 'Rajshri'),
  ('_4fdo3Y5_6g', 'Aaja Na Chhu Le Meri Chunari Sanam (Chunnari Chunnari) | Biwi No.1 | Abhijeet B | Anuradha', '90''s Dard - Bollywood Songs'),
  ('h6mK-OJ5YRo', 'Khallas Song Lyrical Video | Company | Ajay Devgan, Ishsha Koppikar, Vivek Oberoi', 'T-Series Bollywood Classics'),
  ('I0VB0c90NFc', 'Nakhrewali', 'Prashant Nakti Official'),
  ('SE7mK-52KC0', 'Dekhha Tenu (From "Mr. And Mrs. Mahi")', 'Mohammad Faiz'),
  ('uKHlnmepnNA', 'Nayan Video Song | Dhvani B Jubin N | Lijo G Dj Chetas Manoj M Manhar U | Radhika Vinay | Bhushan K', 'T-Series'),
  ('8zkUFoXku0Y', 'Tainu Khabar Nahi (From "Munjya")', 'Sachin Jigar'),
  ('YqaJrE7Di_s', 'Teri Aankhon Mein Dikhta Jo Pyaar Mujhe - Full Video Song | Neha Kakkar & Darshan Raval | Divya K', 'Indian Vibe'),
  ('BddP6PYo2gs', 'Kesariya - Brahmastra | Ranbir Kapoor, Alia Bhatt | Pritam | Arijit Singh | Amitabh Bhattacharya | 4K', 'Sony Music India'),
  ('uucoiREuIy4', 'Kumar Sanu & Aastha Gill: Saawariya | Arjun Bijlani | Official Video | Latest Dance Song 2021', 'Sony Music India'),
  ('niy16TKkMTA', 'Sukh Kalale', 'Ajay Gogavale - Topic'),
  ('KUpwupYj_tY', 'Tere Hawaale (Full Video) Laal Singh Chaddha | Aamir,Kareena | Arijit,Shilpa | Pritam,Amitabh,Advait', 'T-Series')
) AS v(video_id, provider_title, provider_channel) JOIN public.tracks t ON t.catalogue_key='youtube:' || v.video_id
ON CONFLICT (provider, provider_item_id) DO UPDATE SET provider_title=EXCLUDED.provider_title, provider_channel=EXCLUDED.provider_channel, validated_at=EXCLUDED.validated_at, is_active=true;

UPDATE public.tracks t SET title=v.title, artist=v.artist, year=COALESCE(v.year, t.year) FROM public.playback_sources ps JOIN (VALUES
  ('SEO4Afg7lKY', 'Pardesi Pardesi', 'Udit Narayan, Alka Yagnik, Sapna Awasthi', NULL),
  ('T7IZuj5fvYM', 'Is Tarah Aashiqui Ka', 'Kumar Sanu', NULL),
  ('DLYp9GWowYQ', 'Is Pyar Se Meri Taraf Na Dekho', 'Kumar Sanu, Alka Yagnik', NULL),
  ('AQ2r7XOTnyI', 'Chand Se Parda Kijiye', 'Kumar Sanu', NULL),
  ('jO7KrjYBHiY', 'Tu Pyar Hai Kisi Aur Ka', 'Kumar Sanu, Anuradha Paudwal', NULL),
  ('BMXRic0byxE', 'Hamen Tumse Pyar Kitna', 'Kishore Kumar', NULL),
  ('GGn2N0KZGsI', 'Dilbar Dilbar', 'Alka Yagnik', NULL),
  ('q_MxDz18l4I', 'Janu Meri Jaan', 'Mohammed Rafi, Kishore Kumar, Asha Bhosle, Usha Mangeshkar', NULL),
  ('hD0vuSJxzmc', 'Inteha Ho Gai', 'Kishore Kumar, Asha Bhosle', NULL),
  ('hh7Ps61ws5Q', 'Wada Karo', 'Kishore Kumar, Lata Mangeshkar', NULL),
  ('S9SjRIkexoM', 'Main Tere Pyar Mein Pagal', 'Lata Mangeshkar, Kishore Kumar', NULL),
  ('E2WqfG8OBds', 'Thodi Si Beqarari', 'Alka Yagnik, Kumar Sanu', NULL),
  ('zWPsjhBaRb0', 'Humko Humise Chura Lo', 'Lata Mangeshkar, Udit Narayan', NULL),
  ('1cWR8QVhJLE', 'Zinda Rehti Hain Mohabbatein', 'Lata Mangeshkar, Udit Narayan', NULL),
  ('8cwuAsz5qo4', 'Hadh Kar Di Aapne', 'Udit Narayan, Kavita Krishnamurthy', NULL),
  ('6_p1jrZU10k', 'O Phirkiwali', 'Mohammed Rafi', NULL),
  ('DvU57seTCZI', 'Teri Galiyon Mein', 'Mohammed Rafi', NULL),
  ('e9_Jf2BfrsY', 'Akele Hain Chale Aao', 'Mohammed Rafi', NULL),
  ('odrhc32fiLo', 'Mere Mehboob Qayamat Hogi', 'Kishore Kumar', NULL),
  ('V0TejHIZLV8', 'Pal Pal Dil Ke Paas', 'Kishore Kumar', NULL),
  ('eAXSrnHDlfQ', 'Likhe Jo Khat Tujhe', 'Mohammed Rafi', NULL),
  ('qq-_7Q6zq80', 'Ankhiyon Ke Jharokhon Se', 'Hemlata', NULL),
  ('oPlHNekNTtI', 'Dekha Ek Khwab', 'Lata Mangeshkar, Kishore Kumar', NULL),
  ('p0FY8rRrZ6Y', 'Meri Bheegi Bheegi Si', 'Kishore Kumar', NULL),
  ('GMLFuNHHB6s', 'Main Pal Do Pal Ka Shair Hoon', 'Mukesh', NULL),
  ('AQSRq6eGWp0', 'Raah Mein Unse Mulaqat', 'Kumar Sanu, Alka Yagnik', NULL),
  ('tIALY5lEzfA', 'Na Kajre Ki Dhar', 'Pankaj Udhas, Sadhana Sargam', NULL),
  ('3Z_x7vBqr6E', 'Tum Dil Ki Dhadkan Mein', 'Abhijeet Bhattacharya, Alka Yagnik', NULL),
  ('Xuq6a29AVxM', 'Baazigar O Baazigar', 'Kumar Sanu, Alka Yagnik', NULL),
  ('UxLj89bUflc', 'Waada Raha Sanam', 'Abhijeet Bhattacharya, Alka Yagnik', NULL),
  ('sWqjZpBtcxc', 'Aye Mere Humsafar', 'Udit Narayan, Alka Yagnik', NULL),
  ('ioWh9vMixyw', 'Tu Shayar Hai Main Teri Shayari', 'Alka Yagnik', NULL),
  ('pn8L64hTXB4', 'Jo Bhi Kasmein', 'Udit Narayan, Alka Yagnik', NULL),
  ('LvqEcIAsh5k', 'Mujhe Neend Na Aaye', 'Udit Narayan, Anuradha Paudwal', NULL),
  ('IhKXq5dhTag', 'Yeh Kaali Kaali Aankhen', 'Kumar Sanu, Anu Malik', NULL),
  ('rG_ky9Mc_4Q', 'Mohabbat Ki Nahi Jati', 'Udit Narayan, Sadhana Sargam', NULL),
  ('doeVBPCylmg', 'Kitna Haseen Chehra', 'Kumar Sanu', NULL),
  ('00V7IokvbTA', 'Chaaha Toh Bahut', 'Kumar Sanu, Bela Sulakhe', NULL),
  ('FPjmi3Q6aho', 'Teri Umeed Tera Intezaar', 'Kumar Sanu, Sadhana Sargam', NULL),
  ('YjJAJEw_duM', 'Tumhein Apna Banane Ki Kasam', 'Kumar Sanu, Anuradha Paudwal', NULL),
  ('9f6GhUb-WdM', 'Dil Cheer Ke Dekh', 'Kumar Sanu', NULL),
  ('DH_XHR09jxY', 'Hum Yaar Hain Tumhare', 'Alka Yagnik, Udit Narayan', NULL),
  ('6x_aBA3trGQ', 'Mubarak Ho Tumko Yeh Shaadi Tumhari', 'Udit Narayan', NULL),
  ('sBFKHnNp-8c', 'Abhi To Mohabbat Ka', 'Udit Narayan, Alka Yagnik', NULL),
  ('maqLiqpClqU', 'Woh Ladki Bohot Yaad Aati Hai', 'Kumar Sanu, Alka Yagnik', NULL),
  ('c_K2sf6QWFY', 'Mujhse Mohabbat Ka Izhar', 'Alka Yagnik, Kumar Sanu', NULL),
  ('HubRXgH0Erc', 'Tumsa Koi Pyaara', 'Kumar Sanu, Alka Yagnik', NULL),
  ('qSAVrkUsI6o', 'Lagi Aaj Sawan Ki', 'Anupama Deshpande, Suresh Wadkar', NULL),
  ('OsBqRHx2JAA', 'Chhupana Bhi Nahi Aata', 'Vinod Rathod', NULL),
  ('gE3XkDXpB74', 'Udi Udi Jaye', 'Sukhwinder Singh, Bhoomi Trivedi, Karsan Sagathia', NULL),
  ('fqP5pTPvqZ8', 'Rangtaari', 'Dev Negi, Yo Yo Honey Singh', NULL),
  ('UaHLcQFlhrc', 'Dandiya Mashup (Param Sundari x Nadiyon Paar)', 'DJ Lijo', NULL),
  ('ey0ktniv8bs', 'Bhammariyo', 'Shruti Pathak, Divya Kumar', 2021),
  ('dh1_OPW9xl8', 'Jhume Re Gori', 'Archana Gore, Tarannum Malik Jain, Dipti Rege, Aditi Prabhudesai', NULL),
  ('Z6Fr5hMvjtA', 'Ghoonghat Mein Chand Hoga', 'Kumar Sanu, Kavita Krishnamurthy', NULL),
  ('FyOwgSvKnKU', 'Bani Bani', 'K. S. Chithra', NULL),
  ('_4fdo3Y5_6g', 'Chunari Chunari', 'Abhijeet Bhattacharya, Anuradha Sriram', NULL),
  ('h6mK-OJ5YRo', 'Khallas', 'Asha Bhosle, Sapna Awasthi, Sudesh Bhosle', NULL),
  ('IJNR_UVLDhs', 'Main Nikla Gaddi Leke', 'Udit Narayan', NULL),
  ('I0VB0c90NFc', 'Nakhrewali', 'Prashant Nakti, Sonali Sonawane, Rohit Raut', 2024),
  ('SE7mK-52KC0', 'Dekhha Tenu', 'Mohammad Faiz', 2024),
  ('uKHlnmepnNA', 'Nayan', 'Dhvani Bhanushali, Jubin Nautiyal', NULL),
  ('8zkUFoXku0Y', 'Tainu Khabar Nahi', 'Arijit Singh', 2024),
  ('YqaJrE7Di_s', 'Teri Aankhon Mein', 'Darshan Raval, Neha Kakkar', 2020),
  ('BddP6PYo2gs', 'Kesariya', 'Arijit Singh', 2022),
  ('uucoiREuIy4', 'Saawariya', 'Kumar Sanu, Aastha Gill', 2021),
  ('niy16TKkMTA', 'Sukh Kalale', 'Shreya Ghoshal', 2022),
  ('KUpwupYj_tY', 'Tere Hawaale', 'Arijit Singh, Shilpa Rao', NULL),
  ('4dvPgVeKgbc', 'Show Me the Thumka', 'Sunidhi Chauhan, Shashwat Singh', NULL),
  ('YEp76bA-6rA', 'Teri Baaton Mein Aisa Uljha Jiya', 'Raghav, Tanishk Bagchi, Asees Kaur', NULL),
  ('4z-oDk1utVo', 'Lut Gaye', 'Jubin Nautiyal', NULL),
  ('YALvuUpY_b0', 'Apna Bana Le', 'Arijit Singh', NULL),
  ('qnQCd_nZn_g', 'O Maahi', 'Arijit Singh', NULL),
  ('_9FyH8PmRSU', 'Maan Meri Jaan', 'King', NULL)
) AS v(video_id, title, artist, year) ON v.video_id=ps.provider_item_id WHERE ps.track_id=t.id AND ps.provider='youtube';

DELETE FROM public.curated_set_tracks cst USING public.curated_sets cs, public.scenes s WHERE cst.curated_set_id=cs.id AND cs.scene_id=s.id AND NOT cs.is_active
  AND (s.slug, cs.origin_external_id) IN (('papa-ke-gaane', 'PL3rJgr5HfVCrov_nZV_2ltKKFGWbbjATx'), ('raj-mistri', 'PLTcrZKUys_a5zSgv_3ZHsRnTVJ05GbDvY'), ('bartan-time', 'PLc1Byv6ESHSaag4naocpjBLSjO58i9MV5'));

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT cs.id, ps.track_id, v.position, 'all' FROM public.curated_sets cs JOIN public.scenes s ON s.id=cs.scene_id JOIN (VALUES
  ('SEO4Afg7lKY', 1),
  ('T7IZuj5fvYM', 2),
  ('DLYp9GWowYQ', 3),
  ('AQ2r7XOTnyI', 4),
  ('jO7KrjYBHiY', 5),
  ('BMXRic0byxE', 6),
  ('GGn2N0KZGsI', 7),
  ('q_MxDz18l4I', 8),
  ('hD0vuSJxzmc', 9),
  ('hh7Ps61ws5Q', 10),
  ('S9SjRIkexoM', 11),
  ('E2WqfG8OBds', 12),
  ('zWPsjhBaRb0', 13),
  ('1cWR8QVhJLE', 14),
  ('8cwuAsz5qo4', 15),
  ('6_p1jrZU10k', 16),
  ('DvU57seTCZI', 17),
  ('e9_Jf2BfrsY', 18),
  ('odrhc32fiLo', 19),
  ('V0TejHIZLV8', 20),
  ('eAXSrnHDlfQ', 21),
  ('qq-_7Q6zq80', 22),
  ('oPlHNekNTtI', 23),
  ('p0FY8rRrZ6Y', 24),
  ('GMLFuNHHB6s', 25)
) AS v(video_id, position) ON true JOIN public.playback_sources ps ON ps.provider='youtube' AND ps.provider_item_id=v.video_id AND ps.is_active
WHERE NOT cs.is_active AND s.slug='papa-ke-gaane' AND cs.origin_external_id='PL3rJgr5HfVCrov_nZV_2ltKKFGWbbjATx';

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT cs.id, ps.track_id, v.position, 'all' FROM public.curated_sets cs JOIN public.scenes s ON s.id=cs.scene_id JOIN (VALUES
  ('AQSRq6eGWp0', 1),
  ('tIALY5lEzfA', 2),
  ('3Z_x7vBqr6E', 3),
  ('Xuq6a29AVxM', 4),
  ('UxLj89bUflc', 5),
  ('sWqjZpBtcxc', 6),
  ('ioWh9vMixyw', 7),
  ('pn8L64hTXB4', 8),
  ('LvqEcIAsh5k', 9),
  ('IhKXq5dhTag', 10),
  ('rG_ky9Mc_4Q', 11),
  ('doeVBPCylmg', 12),
  ('00V7IokvbTA', 13),
  ('FPjmi3Q6aho', 14),
  ('jO7KrjYBHiY', 15),
  ('YjJAJEw_duM', 16),
  ('9f6GhUb-WdM', 17),
  ('DH_XHR09jxY', 18),
  ('6x_aBA3trGQ', 19),
  ('sBFKHnNp-8c', 20),
  ('maqLiqpClqU', 21),
  ('c_K2sf6QWFY', 22),
  ('HubRXgH0Erc', 23),
  ('qSAVrkUsI6o', 24),
  ('OsBqRHx2JAA', 25)
) AS v(video_id, position) ON true JOIN public.playback_sources ps ON ps.provider='youtube' AND ps.provider_item_id=v.video_id AND ps.is_active
WHERE NOT cs.is_active AND s.slug='raj-mistri' AND cs.origin_external_id='PLTcrZKUys_a5zSgv_3ZHsRnTVJ05GbDvY';

INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag)
SELECT cs.id, ps.track_id, v.position, 'all' FROM public.curated_sets cs JOIN public.scenes s ON s.id=cs.scene_id JOIN (VALUES
  ('gE3XkDXpB74', 1),
  ('fqP5pTPvqZ8', 2),
  ('UaHLcQFlhrc', 3),
  ('ey0ktniv8bs', 4),
  ('dh1_OPW9xl8', 5),
  ('Z6Fr5hMvjtA', 6),
  ('FyOwgSvKnKU', 7),
  ('_4fdo3Y5_6g', 8),
  ('h6mK-OJ5YRo', 9),
  ('IJNR_UVLDhs', 10),
  ('I0VB0c90NFc', 11),
  ('SE7mK-52KC0', 12),
  ('uKHlnmepnNA', 13),
  ('8zkUFoXku0Y', 14),
  ('YqaJrE7Di_s', 15),
  ('BddP6PYo2gs', 16),
  ('uucoiREuIy4', 17),
  ('niy16TKkMTA', 18),
  ('KUpwupYj_tY', 19),
  ('4dvPgVeKgbc', 20),
  ('YEp76bA-6rA', 21),
  ('4z-oDk1utVo', 22),
  ('YALvuUpY_b0', 23),
  ('qnQCd_nZn_g', 24),
  ('_9FyH8PmRSU', 25)
) AS v(video_id, position) ON true JOIN public.playback_sources ps ON ps.provider='youtube' AND ps.provider_item_id=v.video_id AND ps.is_active
WHERE NOT cs.is_active AND s.slug='bartan-time' AND cs.origin_external_id='PLc1Byv6ESHSaag4naocpjBLSjO58i9MV5';

DELETE FROM public.tracks t USING stale_forwarded_track_candidates stale WHERE t.id=stale.id AND NOT EXISTS (SELECT 1 FROM public.curated_set_tracks cst WHERE cst.track_id=t.id);

DO $$ DECLARE staged_count bigint; staged_video_count bigint; replacement_counts text; BEGIN
  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 10 OR (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN RAISE EXCEPTION 'production catalogue changed'; END IF;
  SELECT string_agg(slug || ':' || memberships, ', ' ORDER BY slug) INTO replacement_counts FROM (SELECT s.slug, count(cst.id) AS memberships FROM public.curated_sets cs JOIN public.scenes s ON s.id=cs.scene_id LEFT JOIN public.curated_set_tracks cst ON cst.curated_set_id=cs.id WHERE NOT cs.is_active AND s.slug IN ('papa-ke-gaane','raj-mistri','bartan-time') GROUP BY s.slug) counts;
  IF replacement_counts <> 'bartan-time:25, papa-ke-gaane:25, raj-mistri:25' THEN RAISE EXCEPTION 'replacement queue counts: %', replacement_counts; END IF;
  SELECT count(*) INTO staged_count FROM public.curated_set_tracks cst JOIN public.curated_sets cs ON cs.id=cst.curated_set_id WHERE NOT cs.is_active;
  IF staged_count <> 175 THEN RAISE EXCEPTION 'expected 175 staged memberships, got %', staged_count; END IF;
  SELECT count(DISTINCT ps.provider_item_id) INTO staged_video_count FROM public.curated_set_tracks cst JOIN public.curated_sets cs ON cs.id=cst.curated_set_id JOIN public.playback_sources ps ON ps.track_id=cst.track_id AND ps.provider='youtube' AND ps.is_active WHERE NOT cs.is_active;
  IF staged_video_count <> 171 THEN RAISE EXCEPTION 'expected 171 staged videos, got %', staged_video_count; END IF;
  IF EXISTS (SELECT 1 FROM public.playback_sources ps JOIN public.curated_set_tracks cst ON cst.track_id=ps.track_id JOIN public.curated_sets cs ON cs.id=cst.curated_set_id WHERE NOT cs.is_active AND ps.provider_item_id IN ('fOGFyvb0RX4', '7WaUdMhy118', '-b2dfPU_tCY', 'ztLjAiErnFc', 'ZsvT3oEb9zM', 'QR90tJy7tsc', 'FSehF4cLPpU', 'ijBMsA7mq4w', '2Y8NtyTpaHk')) THEN RAISE EXCEPTION 'invalid forwarded source entered a staged queue'; END IF;
  IF EXISTS (SELECT 1 FROM public.curated_sets cs JOIN public.scenes s ON s.id=cs.scene_id LEFT JOIN public.curated_set_tracks cst ON cst.curated_set_id=cs.id WHERE NOT cs.is_active AND s.slug IN ('papa-ke-gaane','raj-mistri','bartan-time') GROUP BY cs.id HAVING count(cst.id)<>25 OR count(DISTINCT cst.track_id)<>25) THEN RAISE EXCEPTION 'replacement queue count or uniqueness failed'; END IF;
  IF EXISTS (SELECT 1 FROM public.curated_set_tracks cst JOIN public.curated_sets cs ON cs.id=cst.curated_set_id LEFT JOIN public.playback_sources ps ON ps.track_id=cst.track_id AND ps.is_active WHERE NOT cs.is_active AND ps.id IS NULL) THEN RAISE EXCEPTION 'staged membership lacks an active source'; END IF;
  IF EXISTS (SELECT 1 FROM public.tracks t JOIN public.curated_set_tracks cst ON cst.track_id=t.id JOIN public.curated_sets cs ON cs.id=cst.curated_set_id WHERE NOT cs.is_active AND t.title ~* '(official|full[ -]?(video|song)|lyrical|#[[:alnum:]])') THEN RAISE EXCEPTION 'unclean staged title remains'; END IF;
END $$;

COMMIT;
