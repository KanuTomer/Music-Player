import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [, , stagedArgument, sainikArgument, migrationArgument, docsArgument] = process.argv;
if (!stagedArgument || !sainikArgument || !migrationArgument || !docsArgument) {
  throw new Error(
    "Usage: node scripts/generate-seven-jagah-completion.mjs <staged-review.json> <sainik-review.json> <migration.sql> <song-list.md>",
  );
}

const staged = JSON.parse(readFileSync(resolve(stagedArgument), "utf8"));
const sainik = JSON.parse(readFileSync(resolve(sainikArgument), "utf8"));
const stagedChecksum = createHash("sha256").update(JSON.stringify(staged.selections)).digest("hex");
const sainikChecksum = createHash("sha256").update(JSON.stringify(sainik.tracks)).digest("hex");
if (staged.status !== "approved" || stagedChecksum !== staged.sha256) throw new Error("Invalid staged catalogue review");
if (sainikChecksum !== sainik.sha256 || sainik.tracks?.length !== 25) throw new Error("Invalid Sainik Dhaba review");

const clean = {
  "sainik-dhaba": [
    ["Bolo Ta Ra Ra", "Daler Mehndi"], ["Tunak Tunak Tun", "Daler Mehndi"], ["Ho Jayegi Balle Balle", "Daler Mehndi"],
    ["Na Na Na Re", "Daler Mehndi, Sudesh Bhosle"], ["Dardi Rab Rab Kardi", "Daler Mehndi"], ["Ishq Tera Tadpave", "Sukhbir"],
    ["Gal Ban Gayee", "Sukhbir"], ["Sauda Khara Khara", "Sukhbir"], ["Dil Le Gayee", "Jasbir Jassi"],
    ["Gur Nalon Ishq Mitha", "Malkit Singh"], ["Tutak Tutak Tutian", "Malkit Singh"], ["Tera Yaar Bolda", "Surjit Bindrakhia"],
    ["Dupatta Tera Satrang Da", "Surjit Bindrakhia"], ["Mukhda Dekh Ke", "Surjit Bindrakhia"], ["Mittran Di Chhatri", "Babbu Maan"],
    ["Saun Di Jhadi", "Babbu Maan"], ["Challa", "Gurdas Maan"], ["Apna Punjab Hove", "Gurdas Maan"],
    ["Dil Da Mamla Hai", "Gurdas Maan"], ["Ki Banu Duniya Da", "Gurdas Maan, Diljit Dosanjh"], ["Mauja Hi Mauja", "Mika Singh"],
    ["Nagada Nagada", "Sonu Nigam, Javed Ali"], ["Aahun Aahun", "Neeraj Shridhar, Master Saleem, Suzi Q"],
    ["Main Jat Yamla Pagla Deewana", "Mohammed Rafi"], ["Laung Gawacha", "Neha Bhasin"],
  ],
  "deluxe-salon": [
    ["Chaahat Na Hoti", "Alka Yagnik, Vinod Rathod"], ["Tum To Thehre Pardesi", "Altaf Raja"],
    ["Dil Tote Tote Ho Gaya", "Shweta Shetty, Hans Raj Hans"], ["Mujhko Rana Ji Maaf Karna", "Ila Arun, Alka Yagnik"],
    ["Dil Laga Liya Maine", "Alka Yagnik, Udit Narayan"], ["Kitna Pagal Dil Hai", "Alka Yagnik"],
    ["Utha Le Jaoonga", "Kumar Sanu, Anuradha Paudwal"], ["Hum Tumko Nigahon Mein", "Udit Narayan, Shreya Ghoshal"],
    ["Mujhse Mohabbat Ka Izhar", "Alka Yagnik, Kumar Sanu"], ["Aap Ke Pyaar Mein", "Alka Yagnik"],
    ["Kyaa Dil Ne Kahaa", "Udit Narayan, Alka Yagnik"], ["Tu Pyar Hai Kisi Aur Ka", "Kumar Sanu, Anuradha Paudwal"],
    ["O Yaaron Maaf Karna (Sad Version)", "Kumar Sanu, Alka Yagnik"],
    ["Tu Jo Hans Hans Ke", "Udit Narayan"], ["Hum Yaar Hain Tumhare", "Alka Yagnik, Udit Narayan"],
    ["Bepanah Pyar Hai Aaja", "Shreya Ghoshal"], ["Sajan Tumse Pyar", "Udit Narayan, Alka Yagnik"],
    ["Ek Din Aap", "Kumar Sanu, Alka Yagnik"], ["Dil Ka Kya Kare Saheb", "Kavita Krishnamurthy"],
    ["Sochenge Tumhe Pyar", "Kumar Sanu"], ["Rab Kare Tujhko Bhi Pyar Ho Jaye", "Udit Narayan, Alka Yagnik"],
    ["Chand Tare Phool", "Tauseef Akhtar"], ["Pehli Pehli Baar Mohabbat Ki Hai", "Kumar Sanu, Alka Yagnik"],
    ["Kisise Tum Pyaar Karo", "Alka Yagnik, Kumar Sanu"], ["Pehle Kabhi Na Mera Haal", "Udit Narayan, Alka Yagnik"],
  ],
  "bus-driver": [
    ["Main Nikla Gaddi Leke", "Udit Narayan"], ["Long Drive", "Mika Singh"], ["Yeh Dosti Hum Nahi Todenge", "Kishore Kumar, Manna Dey"],
    ["Zindagi Ek Safar Hai Suhana", "Kishore Kumar"], ["Musafir Hoon Yaron", "Kishore Kumar"], ["Chala Jata Hoon", "Kishore Kumar"],
    ["Hum Dono Do Premi", "Lata Mangeshkar, Kishore Kumar"], ["Yun Hi Chala Chal", "Udit Narayan, Hariharan, Kailash Kher"],
    ["Aao Milo Chalen", "Shaan, Ustad Sultan Khan"], ["Ilahi", "Arijit Singh"], ["Safarnama", "Lucky Ali"],
    ["Phir Se Ud Chala", "Mohit Chauhan"], ["Patakha Guddi", "Nooran Sisters"], ["Khaabon Ke Parinday", "Alyssa Mendonsa, Mohit Chauhan"],
    ["Journey Song", "Anupam Roy, Shreya Ghoshal"], ["Dil Chahta Hai", "Shankar Mahadevan"], ["Hairat", "Lucky Ali"],
    ["Roobaroo", "A. R. Rahman, Naresh Iyer"], ["Banjarey", "Yo Yo Honey Singh"],
    ["Ik Junoon (Paint It Red)", "Vishal Dadlani, Alyssa Mendonsa, Gulraj Singh, Shankar Mahadevan"],
    ["Dekha Hai Aise Bhi", "Lucky Ali"], ["Tanha Dil", "Shaan"], ["Gaddi Jaandi Ae Chalaangaan Maardi", "Ammy Virk"],
    ["Hornn Blow", "Harrdy Sandhu"], ["Born to Shine", "Diljit Dosanjh"],
  ],
  "bartan-time": [
    ["Teri Aankhon Mein", "Darshan Raval, Neha Kakkar"], ["Show Me the Thumka", "Sunidhi Chauhan, Shashwat Singh"],
    ["Teri Baaton Mein Aisa Uljha Jiya", "Raghav, Tanishk Bagchi, Asees Kaur"], ["Lut Gaye", "Jubin Nautiyal"],
    ["Apna Bana Le", "Arijit Singh"], ["O Maahi", "Arijit Singh"], ["Maan Meri Jaan", "King"],
    ["Ishq Di Baajiyaan", "Diljit Dosanjh"], ["Tere Hawaale", "Arijit Singh, Shilpa Rao"],
    ["Nayan", "Dhvani Bhanushali, Jubin Nautiyal"], ["Wedding Mashup 2023", "VDJ Ayush, Mihir"], ["Laal Peeli Akhiyaan", "Romy"],
    ["Bachke Tu Rehna (Khallas Remix)", "DJ SR"], ["Raataan Lambiyan", "Jubin Nautiyal, Asees Kaur"],
    ["Stay", "Rihanna, Mikky Ekko"], ["We Found Love", "Rihanna, Calvin Harris"],
    ["Kurchi Madathapetti Megamix", "Sush & Yohan"], ["Bollywood Navratri Mashup 2023", "Musical Trip"],
    ["Bollywood Dandiya 2023", "Musical Trip"], ["Suniyan Suniyan", "Juss"], ["Gulabi Sadi", "Sanju Rathod, G-SPXRK"],
    ["Taaron Ke Shehar", "Neha Kakkar, Jubin Nautiyal"], ["Pyaar Hota Kayi Baar Hai", "Arijit Singh"],
    ["Diamonds", "Rihanna"], ["Dekhha Tenu", "Mohammad Faiz"],
  ],
  "raju-mistri": [
    ["Tu Pyar Hai Kisi Aur Ka", "Kumar Sanu, Anuradha Paudwal"], ["Sochenge Tumhe Pyar", "Kumar Sanu"],
    ["Aye Mere Humsafar", "Udit Narayan, Alka Yagnik"], ["Woh Ladki Bohot Yaad Aati Hai", "Kumar Sanu, Alka Yagnik"],
    ["Kitna Haseen Chehra", "Kumar Sanu"], ["Hum Yaar Hai Tumhare", "Alka Yagnik, Udit Narayan"],
    ["Abhi To Mohabbat Ka", "Udit Narayan, Alka Yagnik"], ["Teri Umeed Tera Intezar", "Kumar Sanu"],
    ["Mujhse Mohabbat Ka Izhar", "Alka Yagnik, Kumar Sanu"], ["Tumsa Koi Pyaara", "Kumar Sanu, Alka Yagnik"],
    ["Raah Mein Unse Mulaqat", "Kumar Sanu, Alka Yagnik"], ["Dil Cheer Ke Dekh", "Kumar Sanu"],
    ["Is Pyar Se Meri Taraf Na Dekho", "Kumar Sanu"], ["Chaaha Toh Bahut", "Kumar Sanu, Bela Sulakhe"],
    ["Pucho Zara Pucho", "Alka Yagnik, Kumar Sanu"], ["Tumse Milne Ki Tamanna Hai", "S. P. Balasubrahmanyam"],
    ["Too Shayar Hai Main Teri Shayari", "Alka Yagnik"], ["Lagi Aaj Sawan Ki", "Anupama Deshpande, Suresh Wadkar"],
    ["Chhupana Bhi Nahi Aata", "Vinod Rathod"], ["Kitaben Bahut Si", "Asha Bhosle, Vinod Rathod"],
    ["Baazigar O Baazigar", "Kumar Sanu, Alka Yagnik"], ["Koi Na Koi Chahiye", "Vinod Rathod"],
    ["Jeeta Tha Jiske Liye", "Kumar Sanu, Alka Yagnik"], ["Tumhein Apna Banane Ki Kasam", "Kumar Sanu, Anuradha Paudwal"],
    ["Yeh Kaali Kaali Aankhen", "Kumar Sanu, Alka Yagnik"],
  ],
  "papa-ke-gaane": [
    ["Mere Mehboob Qayamat Hogi", "Kishore Kumar"], ["Pal Pal Dil Ke Paas", "Kishore Kumar"], ["Likhe Jo Khat Tujhe", "Mohammed Rafi"],
    ["Ankhiyon Ke Jharokhon Se", "Hemlata"], ["Dekha Ek Khwab", "Lata Mangeshkar, Kishore Kumar"], ["Inteha Ho Gai", "Kishore Kumar, Asha Bhosle"],
    ["Meri Bheegi Bheegi Si", "Kishore Kumar"], ["Main Pal Do Pal Ka Shair Hoon", "Mukesh"], ["Ek Ajnabee Haseena Se", "Kishore Kumar"],
    ["Chala Jata Hoon", "Kishore Kumar"], ["Aate Jate Khoobsurat Awara", "Kishore Kumar"], ["O Saathi Re", "Kishore Kumar"],
    ["Chhalka Yeh Jaam", "Mohammed Rafi"], ["Teri Galiyon Mein", "Mohammed Rafi"], ["Manzilen Apni Jagah Hai", "Kishore Kumar"],
    ["Mere Dil Mein Aaj Kya Hai", "Kishore Kumar"], ["Tere Jaisa Yaar Kahan", "Kishore Kumar"], ["Tumne Kisi Se Kabhi Pyar Kiya Hai", "Mukesh, Kanchan"],
    ["Hamen Tumse Pyar Kitna", "Kishore Kumar"], ["Wada Karo", "Kishore Kumar, Lata Mangeshkar"],
    ["Neele Neele Ambar Par", "Kishore Kumar"], ["Salam-E-Ishq Meri Jaan", "Lata Mangeshkar, Kishore Kumar"],
    ["Mere Sapnon Ki Rani", "Kishore Kumar"], ["Yeh Raaten Yeh Mausam", "Kishore Kumar, Asha Bhosle"],
    ["Shayad Meri Shaadi", "Lata Mangeshkar, Kishore Kumar"],
  ],
  "corporate-majdoor": [
    ["Apna Bana Le", "Arijit Singh"], ["Tere Sang Yaara", "Atif Aslam"], ["Tu Banja Gali Benaras Ki", "Asit Tripathy"],
    ["Samjhawan", "Arijit Singh, Shreya Ghoshal"], ["Jogi", "Yasser Desai, Aakanksha Sharma"], ["Nainowale Ne", "Neeti Mohan"],
    ["Kaun Tujhe", "Palak Muchhal"], ["Tere Hawaale", "Arijit Singh, Shilpa Rao"], ["Tum Se Hi", "Mohit Chauhan"],
    ["Maiyya Mainu", "Sachet Tandon"], ["Tum Jo Aaye", "Rahat Fateh Ali Khan, Tulsi Kumar"], ["Main Agar Kahoon", "Sonu Nigam, Shreya Ghoshal"],
    ["Jaan Ban Gaye", "Mithoon, Vishal Mishra, Asees Kaur"], ["Dooron Dooron (Unplugged)", "Paresh Pahuja"],
    ["Afreen Afreen", "Rahat Fateh Ali Khan, Momina Mustehsan"], ["Raataan Lambiyan", "Jubin Nautiyal, Asees Kaur"],
    ["Tu Jaane Na", "Atif Aslam"], ["Saiyyan", "Kailash Kher"], ["Hawayein", "Arijit Singh"],
    ["Bahara", "Shreya Ghoshal, Sona Mohapatra"], ["Dil Mein Ho Tum", "Armaan Malik"],
    ["Tu Hi Haqeeqat", "Javed Ali, Irshan Ashraf, Shadab"], ["Kinna Sona", "Sunil Kamath"],
    ["Subhanallah", "Sreeram, Shilpa Rao"], ["Saiyaara", "Mohit Chauhan, Taraannum Mallik"],
  ],
};

