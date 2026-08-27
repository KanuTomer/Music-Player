
-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  region_pref TEXT,
  lang_pref TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- sponsors
CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  brand_palette JSONB DEFAULT '{}'::jsonb,
  campaign_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sponsors TO anon, authenticated;
GRANT ALL ON public.sponsors TO service_role;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sponsors public read" ON public.sponsors FOR SELECT TO anon, authenticated USING (true);

-- scenes
CREATE TABLE public.scenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title_en TEXT NOT NULL,
  title_hi TEXT NOT NULL,
  hook TEXT NOT NULL,
  description TEXT,
  region TEXT,
  category TEXT NOT NULL DEFAULT 'tier1',
  palette JSONB NOT NULL DEFAULT '{}'::jsonb,
  art_key TEXT NOT NULL,
  is_dark BOOLEAN NOT NULL DEFAULT false,
  is_live BOOLEAN NOT NULL DEFAULT true,
  sponsor_id UUID REFERENCES public.sponsors(id) ON DELETE SET NULL,
  chat_mode TEXT NOT NULL DEFAULT 'open',
  gag_label TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scenes TO anon, authenticated;
GRANT ALL ON public.scenes TO service_role;
ALTER TABLE public.scenes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scenes public read" ON public.scenes FOR SELECT TO anon, authenticated USING (is_live = true);

-- tracks
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  year INT,
  youtube_id TEXT,
  search_query TEXT,
  spotify_url TEXT,
  ytmusic_url TEXT,
  daypart_tag TEXT NOT NULL DEFAULT 'all',
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.tracks TO anon, authenticated;
GRANT ALL ON public.tracks TO service_role;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracks public read" ON public.tracks FOR SELECT TO anon, authenticated USING (true);

-- oneliners
CREATE TABLE public.oneliners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  text_en TEXT NOT NULL,
  text_hi TEXT,
  daypart_tag TEXT NOT NULL DEFAULT 'all',
  weight INT NOT NULL DEFAULT 1
);
GRANT SELECT ON public.oneliners TO anon, authenticated;
GRANT ALL ON public.oneliners TO service_role;
ALTER TABLE public.oneliners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oneliners public read" ON public.oneliners FOR SELECT TO anon, authenticated USING (true);

-- sound stems
CREATE TABLE public.sound_stems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_hi TEXT,
  synth_key TEXT NOT NULL DEFAULT 'noise',
  loop_url TEXT,
  default_volume NUMERIC NOT NULL DEFAULT 0.4,
  category TEXT NOT NULL DEFAULT 'ambient'
);
GRANT SELECT ON public.sound_stems TO anon, authenticated;
GRANT ALL ON public.sound_stems TO service_role;
ALTER TABLE public.sound_stems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stems public read" ON public.sound_stems FOR SELECT TO anon, authenticated USING (true);

-- generated rooms
CREATE TABLE public.generated_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permalink_slug TEXT NOT NULL UNIQUE,
  prompt TEXT NOT NULL,
  creator_user_id UUID,
  title_en TEXT NOT NULL,
  title_hi TEXT,
  hook TEXT,
  palette JSONB NOT NULL DEFAULT '{}'::jsonb,
  art_url TEXT,
  playlist JSONB NOT NULL DEFAULT '[]'::jsonb,
  oneliners JSONB NOT NULL DEFAULT '[]'::jsonb,
  remix_of UUID REFERENCES public.generated_rooms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.generated_rooms TO anon, authenticated;
GRANT INSERT ON public.generated_rooms TO anon, authenticated;
GRANT ALL ON public.generated_rooms TO service_role;
ALTER TABLE public.generated_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "generated rooms public read" ON public.generated_rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anyone can create generated rooms" ON public.generated_rooms FOR INSERT TO anon, authenticated WITH CHECK (true);

-- saved rooms
CREATE TABLE public.saved_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scene_id UUID REFERENCES public.scenes(id) ON DELETE CASCADE,
  generated_room_id UUID REFERENCES public.generated_rooms(id) ON DELETE CASCADE,
  label TEXT,
  custom_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_rooms TO authenticated;
GRANT ALL ON public.saved_rooms TO service_role;
ALTER TABLE public.saved_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved rooms" ON public.saved_rooms FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ephemeral chat
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_key TEXT NOT NULL,
  session_display_name TEXT NOT NULL,
  text TEXT NOT NULL,
  is_ai_host BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '45 minutes'
);
CREATE INDEX chat_messages_room_idx ON public.chat_messages (room_key, created_at DESC);
GRANT SELECT, INSERT ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat read live" ON public.chat_messages FOR SELECT TO anon, authenticated USING (expires_at > now());
CREATE POLICY "chat insert" ON public.chat_messages FOR INSERT TO anon, authenticated WITH CHECK (char_length(text) BETWEEN 1 AND 300 AND is_ai_host = false);

