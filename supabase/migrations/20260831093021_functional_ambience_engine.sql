BEGIN;

CREATE TABLE public.ambience_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id UUID NOT NULL UNIQUE REFERENCES public.scenes(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  max_master_gain NUMERIC NOT NULL DEFAULT 0.30 CHECK (max_master_gain BETWEEN 0 AND 1),
  fade_out_ms INTEGER NOT NULL DEFAULT 700 CHECK (fade_out_ms BETWEEN 0 AND 10000),
  fade_in_ms INTEGER NOT NULL DEFAULT 900 CHECK (fade_in_ms BETWEEN 0 AND 10000),
  visual_theme JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ambience_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL DEFAULT 'audio/wav',
  byte_size BIGINT NOT NULL CHECK (byte_size > 0 AND byte_size <= 12582912),
  duration_seconds NUMERIC NOT NULL CHECK (duration_seconds > 0),
  sha256 TEXT NOT NULL CHECK (sha256 ~ '^[A-F0-9]{64}$'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ambience_asset_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.ambience_assets(id) ON DELETE CASCADE,
  source_order INTEGER NOT NULL DEFAULT 1 CHECK (source_order > 0),
  source_url TEXT NOT NULL,
  source_title TEXT NOT NULL,
  source_sha256 TEXT NOT NULL CHECK (source_sha256 ~ '^[A-F0-9]{64}$'),
  UNIQUE (asset_id, source_order)
);

ALTER TABLE public.sound_stems
  ADD COLUMN asset_id UUID REFERENCES public.ambience_assets(id) ON DELETE RESTRICT,
  ADD COLUMN role TEXT CHECK (role IN ('base', 'texture', 'event')),
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN min_gain NUMERIC NOT NULL DEFAULT 0.05 CHECK (min_gain BETWEEN 0 AND 1),
  ADD COLUMN max_gain NUMERIC NOT NULL DEFAULT 0.20 CHECK (max_gain BETWEEN 0 AND 1),
  ADD COLUMN crossfade_ms INTEGER NOT NULL DEFAULT 2500 CHECK (crossfade_ms BETWEEN 0 AND 10000),
  ADD COLUMN event_min_seconds INTEGER CHECK (event_min_seconds IS NULL OR event_min_seconds >= 5),
  ADD COLUMN event_max_seconds INTEGER CHECK (event_max_seconds IS NULL OR event_max_seconds >= event_min_seconds);

UPDATE public.sound_stems SET is_active = false WHERE asset_id IS NULL;

CREATE INDEX ambience_profiles_scene_id_idx ON public.ambience_profiles(scene_id);
CREATE INDEX ambience_assets_active_idx ON public.ambience_assets(is_active);
CREATE INDEX ambience_asset_sources_asset_id_idx ON public.ambience_asset_sources(asset_id);
CREATE INDEX sound_stems_active_scene_idx ON public.sound_stems(scene_id, is_active, sort_order);

GRANT SELECT ON public.ambience_profiles, public.ambience_assets, public.ambience_asset_sources TO anon, authenticated;
GRANT ALL ON public.ambience_profiles, public.ambience_assets, public.ambience_asset_sources TO service_role;
ALTER TABLE public.ambience_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambience_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambience_asset_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "live ambience profiles are public"
ON public.ambience_profiles FOR SELECT TO anon, authenticated
USING (enabled AND EXISTS (SELECT 1 FROM public.scenes s WHERE s.id = scene_id AND s.is_live));

CREATE POLICY "live ambience assets are public"
ON public.ambience_assets FOR SELECT TO anon, authenticated
USING (is_active AND EXISTS (
  SELECT 1 FROM public.sound_stems st
  JOIN public.scenes s ON s.id = st.scene_id
  WHERE st.asset_id = ambience_assets.id AND st.is_active AND s.is_live
));

CREATE POLICY "live ambience provenance is public"
ON public.ambience_asset_sources FOR SELECT TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.ambience_assets a
  JOIN public.sound_stems st ON st.asset_id = a.id
  JOIN public.scenes s ON s.id = st.scene_id
  WHERE a.id = ambience_asset_sources.asset_id AND a.is_active AND st.is_active AND s.is_live
));