const stagedGroups = new Map(staged.selections.map((group) => [group.slug, group]));
const groups = [
  { slug: "sainik-dhaba", displayName: "Sainik Dhaba", sceneSlug: "sainik-dhaba", tracks: sainik.tracks },
  ...[
    ["deluxe-salon", "Deluxe Salon", "nai-ki-dukaan"], ["bus-driver", "Bus Driver", "bus-driver"],
    ["bartan-time", "Bartan Time", "bartan-time"], ["raju-mistri", "Raju Mistri", "raj-mistri"],
    ["papa-ke-gaane", "Papa Ke Gaane", "papa-ke-gaane"], ["corporate-majdoor", "Corporate Majdoor", "corporate-majdoor"],
  ].map(([slug, displayName, sceneSlug]) => ({ slug, displayName, sceneSlug, tracks: stagedGroups.get(slug)?.tracks })),
];
for (const group of groups) {
  if (group.tracks?.length !== 25 || clean[group.slug]?.length !== 25) throw new Error(`Expected 25 tracks for ${group.slug}`);
  group.tracks = group.tracks.map((track, index) => ({ ...track, title: clean[group.slug][index][0], artist: clean[group.slug][index][1], position: index + 1 }));
}
const unique = new Map();
for (const group of groups) for (const track of group.tracks) {
  const prior = unique.get(track.videoId);
  if (prior && (prior.title !== track.title || prior.artist !== track.artist)) throw new Error(`Conflicting cleanup for ${track.videoId}`);
  unique.set(track.videoId, track);
}
if (groups.reduce((sum, group) => sum + group.tracks.length, 0) !== 175 || unique.size !== 171) throw new Error("Expected 175 memberships and 171 unique videos");