-- reactions
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_key TEXT NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reactions TO anon, authenticated;
GRANT ALL ON public.reactions TO service_role;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions read" ON public.reactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reactions insert" ON public.reactions FOR INSERT TO anon, authenticated WITH CHECK (char_length(emoji) <= 8);

ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;

-- ============ SEED ============
INSERT INTO public.scenes (slug, title_en, title_hi, hook, description, region, category, palette, art_key, is_dark, chat_mode, gag_label, sort_order) VALUES
('rail-yatra','Rail Yatra','रेल यात्रा','Platform 3, chai in a kulhad, train five hours late.','A small-town railway platform at dusk — announcements, chai, and the long wait.','North India','tier1','{"accent":"#E5A100","accent2":"#C1440E","cool":"#0E5E63"}','rail-yatra',false,'open','Announcement 📢',1),
('nai-ki-dukaan','Nai ki Dukaan','नाई की दुकान','Mirror, matchbox radio, and unsolicited life advice.','A 90s small-town barbershop with film posters and a lazy ceiling fan.','North India','tier1','{"accent":"#E5A100","accent2":"#C1440E","cool":"#0E5E63"}','barbershop',false,'open','Scissors ✂️',2),
('raat-ki-bus','Raat ki Bus','रात की बस','Headlights, curtains, and everyone asleep but you.','An overnight state-transport bus humming through the highway dark.','Pan India','tier1','{"accent":"#E5A100","accent2":"#C1440E","cool":"#2B2118"}','night-bus',true,'open','Horn 📯',3),
('sarkari-daftar','Sarkari Daftar','सरकारी दफ़्तर','File dabi hai, sahab lunch pe hain.','A government office of red-string files, rubber stamps and infinite patience.','North India','tier1','{"accent":"#E5A100","accent2":"#0E5E63","cool":"#0E5E63"}','sarkari-daftar',false,'open','Stamp 🖲️',4),
('doordarshan-shaam','Doordarshan Shaam','दूरदर्शन शाम','Rukavat ke liye khed hai.','1987 living room, CRT glow, national broadcast evening.','Pan India','tier1','{"accent":"#E5A100","accent2":"#C1440E","cool":"#0E5E63"}','doordarshan',false,'open','Signal 📺',5),
('chaya-kada','Chaya Kada','चाय കട','Brass kettle, banana fritters, monsoon outside.','A Kerala tea shop where the newspaper is read aloud.','Kerala','regional','{"accent":"#E5A100","accent2":"#0E5E63","cool":"#0E5E63"}','chaya-kada',false,'open','Kettle 🫖',6),
('para-adda','Para Adda','পাড়া আড্ডা','Rowak, bhaar-er cha, arguments that never end.','A Kolkata neighbourhood corner mid-adda.','West Bengal','regional','{"accent":"#E5A100","accent2":"#C1440E","cool":"#0E5E63"}','para-adda',false,'open','Tram 🚋',7),
('highway-dhaba','Highway Dhaba','ਹਾਈਵੇ ਢਾਬਾ','Charpai, tandoor fire, truck horns at 2am.','A Punjabi highway dhaba deep into the night.','Punjab','regional','{"accent":"#E5A100","accent2":"#C1440E","cool":"#2B2118"}','punjabi-dhaba',true,'open','Truck 🚚',8),
('ganpati-pandal','Ganpati Pandal','गणपती पंडाल','Dhol, marigold, ten days of the whole street.','A Mumbai pandal on the fifth night.','Maharashtra','regional','{"accent":"#E5A100","accent2":"#C1440E","cool":"#0E5E63"}','ganpati-pandal',false,'open','Dhol 🥁',9),
('tamil-saloon','Saloon Kadai','சலூன் கடை','Tin roof, Ilaiyaraaja on the radio, next please.','A Tamil Nadu roadside saloon with a bicycle parked outside.','Tamil Nadu','regional','{"accent":"#E5A100","accent2":"#C1440E","cool":"#0E5E63"}','tamil-saloon',false,'open','Radio 📻',10);

