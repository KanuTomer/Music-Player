-- Admin foundation for genuine room analytics and curated queue management.
-- These tables are deliberately not exposed to browser roles. Admin mutations run
-- through authenticated server functions using the service role.

CREATE TABLE public.app_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.room_visits (
  id uuid PRIMARY KEY,
  scene_id uuid NOT NULL REFERENCES public.scenes(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  first_played_at timestamptz,
  last_heartbeat_at timestamptz,
  listening_seconds integer NOT NULL DEFAULT 0 CHECK (listening_seconds >= 0),
  CHECK (last_heartbeat_at IS NULL OR last_heartbeat_at >= started_at)
);

CREATE INDEX room_visits_scene_started_idx ON public.room_visits(scene_id, started_at DESC);
CREATE INDEX room_visits_started_idx ON public.room_visits(started_at DESC);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_visits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.app_admins, public.room_visits FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_admins, public.room_visits TO service_role;

CREATE OR REPLACE FUNCTION public.record_room_heartbeat(
  p_visit_id uuid,
  p_scene_id uuid,
  p_seconds integer
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_seconds < 1 OR p_seconds > 60 THEN
    RAISE EXCEPTION 'Invalid listening increment';
  END IF;
  UPDATE room_visits
  SET first_played_at = coalesce(first_played_at, now()),
      last_heartbeat_at = now(),
      listening_seconds = listening_seconds + p_seconds
  WHERE id = p_visit_id AND scene_id = p_scene_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_room_analytics(p_since timestamptz DEFAULT NULL)
RETURNS TABLE (
  scene_id uuid,
  visits bigint,
  played_visits bigint,
  listening_seconds bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rv.scene_id,
    count(*)::bigint AS visits,
    count(*) FILTER (WHERE rv.first_played_at IS NOT NULL)::bigint AS played_visits,
    coalesce(sum(rv.listening_seconds), 0)::bigint AS listening_seconds
  FROM public.room_visits rv
  WHERE p_since IS NULL OR rv.started_at >= p_since
  GROUP BY rv.scene_id;
$$;

-- Each procedure performs its entire queue mutation in the database transaction.
-- They are not callable by public or authenticated browser roles.
CREATE OR REPLACE FUNCTION public.admin_append_queue_tracks(
  p_curated_set_id uuid,
  p_tracks jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  target_track_id uuid;
  next_position integer;
  provider_id text;
BEGIN
  IF jsonb_typeof(p_tracks) <> 'array' OR jsonb_array_length(p_tracks) = 0 THEN
    RAISE EXCEPTION 'At least one track is required';
  END IF;
  IF jsonb_array_length(p_tracks) > 50 THEN
    RAISE EXCEPTION 'A bulk import is limited to 50 songs';
  END IF;

  PERFORM 1
  FROM curated_sets cs JOIN scenes s ON s.id = cs.scene_id
  WHERE cs.id = p_curated_set_id AND cs.is_active AND s.is_live
  FOR UPDATE OF cs;
  IF NOT FOUND THEN RAISE EXCEPTION 'The selected Jagah queue is unavailable'; END IF;

  SELECT coalesce(max(position), 0) INTO next_position
  FROM curated_set_tracks WHERE curated_set_id = p_curated_set_id;

  FOR item IN SELECT value FROM jsonb_array_elements(p_tracks)
  LOOP
    provider_id := item->>'video_id';
    IF provider_id IS NULL OR provider_id !~ '^[A-Za-z0-9_-]{11}$' THEN
      RAISE EXCEPTION 'Invalid YouTube video ID';
    END IF;

    SELECT track_id INTO target_track_id
    FROM playback_sources
    WHERE provider = 'youtube' AND provider_item_id = provider_id;

    IF target_track_id IS NULL THEN
      INSERT INTO tracks (catalogue_key, scene_id, title, artist, year, daypart_tag, sort_order)
      VALUES (
        'admin:youtube:' || provider_id,
        NULL,
        nullif(trim(item->>'title'), ''),
        nullif(trim(item->>'artist'), ''),
        nullif(item->>'year', '')::integer,
        'all',
        0
      ) RETURNING id INTO target_track_id;

      IF target_track_id IS NULL THEN
        RAISE EXCEPTION 'A track title is required';
      END IF;

      INSERT INTO playback_sources (
        track_id, provider, provider_item_id, source_url, provider_title,
        provider_channel, priority, validated_at, is_active
      ) VALUES (
        target_track_id, 'youtube', provider_id,
        'https://www.youtube.com/watch?v=' || provider_id,
        nullif(trim(item->>'provider_title'), ''),
        nullif(trim(item->>'provider_channel'), ''), 0, now(), true
      );
    END IF;

    IF EXISTS (
      SELECT 1 FROM curated_set_tracks
      WHERE curated_set_id = p_curated_set_id AND track_id = target_track_id
    ) THEN
      RAISE EXCEPTION 'That YouTube source is already in this Jagah';
    END IF;

    next_position := next_position + 1;
    INSERT INTO curated_set_tracks (curated_set_id, track_id, position, daypart_tag)
    VALUES (p_curated_set_id, target_track_id, next_position, 'all');
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_remove_queue_tracks(
  p_curated_set_id uuid,
  p_membership_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_count integer;
BEGIN
  IF coalesce(array_length(p_membership_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one song';
  END IF;

  PERFORM 1 FROM curated_sets cs JOIN scenes s ON s.id = cs.scene_id
  WHERE cs.id = p_curated_set_id AND cs.is_active AND s.is_live FOR UPDATE OF cs;
  IF NOT FOUND THEN RAISE EXCEPTION 'The selected Jagah queue is unavailable'; END IF;

  SELECT count(*) INTO remaining_count
  FROM curated_set_tracks
  WHERE curated_set_id = p_curated_set_id AND id <> ALL(p_membership_ids);

  IF remaining_count < 1 THEN
    RAISE EXCEPTION 'Every live Jagah must retain at least one playable song';
  END IF;

  DELETE FROM curated_set_tracks
  WHERE curated_set_id = p_curated_set_id AND id = ANY(p_membership_ids);

  UPDATE curated_set_tracks cst
  SET position = ordered.new_position + 10000
  FROM (
    SELECT id, row_number() OVER (ORDER BY position)::integer AS new_position
    FROM curated_set_tracks WHERE curated_set_id = p_curated_set_id
  ) ordered
  WHERE cst.id = ordered.id;

  UPDATE curated_set_tracks
  SET position = position - 10000
  WHERE curated_set_id = p_curated_set_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_queue_track(
  p_membership_id uuid,
  p_title text,
  p_artist text,
  p_year integer,
  p_video_id text,
  p_scope text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  membership curated_set_tracks%ROWTYPE;
  active_use_count integer;
  replacement_track_id uuid;
  old_source playback_sources%ROWTYPE;
BEGIN
  SELECT * INTO membership FROM curated_set_tracks WHERE id = p_membership_id;
  IF membership.id IS NULL THEN RAISE EXCEPTION 'Queue entry not found'; END IF;
  PERFORM 1 FROM curated_sets cs JOIN scenes s ON s.id = cs.scene_id
  WHERE cs.id = membership.curated_set_id AND cs.is_active AND s.is_live FOR UPDATE OF cs;
  IF NOT FOUND THEN RAISE EXCEPTION 'The selected Jagah queue is unavailable'; END IF;
  IF nullif(trim(p_title), '') IS NULL THEN RAISE EXCEPTION 'A track title is required'; END IF;
  IF p_video_id !~ '^[A-Za-z0-9_-]{11}$' THEN RAISE EXCEPTION 'Invalid YouTube video ID'; END IF;
  IF p_scope NOT IN ('shared', 'local') THEN RAISE EXCEPTION 'Invalid edit scope'; END IF;

  SELECT count(*) INTO active_use_count
  FROM curated_set_tracks cst JOIN curated_sets cs ON cs.id = cst.curated_set_id
  WHERE cst.track_id = membership.track_id AND cs.is_active;

  SELECT * INTO old_source FROM playback_sources
  WHERE track_id = membership.track_id AND provider = 'youtube' AND is_active
  ORDER BY priority LIMIT 1;

  IF p_scope = 'local' AND active_use_count > 1 THEN
    SELECT track_id INTO replacement_track_id FROM playback_sources
    WHERE provider = 'youtube' AND provider_item_id = p_video_id;
    IF replacement_track_id IS NULL THEN
      INSERT INTO tracks (catalogue_key, scene_id, title, artist, year, daypart_tag, sort_order)
      VALUES ('admin:youtube:' || p_video_id, NULL, trim(p_title), nullif(trim(p_artist), ''), p_year, 'all', 0)
      RETURNING id INTO replacement_track_id;
      INSERT INTO playback_sources (track_id, provider, provider_item_id, source_url, priority, validated_at, is_active)
      VALUES (replacement_track_id, 'youtube', p_video_id, 'https://www.youtube.com/watch?v=' || p_video_id, 0, now(), true);
    END IF;
    UPDATE curated_set_tracks SET track_id = replacement_track_id WHERE id = membership.id;
  ELSE
    UPDATE tracks SET title = trim(p_title), artist = nullif(trim(p_artist), ''), year = p_year
    WHERE id = membership.track_id;
    UPDATE playback_sources SET provider_item_id = p_video_id,
      source_url = 'https://www.youtube.com/watch?v=' || p_video_id,
      validated_at = now()
    WHERE id = old_source.id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_append_queue_tracks(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_remove_queue_tracks(uuid, uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_update_queue_track(uuid, text, text, integer, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_room_heartbeat(uuid, uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_room_analytics(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_append_queue_tracks(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_remove_queue_tracks(uuid, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_queue_track(uuid, text, text, integer, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_room_heartbeat(uuid, uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_room_analytics(timestamptz) TO service_role;