const quote = (value) => value == null ? "NULL" : `'${String(value).replaceAll("'", "''")}'`;
const obsolete = stagedGroups.get("bhojpuri-bangers").tracks.map((track) => track.videoId);
const setDefs = [
  ["sainik-dhaba", "Sainik Dhaba — Seven Jagah Staged", 1, "manual:sainik-dhaba:2026-08-29"],
  ["nai-ki-dukaan", "Deluxe Salon — Seven Jagah Staged", 2, "PLVFLMYM1tErk"],
  ["bus-driver", "Bus Driver — Seven Jagah Staged", 3, "manual:bus-driver:2026-08-29"],
  ["bartan-time", "Bartan Time — Seven Jagah Staged", 4, "PLc1Byv6ESHSaag4naocpjBLSjO58i9MV5"],
  ["raj-mistri", "Raju Mistri — Seven Jagah Staged", 5, "PLTcrZKUys_a5zSgv_3ZHsRnTVJ05GbDvY"],
  ["papa-ke-gaane", "Papa Ke Gaane — Seven Jagah Staged", 6, "PL3rJgr5HfVCrov_nZV_2ltKKFGWbbjATx"],
  ["corporate-majdoor", "Corporate Majdoor — Seven Jagah Staged", 7, "PLMqSYqU_UWQk"],
];
const scenes = [
  { slug: "bus-driver", en: "Bus Driver", hi: "बस ड्राइवर", hook: "Lambi route, khuli sadak, aur dashboard ka purana radio.", description: "An overnight intercity bus cabin: humming engine, glowing highway signs and songs keeping the driver awake.", palette: { cool: "#17232D", accent: "#E5A100", accent2: "#C1440E" }, dark: true, gag: "Horn do", order: 3, tags: ["safar", "shaam"], lines: [["Agla stop chai aur diesel ke baad.", "अगला स्टॉप चाय और डीज़ल के बाद।", "all"], ["Conductor ne phir se aadhi neend mein seeti bajayi.", "कंडक्टर ने फिर आधी नींद में सीटी बजाई।", "night"], ["High beam kam rakho, raat lambi hai.", "हाई बीम कम रखो, रात लंबी है।", "night"], ["Dashboard ka radio signal pakad raha hai.", "डैशबोर्ड का रेडियो सिग्नल पकड़ रहा है।", "all"], ["Peechhe wali seat par koi abhi tak soya nahi.", "पीछे वाली सीट पर कोई अभी तक सोया नहीं।", "night"]] },
  { slug: "bartan-time", en: "Bartan Time", hi: "बर्तन टाइम", hook: "Steel ki khanak, nal ka paani, aur kitchen ka radio.", description: "A late-night Indian kitchen after dinner: stacked steel plates, running water and songs between every scrub.", palette: { cool: "#183A3A", accent: "#E5A100", accent2: "#6B7B53" }, dark: true, gag: "Ek aur plate", order: 4, tags: ["kaam", "yaadein"], lines: [["Bas ye patila reh gaya... aur teen katori.", "बस ये पतीला रह गया... और तीन कटोरी।", "all"], ["Jhaag zyada ho toh kaam thoda kam lagta hai.", "झाग ज़्यादा हो तो काम थोड़ा कम लगता है।", "all"], ["Steel ka bartan apna hi taal banata hai.", "स्टील का बर्तन अपनी ही ताल बनाता है।", "all"], ["Sab kha ke chale gaye; radio abhi bhi yahin hai.", "सब खाकर चले गए; रेडियो अभी भी यहीं है।", "night"], ["Kal se turant dho denge — pakka.", "कल से तुरंत धो देंगे — पक्का।", "night"]] },
  { slug: "papa-ke-gaane", en: "Papa Ke Gaane", hi: "पापा के गाने", hook: "Sunday ki safai, purani cassette, aur Papa ki pakki playlist.", description: "A familiar family room on a slow Sunday: newspapers, old speakers and the songs Papa never skips.", palette: { cool: "#4A3827", accent: "#E5A100", accent2: "#6B7B53" }, dark: false, gag: "Volume badhao", order: 6, tags: ["shaam", "yaadein"], lines: [["Is gaane ke time tum paida bhi nahi hue the.", "इस गाने के समय तुम पैदा भी नहीं हुए थे।", "all"], ["Cassette ko pencil se rewind karna padta tha.", "कैसेट को पेंसिल से रिवाइंड करना पड़ता था।", "all"], ["Sunday ka akhbaar aur side A.", "रविवार का अख़बार और साइड ए।", "morning"], ["Singer ka naam poochho, Papa ko sab yaad hai.", "गायक का नाम पूछो, पापा को सब याद है।", "all"], ["Remote nahi milega; volume wahi rahega.", "रिमोट नहीं मिलेगा; आवाज़ वहीं रहेगी।", "evening"]] },
];