-- tracks
INSERT INTO public.tracks (scene_id, title, artist, year, search_query, daypart_tag, sort_order)
SELECT s.id, t.title, t.artist, t.year, t.q, t.dp, t.ord FROM public.scenes s
JOIN (VALUES
 ('rail-yatra','Chal Chhaiyya Chhaiyya','Sukhwinder Singh',1998,'chaiyya chaiyya dil se full song','day',1),
 ('rail-yatra','Mere Sapno Ki Rani','Kishore Kumar',1969,'mere sapno ki rani aradhana song','day',2),
 ('rail-yatra','Jeevan Se Bhari Teri Aankhen','Kishore Kumar',1971,'jeevan se bhari teri aankhen song','evening',3),
 ('rail-yatra','Safarnama','Lucky Ali',2015,'safarnama tamasha song','night',4),
 ('nai-ki-dukaan','Ek Ajnabee Haseena Se','Kishore Kumar',1974,'ek ajnabee haseena se song','day',1),
 ('nai-ki-dukaan','Yeh Dosti','Kishore Kumar',1975,'yeh dosti sholay song','day',2),
 ('nai-ki-dukaan','Pehla Nasha','Udit Narayan',1992,'pehla nasha jo jeeta wohi sikandar','evening',3),
 ('raat-ki-bus','Kabhi Kabhie Aditi','Rashid Ali',2007,'kabhi kabhi aditi song','night',1),
 ('raat-ki-bus','Tum Ho','Mohit Chauhan',2010,'tum ho rockstar song','night',2),
 ('raat-ki-bus','O Re Piya','Rahat Fateh Ali Khan',2007,'o re piya aaja nachle song','night',3),
 ('sarkari-daftar','Sar Jo Tera Chakraye','Mohammed Rafi',1957,'sar jo tera chakraye pyaasa song','day',1),
 ('sarkari-daftar','Babu Samjho Ishare','Kishore Kumar',1958,'babu samjho ishare chalti ka naam gaadi','day',2),
 ('doordarshan-shaam','Mile Sur Mera Tumhara','Various',1988,'mile sur mera tumhara doordarshan','evening',1),
 ('doordarshan-shaam','Doordarshan Signature Tune','Doordarshan',1976,'doordarshan signature tune','evening',2),
 ('chaya-kada','Kaathirunnu Kaathirunnu','Shreya Ghoshal',2016,'kaathirunnu kaathirunnu ennu ninte moideen','day',1),
 ('chaya-kada','Devadoothar Padi','K J Yesudas',1998,'devadoothar paadi song','day',2),
 ('para-adda','Coffee House','Manna Dey',1983,'coffee house er sei addata manna dey','evening',1),
 ('para-adda','Ei Poth Jodi Na Shesh Hoy','Hemanta Mukherjee',1961,'ei poth jodi na shesh hoy song','evening',2),
 ('highway-dhaba','Challa','Rabbi Shergill',2012,'challa jab tak hai jaan song','night',1),
 ('highway-dhaba','Tunak Tunak Tun','Daler Mehndi',1998,'tunak tunak tun daler mehndi','night',2),
 ('ganpati-pandal','Deva Shree Ganesha','Ajay Gogavale',2012,'deva shree ganesha agneepath song','evening',1),
 ('ganpati-pandal','Sukhkarta Dukhharta','Various',1990,'sukhkarta dukhharta aarti','day',2),
 ('tamil-saloon','Ilamai Itho Itho','S P Balasubrahmanyam',1980,'ilamai itho itho song','day',1),
 ('tamil-saloon','Chinna Chinna Aasai','Minmini',1992,'chinna chinna aasai roja song','day',2)
) AS t(slug,title,artist,year,q,dp,ord) ON t.slug = s.slug;

