BEGIN;

ALTER TABLE public.ambience_profiles
  ADD COLUMN music_duck_ratio NUMERIC NOT NULL DEFAULT 0.40
  CHECK (music_duck_ratio BETWEEN 0 AND 1);

DROP POLICY IF EXISTS "live ambience profiles are public" ON public.ambience_profiles;
CREATE POLICY "live ambience profiles are public"
ON public.ambience_profiles FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.scenes scene
    WHERE scene.id = ambience_profiles.scene_id
      AND scene.is_live
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ambience_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ambience_profiles;
  END IF;
END
$$;

COMMIT;