const lines = ["-- Complete the inactive seven-Jagah catalogue without changing production playback.", `-- Source checksums: staged=${staged.sha256}; sainik=${sainik.sha256}`, "BEGIN;", "SET LOCAL lock_timeout = '10s';", "", "DO $$ BEGIN", "  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 10 THEN RAISE EXCEPTION 'expected ten live scenes'; END IF;", "  IF (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN RAISE EXCEPTION 'expected ten active sets'; END IF;", "  IF (SELECT count(*) FROM public.curated_sets WHERE NOT is_active) <> 7 THEN RAISE EXCEPTION 'expected seven prior inactive sets'; END IF;", "  IF EXISTS (SELECT 1 FROM public.curated_sets cs LEFT JOIN public.curated_set_tracks cst ON cst.curated_set_id = cs.id WHERE NOT cs.is_active GROUP BY cs.id HAVING count(cst.id) <> 25) THEN RAISE EXCEPTION 'expected 25 memberships in every prior inactive set'; END IF;", "END $$;", ""];

lines.push("INSERT INTO public.scenes(slug, title_en, title_hi, hook, description, region, category, palette, art_key, is_dark, is_live, chat_mode, gag_label, sort_order, tags)", "VALUES", scenes.map((s) => `  (${quote(s.slug)}, ${quote(s.en)}, ${quote(s.hi)}, ${quote(s.hook)}, ${quote(s.description)}, 'Pan India', 'tier1', ${quote(JSON.stringify(s.palette))}::jsonb, ${quote(s.slug)}, ${s.dark}, false, 'closed', ${quote(s.gag)}, ${s.order}, ARRAY[${s.tags.map(quote).join(", ")}]::text[])`).join(",\n"), "ON CONFLICT (slug) DO UPDATE SET title_en=EXCLUDED.title_en, title_hi=EXCLUDED.title_hi, hook=EXCLUDED.hook, description=EXCLUDED.description, region=EXCLUDED.region, category=EXCLUDED.category, palette=EXCLUDED.palette, art_key=EXCLUDED.art_key, is_dark=EXCLUDED.is_dark, chat_mode=EXCLUDED.chat_mode, gag_label=EXCLUDED.gag_label, tags=EXCLUDED.tags;", "");
for (const scene of scenes) for (const [en, hi, daypart] of scene.lines) lines.push(`INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag) SELECT s.id, ${quote(en)}, ${quote(hi)}, ${quote(daypart)} FROM public.scenes s WHERE s.slug=${quote(scene.slug)} AND NOT EXISTS (SELECT 1 FROM public.oneliners o WHERE o.scene_id=s.id AND o.text_en=${quote(en)});`);