DROP POLICY IF EXISTS "stems public read" ON public.sound_stems;
CREATE POLICY "live stems are public"
ON public.sound_stems FOR SELECT TO anon, authenticated
USING (is_active AND EXISTS (SELECT 1 FROM public.scenes s WHERE s.id = scene_id AND s.is_live));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ambience-audio', 'ambience-audio', true, 12582912, ARRAY['audio/wav', 'audio/x-wav'])
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO public.ambience_assets (storage_path, byte_size, duration_seconds, sha256) VALUES
('shared/indian-highway.wav',5760044,90,'9462232CA46F02EFF3555AA54CEECF839BBC424FDF608A1C797DD5EE68C53658'),
('rooms/sainik-dhaba/ambience/texture.wav',3840044,60,'BDE0A1499973FE9379D3F81ABFA9948DF4767AC0038A5729925D41E5FC03A7E7'),
('rooms/sainik-dhaba/ambience/event.wav',896044,14,'A17520EE86B09B52E8538AA20339156E45418A119CA0A9A3599BF070A7D175AC'),
('rooms/nai-ki-dukaan/ambience/base.wav',5760044,90,'15BAEA27C9F31C1CCBA363A4B62654993C9903780D490340FE12B8F06822C02A'),
('rooms/nai-ki-dukaan/ambience/texture.wav',2532318,39.567,'6E5D9F7488AC5DFD8E8A0BD3349FACD0AF2D13C59E8103D6AE9600E4AE91E2DC'),
('rooms/nai-ki-dukaan/ambience/event.wav',768044,12,'6DB2CB7634F7A429F1B02A1436E448F771CEC24E725B7B2307444B7E17019B9A'),
('rooms/bus-driver/ambience/base.wav',5760044,90,'EEFBFAC38D34CBBD38FEAB2F95157DB982F51F117985E9E4B690D2AE04A01DE9'),
('rooms/bus-driver/ambience/event.wav',283884,4.435,'35F7A192FB3DF7A3078BDF71215441EEB9DADD0A332423FDA2C021C9BAE87A21'),
('rooms/bartan-time/ambience/base.wav',2099870,32.810,'1769AB2C8C93F407A47567D3C108A52A07FD437F2A467263A0B238AF8258B6F9'),
('rooms/bartan-time/ambience/texture.wav',3840044,60,'4992E1AC049232AE3D409633B2BEF1609B9B40194F9ECBF292DA65E48D7D8EEB'),
('rooms/bartan-time/ambience/event.wav',768044,12,'956B2A2B73B0DEFA9CF160953A45C92FC7BDB7A1086857F143DE0F9A25FA7623'),
('rooms/raj-mistri/ambience/base.wav',5760044,90,'32671AC18B76F9202C1B9204CB1579ADB64F2D2D5AE9F09BA34291DADFAA0991'),
('rooms/raj-mistri/ambience/texture.wav',3840044,60,'C12F543BD94D5F9742BCF0E4BAD01D4CCF160AE53FEF4594908C3184CA0E3868'),
('rooms/raj-mistri/ambience/event.wav',960044,15,'23D475FA7F354F89A968EFBAD83F0E48C18C6E2AD753E01100B9078CA32FF80A'),
('rooms/papa-ke-gaane/ambience/base.wav',1024044,16,'0FF05457AB7C0EB7619AE0F882FB20787B929C62E9C118D0FF1F2B4AE98A69A7'),
('rooms/papa-ke-gaane/ambience/texture.wav',445124,6.954,'39A6BB08EC74B32B1C8AAAD23B1E95B58BDAF37A63B8B643CA39E525853587AF'),
('rooms/papa-ke-gaane/ambience/event.wav',284628,4.447,'CFCDF2A85BF2AE092F420B20A4411E4D02745F7AEBBFE6EA89C31061B8D55877'),
('rooms/corporate-majdoor/ambience/base.wav',3580002,55.937,'E529C27491EC45539C637336037A4251BA4BF0AC87415B742605C46872D0C9E3'),
('rooms/corporate-majdoor/ambience/texture.wav',373048,5.828,'570C047822B6F994E79327706CBB8F3697DE49D2984617F78A29D6FEBE7317AE'),
('rooms/corporate-majdoor/ambience/event.wav',768044,12,'831BE4782BD7A438A169FD4DB4DC65C024B5762CED1DD7E41BF32565FEF46E09')
ON CONFLICT (storage_path) DO UPDATE SET byte_size=EXCLUDED.byte_size,duration_seconds=EXCLUDED.duration_seconds,sha256=EXCLUDED.sha256,is_active=true;

