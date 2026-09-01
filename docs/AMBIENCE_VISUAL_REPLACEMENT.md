# Replacing Ambience Visuals

Ambience visuals are silent, looping videos layered over each Jagah while Ambience is on. The
source downloads and processed videos stay outside Git. The repository records source metadata,
processing settings, and the database migration that selects the published overlay.

## Find a suitable clip

Check the licence on the individual download page before using any asset. Save the source page,
licence name and URL, download date, original duration, and SHA-256 checksum.

- [Mixkit](https://mixkit.co/license/) is the first choice because the existing pipeline already
  uses it. Select only clips covered by the **Stock Video Free License**, not the Restricted
  License.
- [Pexels](https://www.pexels.com/legal-pages/license/) provides free commercial-use footage that
  can be modified. Avoid recognisable people, brands, or implied endorsements.
- [Pixabay](https://pixabay.com/service/license-summary/) permits free use and adaptation subject
  to its prohibited uses. Do not redistribute an unmodified clip or use problematic trademarks.

Choose a horizontal clip at least six seconds long with no text, logos, or prominent people.
Subtle movement, a locked camera, and dark or black backgrounds blend best. Audio is not needed.

| Jagah             | Useful searches                                                           |
| ----------------- | ------------------------------------------------------------------------- |
| Sainik Dhaba      | `warm road dust`, `heat haze`, `sun flare trees`, `cooking steam overlay` |
| Deluxe Salon      | `mirror light reflection`, `salon bokeh`, `dust sunbeam`                  |
| Bus Driver        | `road light trails`, `dashboard reflection`, `traffic bokeh`; avoid rain  |
| Bartan Time       | `kitchen steam`, `water reflection`, `metal sparkle overlay`              |
| Raju Mistri       | `sunlit construction dust`, `tan dust particles`, `light shaft dust`      |
| Papa Ke Gaane     | `CRT scanlines`, `VHS static`, `television flicker`                       |
| Corporate Majdoor | `fluorescent flicker`, `monitor glow`, `office dust bokeh`                |

## Prepare one replacement

1. Create source and output directories outside the repository.
2. Save the downloaded clip as `<scene-slug>.source.mp4` in the source directory.
3. Generate its checksum in PowerShell:

   ```powershell
   Get-FileHash -Algorithm SHA256 -LiteralPath '<source-dir>\<scene-slug>.source.mp4'
   ```

4. Edit the matching entry in `scripts/prepare-ambience-visuals.mjs`. Update `title`,
   `sourcePage`, `downloadUrl`, `sourceDurationSeconds`, `sourceSha256`, and `sourceFile` when the
   filename differs from the default. When the source is not Mixkit, also set `publisher`,
   `licenseName`, `licenseUrl`, and `acquiredAt` on that asset. Set a new versioned `storagePath`,
   for example:

   ```text
   rooms/raj-mistri/ambience/overlay-v3.mp4
   ```

   Never overwrite an old public path. Storage uses a one-year cache, so a new path prevents a
   browser or CDN from continuing to serve the previous clip.

5. Adjust only when the preview requires it:

   - `blendMode`: `screen` for light-on-dark effects; `soft-light` for full-frame colour or haze.
   - `playbackRate`: normally `0.55`–`0.9`; slower motion is less distracting.
   - `opacityFloor` and `opacityCeiling`: start around `0.18` and `0.42`.

6. Process only the selected Jagah:

   ```powershell
   bun scripts/prepare-ambience-visuals.mjs '<source-dir>' '<output-dir>' '<scene-slug>'
   ```

The script verifies the source checksum, removes audio, uses the first six seconds, scales to
640px wide, encodes H.264 at 24fps, and appends a reversed copy to form a 12-second loop. Review
the MP4 under `<output-dir>/rooms/<scene-slug>/ambience/` and confirm it is under 15 MB with no
obvious midpoint or end seam.

## Upload and publish

Load `SUPABASE_URL` and `SUPABASE_SECRET_KEY` from a private environment file, then upload and
verify the prepared object:

```powershell
bun scripts/upload-ambience-visuals.mjs '<output-dir>' '<scene-slug>'
```

Create a new additive migration. Do not edit a migration that has already been applied:

```powershell
npx supabase migration new replace_<scene_slug>_ambience_visual
```

Use the migration to merge the new visual settings into the existing profile:

```sql
UPDATE public.ambience_profiles AS profile
SET visual_theme = profile.visual_theme || jsonb_build_object(
  'overlay_path', 'rooms/<scene-slug>/ambience/overlay-v3.mp4',
  'blend_mode', 'soft-light',
  'playback_rate', 0.7,
  'opacity_floor', 0.18,
  'opacity_ceiling', 0.42
)
FROM public.scenes AS scene
WHERE profile.scene_id = scene.id
  AND scene.slug = '<scene-slug>';
```

Inspect the linked migration before applying it:

```powershell
npx supabase db push --dry-run
npx supabase db push
```

After publishing, verify the Storage URL returns `video/mp4`, open the affected room directly,
and test Ambience at 25, 50, and 100. Check desktop, mobile, and reduced-motion mode. The overlay
must remain thematic, must not hide the player or room, and must disappear when Ambience is off.