lines.push("", "DELETE FROM public.curated_sets WHERE NOT is_active AND origin_external_id='PLwyqDgjhF4Qpq6kslMcQ8NR6RHb-Z4Tu-';", "DELETE FROM public.tracks t USING public.playback_sources ps WHERE ps.track_id=t.id AND ps.provider='youtube' AND ps.provider_item_id IN (", `  ${obsolete.map(quote).join(", ")}`, ") AND NOT EXISTS (SELECT 1 FROM public.curated_set_tracks cst WHERE cst.track_id=t.id);", "");

const allRows = [...unique.entries()];
lines.push("INSERT INTO public.tracks(catalogue_key, scene_id, title, artist, year, daypart_tag, sort_order) VALUES", allRows.filter(([id]) => sainik.tracks.some((track) => track.videoId === id)).map(([id, track]) => `  (${quote(`youtube:${id}`)}, NULL, ${quote(track.title)}, ${quote(track.artist)}, ${track.year == null ? "NULL" : Number(track.year)}, 'all', 0)`).join(",\n"), "ON CONFLICT (catalogue_key) DO UPDATE SET title=EXCLUDED.title, artist=EXCLUDED.artist, year=COALESCE(EXCLUDED.year, public.tracks.year);", "", "INSERT INTO public.playback_sources(track_id, provider, provider_item_id, source_url, provider_title, provider_channel, priority, validated_at, is_active)", "SELECT t.id, 'youtube', v.video_id, 'https://www.youtube.com/watch?v=' || v.video_id, v.provider_title, v.provider_channel, 0, v.validated_at::timestamptz, true FROM (VALUES", sainik.tracks.map((track) => `  (${quote(track.videoId)}, ${quote(track.providerTitle)}, ${quote(track.providerChannel)}, ${quote(track.validatedAt)})`).join(",\n"), ") AS v(video_id, provider_title, provider_channel, validated_at) JOIN public.tracks t ON t.catalogue_key='youtube:' || v.video_id ON CONFLICT (provider, provider_item_id) DO NOTHING;", "");