WITH source_data(path, ord, url, title, hash) AS (VALUES
('shared/indian-highway.wav',1,'https://www.youtube.com/watch?v=xO0j41GUIZ4','Indian highway sound effect','0569229ED15AE4E57D99DE268234658458782A28BB7F35C9B998A58011187C11'),
('rooms/sainik-dhaba/ambience/texture.wav',1,'https://www.youtube.com/watch?v=U3uKZ9jjjaQ','Ambience - Indian dhaaba Restaurant & Bar, Food Stall, Tapri, Pan','0B1786699311BB2DF6845E593F57AA3E470107A44A421952502469C9E86F7358'),
('rooms/sainik-dhaba/ambience/event.wav',1,'https://www.youtube.com/watch?v=GMNFph2tn2c','Food Sizzling Sound Effect','C75E2528FDC56F8EC8A2054FE6735F25DF4B6BDEAD91AD0002E92FB864FC65C1'),
('rooms/sainik-dhaba/ambience/event.wav',2,'https://www.youtube.com/watch?v=i6PYS0SPwO4','Cooking sound effect','0D504F3B2CC87BCC8975A0A8A6BDC302FB970A5E688EB623485D295BC1D5DA23'),
('rooms/nai-ki-dukaan/ambience/base.wav',1,'https://www.youtube.com/watch?v=JIzItYl5x5E','Barber Shop Sound Effects and Stock Video','3AB80A39B780B42B1CE8E3D61C9EAA70593CC1D206D4B675682104FA335B83E7'),
('rooms/nai-ki-dukaan/ambience/texture.wav',1,'https://www.youtube.com/watch?v=M5TsssAOJ-w','Cutting Hair Sound Effect','436700712BEBD5D2ECA783E82AC870803B8F57F2889D1EE0604D1EF3F75FAAA9'),
('rooms/nai-ki-dukaan/ambience/event.wav',1,'https://www.youtube.com/watch?v=9yPNJkADxRA','Hair Cutting Machine','6016F78CF6B83F40D2EB8C5D5E7DF52C612DA002839290941B30DE3E75166A3A'),
('rooms/bus-driver/ambience/base.wav',1,'https://www.youtube.com/watch?v=4nnFLAl_UaI','Bus Ride Sound Effect','D4FD891AC1D136C79CF914F790A038193A741013729369F6263CA15D93BCBC7C'),
('rooms/bus-driver/ambience/event.wav',1,'https://www.youtube.com/watch?v=EewxrgtHehE','Indian Bus Horn','B5F24CEB3110F745DC62B7E3987E84F671D190072EF9AE9F9A43527FC92C601D'),
('rooms/bartan-time/ambience/base.wav',1,'https://www.youtube.com/watch?v=ODeUNpfDm3E','Washing Sound Effect In Kitchen','3DD6594CD5D9BB5EBCD7585302EDDF16BA99D5DEBA4330A9A16BDC1F6B3A4CF0'),
('rooms/bartan-time/ambience/texture.wav',1,'https://www.youtube.com/watch?v=U3wH9lNSG2Q','Relaxing water running in the kitchen sink','493A49E526DA450A1092B68D0C17DADC1AC0CF080608B526BDA67437D4B85328'),
('rooms/bartan-time/ambience/event.wav',1,'https://www.youtube.com/watch?v=Ktv4zUGOoRU','Pressure Cooker Whistle','67C7F87A61C1FF0D5DB90BC9A3124D9E8508EB99947D9E9F911335ACC69A04F3'),
('rooms/raj-mistri/ambience/base.wav',1,'https://www.youtube.com/watch?v=gZ_vEKDLCCo','Construction Workers Sound Effect','31E3A43F3961D3279D7827CE0CC0494CB47A789D846FE90652174BC6790E811B'),
('rooms/raj-mistri/ambience/texture.wav',1,'https://www.youtube.com/watch?v=yCZgqZNFOZg','Construction Workers Sound Effect #2','CCB8F0DEB3712BC36FF881C34C735D5358675F98ED423E17AAF5104DFF5D3BA4'),
('rooms/raj-mistri/ambience/event.wav',1,'https://www.youtube.com/watch?v=eUP8ajzuzR4','Construction Workers Sound Effect #4','716F3F7CD44400593E2CE0A6D2452A353B8F2705CA1D2B101DE10077CB70133D'),
('rooms/papa-ke-gaane/ambience/base.wav',1,'https://www.youtube.com/watch?v=uPWPMOLokaU','Ceiling fan sound effect','0A2EE5BAAD94142421D72856AB00646230C6C3096EFD89774116B2EC951C0CD5'),
('rooms/papa-ke-gaane/ambience/texture.wav',1,'https://www.youtube.com/watch?v=GpIC6VX-nAg','Cassette Tape Sound Effect','81600255F5FD0AE3732F20382CD409A818FEB175496F05E7A3E6184FF8A06FD3'),
('rooms/papa-ke-gaane/ambience/event.wav',1,'https://www.youtube.com/watch?v=FJAMat4U2AM','Newspaper Page Turning','1EFDE9E12649F4625D0D301FD1A79310BC8AACBEE173AD7DC2B9E5A254F32707'),
('rooms/corporate-majdoor/ambience/base.wav',1,'https://www.youtube.com/watch?v=m_xf-5ViDuU','Office Ambience Sound Effect','0F69CC968D6FAB7EFA93D4D3211F827E21A2E1E45AA19138000233B62F1CE034'),
('rooms/corporate-majdoor/ambience/texture.wav',1,'https://www.youtube.com/watch?v=TzKj7Zk9oiQ','Printer Noise','5F739CDCAE614B84840EBB921D6449C9C28F13D1234A7DFD65C777C9CEB51F5E'),
('rooms/corporate-majdoor/ambience/event.wav',1,'https://www.youtube.com/watch?v=R9iWLVO6q7w','Bathroom fan and AC hum','6786A343B5D2B54A6EE513EE86A3BF5D65DEBB00A425040C52C6761EC80797D4')
)
INSERT INTO public.ambience_asset_sources(asset_id,source_order,source_url,source_title,source_sha256)
SELECT a.id,d.ord,d.url,d.title,d.hash FROM source_data d JOIN public.ambience_assets a ON a.storage_path=d.path
ON CONFLICT(asset_id,source_order) DO UPDATE SET source_url=EXCLUDED.source_url,source_title=EXCLUDED.source_title,source_sha256=EXCLUDED.source_sha256;