-- oneliners
INSERT INTO public.oneliners (scene_id, text_en, text_hi, daypart_tag)
SELECT s.id, o.en, o.hi, o.dp FROM public.scenes s
JOIN (VALUES
 ('rail-yatra','Attention please. Train number 12801 is running four hours late.','कृपया ध्यान दें, गाड़ी चार घंटे विलंब से चल रही है।','all'),
 ('rail-yatra','Chai... chai garam... chai!','चाय... चाय गरम... चाय!','all'),
 ('rail-yatra','Bhaisahab, seat khaali hai? Sirf Jhansi tak.','भाईसाहब, सीट खाली है? सिर्फ़ झाँसी तक।','all'),
 ('rail-yatra','Someone''s transistor is playing the same song for the third time.','किसी का ट्रांजिस्टर तीसरी बार वही गाना बजा रहा है।','evening'),
 ('nai-ki-dukaan','Thoda aur chhota kar dun? Ekdum hero lagoge.','थोड़ा और छोटा कर दूँ? एकदम हीरो लगोगे।','all'),
 ('nai-ki-dukaan','Champi karwa lo bhai, dimaag thanda ho jaayega.','चंपी करवा लो भाई, दिमाग ठंडा हो जाएगा।','all'),
 ('nai-ki-dukaan','Politics ki baat hai — mera toh yeh maanna hai...','राजनीति की बात है — मेरा तो यह मानना है...','all'),
 ('raat-ki-bus','Bhaisahab, thoda seat aage kar dijiye.','भाईसाहब, थोड़ा सीट आगे कर दीजिए।','night'),
 ('raat-ki-bus','Dhaba pe das minute ka break. Sirf das minute.','ढाबे पे दस मिनट का ब्रेक। सिर्फ़ दस मिनट।','night'),
 ('raat-ki-bus','Everyone is asleep. The driver is singing along, softly.','सब सो रहे हैं। ड्राइवर धीरे से गुनगुना रहा है।','night'),
 ('sarkari-daftar','Sahab lunch pe gaye hain, do baje aayenge.','साहब लंच पे गए हैं, दो बजे आएँगे।','all'),
 ('sarkari-daftar','Photocopy laaye ho? Do copy chahiye, self-attested.','फोटोकॉपी लाए हो? दो कॉपी चाहिए, सेल्फ़-अटेस्टेड।','all'),
 ('sarkari-daftar','Aapki file upar gayi hai. Upar matlab... upar.','आपकी फ़ाइल ऊपर गई है। ऊपर मतलब... ऊपर।','all'),
 ('doordarshan-shaam','Rukavat ke liye khed hai.','रुकावट के लिए खेद है।','all'),
 ('doordarshan-shaam','Ab aap dekhiye, aaj ka mukhya samachar.','अब आप देखिए, आज का मुख्य समाचार।','evening'),
 ('chaya-kada','Oru chaya, kadi kammi.','ഒരു ചായ, കടി കുറച്ച്.','all'),
 ('chaya-kada','The newspaper is being read out loud. Everyone has an opinion.','പത്രം ഉറക്കെ വായിക്കുന്നു.','all'),
 ('para-adda','Cha ta ekdom thanda hoye gelo, aar ek bhaar?','চা টা ঠান্ডা হয়ে গেল, আর এক ভাঁড়?','all'),
 ('para-adda','East Bengal na Mohun Bagan? Bol.','ইস্ট বেঙ্গল না মোহনবাগান? বল।','all'),
 ('highway-dhaba','Do tandoori roti, dal makhani, aur ek chai.','ਦੋ ਤੰਦੂਰੀ ਰੋਟੀ, ਦਾਲ ਮਖਣੀ, ਤੇ ਇੱਕ ਚਾਹ।','night'),
 ('highway-dhaba','Charpai khaali hai, thodi der so jao.','ਮੰਜੀ ਖਾਲੀ ਹੈ, ਥੋੜੀ ਦੇਰ ਸੌ ਜਾਓ।','night'),
 ('ganpati-pandal','Ganpati Bappa... Morya!','गणपती बाप्पा... मोरया!','all'),
 ('ganpati-pandal','Prasad ghe re, thoda ani ghe.','प्रसाद घे रे, थोडा आणि घे.','all'),
 ('tamil-saloon','Next please. Konjam thala thaazhthunga.','அடுத்தவர் வாங்க. கொஞ்சம் தலை தாழ்த்துங்க.','all'),
 ('tamil-saloon','Radio-la Ilaiyaraaja. Yaarum maatha koodathu.','ரேடியோவில் இளையராஜா. யாரும் மாற்றக்கூடாது.','all')
) AS o(slug,en,hi,dp) ON o.slug = s.slug;

-- shared stems for mixer + per-scene ambience
INSERT INTO public.sound_stems (scene_id, name, name_hi, synth_key, default_volume, category) VALUES
(NULL,'Ceiling fan','पंखा','fan',0.35,'ambient'),
(NULL,'Rain on tin roof','टिन की छत पर बारिश','rain',0.4,'ambient'),
(NULL,'Distant chatter','दूर की गपशप','chatter',0.25,'ambient'),
(NULL,'Pressure cooker','कुकर की सीटी','cooker',0.2,'kitchen'),
(NULL,'Temple bell','मंदिर की घंटी','bell',0.2,'morning'),
(NULL,'Train clatter','रेल की खटखट','train',0.3,'travel');