lines.push("UPDATE public.tracks t SET title=v.title, artist=v.artist, year=COALESCE(v.year, t.year) FROM public.playback_sources ps JOIN (VALUES", allRows.map(([id, track]) => `  (${quote(id)}, ${quote(track.title)}, ${quote(track.artist)}, ${track.year == null ? "NULL" : Number(track.year)})`).join(",\n"), ") AS v(video_id, title, artist, year) ON v.video_id=ps.provider_item_id WHERE ps.track_id=t.id AND ps.provider='youtube';", "");

lines.push("INSERT INTO public.curated_sets(scene_id, title, sort_order, is_active, shuffle_start, origin_provider, origin_external_id, imported_at) SELECT s.id, 'Sainik Dhaba — Seven Jagah Staged', 1, false, true, 'youtube', 'manual:sainik-dhaba:2026-08-29', now() FROM public.scenes s WHERE s.slug='sainik-dhaba' AND NOT EXISTS (SELECT 1 FROM public.curated_sets cs WHERE cs.scene_id=s.id AND cs.origin_external_id='manual:sainik-dhaba:2026-08-29');", "UPDATE public.curated_sets cs SET title=v.title, sort_order=v.sort_order, is_active=false FROM public.scenes s JOIN (VALUES", setDefs.map(([slug, title, order, origin]) => `  (${quote(slug)}, ${quote(title)}, ${order}, ${quote(origin)})`).join(",\n"), ") AS v(scene_slug, title, sort_order, origin_id) ON v.scene_slug=s.slug WHERE cs.scene_id=s.id AND cs.origin_external_id=v.origin_id;", "");

