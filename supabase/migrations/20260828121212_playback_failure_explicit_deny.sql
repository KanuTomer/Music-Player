-- Keep the health aggregate intentionally private while making the denial
-- explicit for security-advisor auditing.
CREATE POLICY "failure aggregates deny public"
ON public.playback_source_failures
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
