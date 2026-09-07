ALTER TABLE public.scenes
  ADD COLUMN background_storage_path TEXT,
  ADD COLUMN foreground_text_color TEXT;

UPDATE public.scenes
SET foreground_text_color = CASE
  WHEN is_dark THEN '#FFF3D6'
  ELSE '#20160F'
END
WHERE foreground_text_color IS NULL;

ALTER TABLE public.scenes
  ALTER COLUMN foreground_text_color SET DEFAULT '#FFF3D6',
  ALTER COLUMN foreground_text_color SET NOT NULL,
  ADD CONSTRAINT scenes_foreground_text_color_hex
    CHECK (foreground_text_color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT scenes_background_storage_path_safe
    CHECK (
      background_storage_path IS NULL
      OR background_storage_path ~ '^rooms/[a-z0-9-]+/background/[0-9a-f-]+\.webp$'
    );

CREATE OR REPLACE FUNCTION public.admin_save_scene_presentation(
  p_scene_id UUID,
  p_background_storage_path TEXT,
  p_foreground_text_color TEXT,
  p_gag_label TEXT,
  p_oneliners JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  item JSONB;
  item_id UUID;
  item_text TEXT;
  item_daypart TEXT;
BEGIN
  IF p_foreground_text_color !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Invalid foreground text color';
  END IF;
  IF length(trim(COALESCE(p_gag_label, ''))) > 80 THEN
    RAISE EXCEPTION 'Effect label is too long';
  END IF;
  IF p_oneliners IS NULL OR jsonb_typeof(p_oneliners) <> 'array' THEN
    RAISE EXCEPTION 'One-liners must be an array';
  END IF;
  IF jsonb_array_length(p_oneliners) > 100 THEN
    RAISE EXCEPTION 'A Jagah cannot have more than 100 one-liners';
  END IF;

  UPDATE public.scenes
  SET background_storage_path = p_background_storage_path,
      foreground_text_color = upper(p_foreground_text_color),
      gag_label = NULLIF(trim(COALESCE(p_gag_label, '')), '')
  WHERE id = p_scene_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Jagah not found'; END IF;

  DELETE FROM public.oneliners existing
  WHERE existing.scene_id = p_scene_id
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_oneliners) candidate
      WHERE NULLIF(candidate->>'id', '')::UUID = existing.id
    );

  FOR item IN SELECT value FROM jsonb_array_elements(p_oneliners)
  LOOP
    item_id := NULLIF(item->>'id', '')::UUID;
    item_text := trim(COALESCE(item->>'text', ''));
    item_daypart := COALESCE(NULLIF(item->>'daypart', ''), 'all');
    IF length(item_text) < 1 OR length(item_text) > 200 THEN
      RAISE EXCEPTION 'Each one-liner must contain 1 to 200 characters';
    END IF;
    IF item_daypart NOT IN ('all', 'morning', 'day', 'evening', 'night') THEN
      RAISE EXCEPTION 'Invalid one-liner daypart';
    END IF;

    IF item_id IS NULL THEN
      INSERT INTO public.oneliners(scene_id, text_en, text_hi, daypart_tag)
      VALUES (p_scene_id, item_text, item_text, item_daypart);
    ELSE
      UPDATE public.oneliners
      SET text_hi = item_text,
          daypart_tag = item_daypart
      WHERE id = item_id AND scene_id = p_scene_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'One-liner not found'; END IF;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_save_scene_presentation(UUID, TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_save_scene_presentation(UUID, TEXT, TEXT, TEXT, JSONB)
  TO service_role;

ALTER TABLE public.oneliners REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'scenes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.scenes;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'oneliners'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.oneliners;
  END IF;
END
$$;