const sainikGroup = groups[0];
lines.push("INSERT INTO public.curated_set_tracks(curated_set_id, track_id, position, daypart_tag) SELECT cs.id, ps.track_id, v.position, 'all' FROM public.curated_sets cs JOIN public.scenes s ON s.id=cs.scene_id JOIN (VALUES", sainikGroup.tracks.map((track) => `  (${quote(track.videoId)}, ${track.position})`).join(",\n"), ") AS v(video_id, position) ON true JOIN public.playback_sources ps ON ps.provider='youtube' AND ps.provider_item_id=v.video_id AND ps.is_active WHERE s.slug='sainik-dhaba' AND cs.origin_external_id='manual:sainik-dhaba:2026-08-29' ON CONFLICT (curated_set_id, position) DO UPDATE SET track_id=EXCLUDED.track_id, daypart_tag=EXCLUDED.daypart_tag;", "", "DROP POLICY IF EXISTS \"oneliners public read\" ON public.oneliners;", "CREATE POLICY \"oneliners public read\" ON public.oneliners FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.scenes s WHERE s.id=oneliners.scene_id AND s.is_live));", "");

lines.push("DO $$ DECLARE v record; BEGIN", "  IF (SELECT count(*) FROM public.scenes WHERE is_live) <> 10 OR (SELECT count(*) FROM public.curated_sets WHERE is_active) <> 10 THEN RAISE EXCEPTION 'production catalogue changed'; END IF;", "  IF (SELECT count(*) FROM public.scenes WHERE slug IN ('bus-driver','bartan-time','papa-ke-gaane') AND NOT is_live) <> 3 THEN RAISE EXCEPTION 'new scenes must remain hidden'; END IF;", "  IF EXISTS (SELECT 1 FROM public.curated_sets cs LEFT JOIN public.curated_set_tracks cst ON cst.curated_set_id=cs.id WHERE NOT cs.is_active GROUP BY cs.id HAVING count(cst.id)<>25) THEN RAISE EXCEPTION 'staged queue count is not 25'; END IF;", "  IF (SELECT count(*) FROM public.curated_sets WHERE NOT is_active) <> 7 THEN RAISE EXCEPTION 'expected seven inactive target sets'; END IF;", "  IF (SELECT count(*) FROM public.curated_set_tracks cst JOIN public.curated_sets cs ON cs.id=cst.curated_set_id WHERE NOT cs.is_active) <> 175 THEN RAISE EXCEPTION 'expected 175 staged memberships'; END IF;", "  IF (SELECT count(DISTINCT ps.provider_item_id) FROM public.curated_set_tracks cst JOIN public.curated_sets cs ON cs.id=cst.curated_set_id JOIN public.playback_sources ps ON ps.track_id=cst.track_id AND ps.is_active WHERE NOT cs.is_active AND ps.provider='youtube') <> 171 THEN RAISE EXCEPTION 'expected 171 staged videos'; END IF;", "  IF (SELECT count(DISTINCT ps.provider_item_id) FROM public.curated_set_tracks cst JOIN public.curated_sets cs ON cs.id=cst.curated_set_id JOIN public.scenes s ON s.id=cs.scene_id JOIN public.playback_sources ps ON ps.track_id=cst.track_id AND ps.provider='youtube' WHERE NOT cs.is_active AND s.slug='sainik-dhaba') <> 25 THEN RAISE EXCEPTION 'expected 25 distinct Sainik Dhaba videos'; END IF;", "  IF EXISTS (SELECT 1 FROM public.curated_set_tracks own_cst JOIN public.curated_sets own_cs ON own_cs.id=own_cst.curated_set_id JOIN public.scenes own_s ON own_s.id=own_cs.scene_id JOIN public.playback_sources own_ps ON own_ps.track_id=own_cst.track_id AND own_ps.provider='youtube' JOIN public.playback_sources other_ps ON other_ps.provider='youtube' AND other_ps.provider_item_id=own_ps.provider_item_id JOIN public.curated_set_tracks other_cst ON other_cst.track_id=other_ps.track_id JOIN public.curated_sets other_cs ON other_cs.id=other_cst.curated_set_id WHERE NOT own_cs.is_active AND own_s.slug='sainik-dhaba' AND NOT other_cs.is_active AND other_cs.id<>own_cs.id) THEN RAISE EXCEPTION 'Sainik Dhaba overlaps another staged queue'; END IF;", "  IF EXISTS (SELECT 1 FROM public.curated_set_tracks cst JOIN public.curated_sets cs ON cs.id=cst.curated_set_id LEFT JOIN public.playback_sources ps ON ps.track_id=cst.track_id AND ps.is_active WHERE NOT cs.is_active AND ps.id IS NULL) THEN RAISE EXCEPTION 'staged membership lacks an active source'; END IF;", "  IF EXISTS (SELECT 1 FROM public.curated_sets WHERE NOT is_active AND origin_external_id='PLwyqDgjhF4Qpq6kslMcQ8NR6RHb-Z4Tu-') THEN RAISE EXCEPTION 'obsolete Bhojpuri staged set remains'; END IF;", "  IF EXISTS (SELECT 1 FROM public.tracks t JOIN public.curated_set_tracks cst ON cst.track_id=t.id JOIN public.curated_sets cs ON cs.id=cst.curated_set_id WHERE NOT cs.is_active AND t.title ~* '(official|full[ -]?(video|song)|lyrical|#[[:alnum:]])') THEN RAISE EXCEPTION 'unclean staged display title remains'; END IF;", "END $$;", "", "COMMIT;", "");

writeFileSync(resolve(migrationArgument), `${lines.join("\n").trimEnd()}\n`);
const docs = ["# Seven-Jagah Song List", "", "Each future Jagah has exactly 25 ordered songs. The seven queues total 175 memberships and 171 unique YouTube videos because four selections intentionally overlap.", "", "> Status: approved and staged in Supabase, but inactive until the asset and catalogue cutover. Production playback remains unchanged.", "", ...groups.flatMap((group) => [`## ${group.displayName}`, "", ...group.tracks.map((track) => `${track.position}. [${track.title} — ${track.artist}](https://www.youtube.com/watch?v=${track.videoId})`), ""])];
writeFileSync(resolve(docsArgument), `${docs.join("\n").trimEnd()}\n`);
console.log(JSON.stringify({ stagedChecksum, sainikChecksum, memberships: 175, uniqueVideos: unique.size }, null, 2));