WITH profiles(slug, visual) AS (VALUES
('sainik-dhaba','{"accent":"#e59f32","haze":"#d97724","pattern":"dust"}'::jsonb),
('nai-ki-dukaan','{"accent":"#48a9a6","haze":"#245c5b","pattern":"shimmer"}'::jsonb),
('bus-driver','{"accent":"#e2a83b","haze":"#31445f","pattern":"streaks"}'::jsonb),
('bartan-time','{"accent":"#8bc7bc","haze":"#315f58","pattern":"ripples"}'::jsonb),
('raj-mistri','{"accent":"#d16a3a","haze":"#6d3528","pattern":"dust"}'::jsonb),
('papa-ke-gaane','{"accent":"#d8a15d","haze":"#6d3429","pattern":"scanlines"}'::jsonb),
('corporate-majdoor','{"accent":"#6aa6c8","haze":"#253d52","pattern":"grid"}'::jsonb)
)
INSERT INTO public.ambience_profiles(scene_id,enabled,visual_theme)
SELECT s.id,true,p.visual FROM profiles p JOIN public.scenes s ON s.slug=p.slug
ON CONFLICT(scene_id) DO UPDATE SET enabled=true,visual_theme=EXCLUDED.visual_theme;

WITH stems(slug,name,role,path,ord,def_gain,min_gain,max_gain,crossfade,event_min,event_max) AS (VALUES
('sainik-dhaba','Highway bed','base','shared/indian-highway.wav',1,.16,.11,.21,3000,NULL,NULL),
('sainik-dhaba','Dhaba room tone','texture','rooms/sainik-dhaba/ambience/texture.wav',2,.08,.05,.12,2500,NULL,NULL),
('sainik-dhaba','Tawa and kitchen','event','rooms/sainik-dhaba/ambience/event.wav',3,.20,.14,.26,0,35,110),
('nai-ki-dukaan','Salon room tone','base','rooms/nai-ki-dukaan/ambience/base.wav',1,.15,.10,.20,3000,NULL,NULL),
('nai-ki-dukaan','Scissors','texture','rooms/nai-ki-dukaan/ambience/texture.wav',2,.07,.04,.11,2500,NULL,NULL),
('nai-ki-dukaan','Hair clipper','event','rooms/nai-ki-dukaan/ambience/event.wav',3,.18,.12,.24,0,35,110),
('bus-driver','Bus cabin','base','rooms/bus-driver/ambience/base.wav',1,.16,.11,.21,3000,NULL,NULL),
('bus-driver','Highway movement','texture','shared/indian-highway.wav',2,.07,.04,.11,2500,NULL,NULL),
('bus-driver','Bus horn','event','rooms/bus-driver/ambience/event.wav',3,.16,.10,.22,0,45,110),
('bartan-time','Plates washing','base','rooms/bartan-time/ambience/base.wav',1,.14,.09,.19,3000,NULL,NULL),
('bartan-time','Running water','texture','rooms/bartan-time/ambience/texture.wav',2,.08,.05,.12,2500,NULL,NULL),
('bartan-time','Pressure cooker','event','rooms/bartan-time/ambience/event.wav',3,.16,.10,.22,0,45,110),
('raj-mistri','Construction site','base','rooms/raj-mistri/ambience/base.wav',1,.14,.09,.19,3000,NULL,NULL),
('raj-mistri','Work crew','texture','rooms/raj-mistri/ambience/texture.wav',2,.07,.04,.10,2500,NULL,NULL),
('raj-mistri','Construction event','event','rooms/raj-mistri/ambience/event.wav',3,.15,.09,.21,0,40,110),
('papa-ke-gaane','Ceiling fan','base','rooms/papa-ke-gaane/ambience/base.wav',1,.14,.09,.19,2500,NULL,NULL),
('papa-ke-gaane','Cassette mechanism','texture','rooms/papa-ke-gaane/ambience/texture.wav',2,.07,.04,.10,2000,NULL,NULL),
('papa-ke-gaane','Newspaper pages','event','rooms/papa-ke-gaane/ambience/event.wav',3,.18,.12,.24,0,35,100),
('corporate-majdoor','Office room tone','base','rooms/corporate-majdoor/ambience/base.wav',1,.14,.09,.19,3000,NULL,NULL),
('corporate-majdoor','Printer rhythm','texture','rooms/corporate-majdoor/ambience/texture.wav',2,.06,.03,.09,2000,NULL,NULL),
('corporate-majdoor','AC shift','event','rooms/corporate-majdoor/ambience/event.wav',3,.15,.09,.21,0,40,110)
)
INSERT INTO public.sound_stems(scene_id,name,role,asset_id,sort_order,default_volume,min_gain,max_gain,crossfade_ms,event_min_seconds,event_max_seconds,is_active,category,synth_key)
SELECT s.id,st.name,st.role,a.id,st.ord,st.def_gain,st.min_gain,st.max_gain,st.crossfade,st.event_min,st.event_max,true,'ambient','sample'
FROM stems st JOIN public.scenes s ON s.slug=st.slug JOIN public.ambience_assets a ON a.storage_path=st.path;

DO $$ BEGIN
  IF (SELECT count(*) FROM public.sound_stems WHERE is_active) <> 21 THEN RAISE EXCEPTION 'Expected 21 active ambience stems'; END IF;
  IF EXISTS (SELECT scene_id FROM public.sound_stems WHERE is_active GROUP BY scene_id HAVING count(*) <> 3) THEN RAISE EXCEPTION 'Every ambience scene must have three stems'; END IF;
END $$;

COMMIT;
