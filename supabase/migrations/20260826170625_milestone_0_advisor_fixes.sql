-- Resolve the actionable performance-advisor findings present after the
-- catalogue cutover while preserving the existing authorization model.
CREATE INDEX IF NOT EXISTS generated_rooms_remix_of_idx
  ON public.generated_rooms (remix_of);

CREATE INDEX IF NOT EXISTS oneliners_scene_id_idx
  ON public.oneliners (scene_id);

CREATE INDEX IF NOT EXISTS saved_rooms_generated_room_id_idx
  ON public.saved_rooms (generated_room_id);

CREATE INDEX IF NOT EXISTS saved_rooms_scene_id_idx
  ON public.saved_rooms (scene_id);

CREATE INDEX IF NOT EXISTS scenes_sponsor_id_idx
  ON public.scenes (sponsor_id);

CREATE INDEX IF NOT EXISTS sound_stems_scene_id_idx
  ON public.sound_stems (scene_id);

CREATE INDEX IF NOT EXISTS tracks_scene_id_idx
  ON public.tracks (scene_id);

DROP POLICY IF EXISTS "own profile" ON public.profiles;
CREATE POLICY "own profile"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "own saved rooms" ON public.saved_rooms;
CREATE POLICY "own saved rooms"
  ON public.saved_rooms
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
