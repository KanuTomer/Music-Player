# Fast-Track Personal Supabase Exit

## Architecture

- Vercel: static frontend, same-origin API/auth proxy, cron relay, and public Blob storage.
- Render: Node API, Better Auth with TOTP, and room WebSockets.
- Neon: application data, authentication records, sessions, and chat.
- Supabase: disconnected from the accepted deployment, retained untouched for seven days as rollback.

This applies only to the personal repository and test deployment. The company repository and deployment are out of scope.

## Universal execution rules

- Use only terminal/CLI operations and file edits. Do not use Computer Use, picture-in-picture, browser automation, screenshots, mouse/keyboard automation, or visual desktop control unless Kanu explicitly authorizes it in the current request.
- When a dashboard or manual test is required, give Kanu exact instructions, stop, and wait for confirmation.
- Kanu performs browser, account, playback, UI, and UAT tests. A manual gate remains unchecked until Kanu reports success.
- Run proportionate automated checks: focused tests, type-check, targeted lint, builds, secret scan, and `git diff --check`.
- Do not use sub-agents unless explicitly requested.
- Never print or commit credentials, connection strings, passwords, tokens, MFA details, or secret keys.
- Never commit or push without explicit approval. Never touch the company repository without separate explicit confirmation.
- Preserve `drizzle/introspection/` and `drizzle/migrations-invalid-opclasses/`.

## Checklist

- [x] Define migration `0004_supabase_exit_auth_chat` for private Better Auth tables, administrator mapping, and Neon chat.
- [x] Apply and inspect `0004` on the populated personal Neon database (2026-09-17) through its direct local connection in one transaction; the expected seven tables, indexes, and foreign keys were verified read-only.
- [ ] Create the one replacement administrator and enrol TOTP. The account and Neon mapping were created on 2026-09-17; TOTP enrolment remains Kanu's first-login action.
- [x] Route browser API/auth through same-origin Vercel proxies with secure cookies.
- [x] Replace active Supabase Realtime with the Render WebSocket room channel.
- [x] Move chat persistence and expiry to Neon; historical chat is not migrated.
- [x] Replace active media URL/sign/download/remove operations with Vercel Blob.
- [x] Create the public Blob store and copy every referenced Supabase object without deleting the source (40 objects, hash/size/MIME verified, 2026-09-17).
- [x] Generate and import ignored Render and Vercel environment files (2026-09-17); deployment remains pending.
- [x] Complete focused automated checks: 39 tests, targeted lint, frontend/API builds, client-bundle secret scan, and `git diff --check` (2026-09-17).
- [ ] Complete Kanu's smoke test.
- [ ] Accept the cutover and begin the seven-day Supabase rollback-retention period.

## Dashboard handoff

1. Vercel personal project → Storage → Create Database → Blob → create a **public** store attached to this project.
2. Copy its read/write token into the ignored local migration environment only; never paste it into this document or chat.
3. Blob copy verification and environment generation are complete. Import `render-supabase-exit.env.local` into Render and `vercel-supabase-exit.env.local` into Vercel Production.
5. Deploy Render first, then Vercel from the identical personal `main` commit.

## Manual smoke test

Kanu verifies representative rooms and old/new media, music, oneliners, attribution, two-tab chat/reactions/presence, blocked links/emails, administrator sign-in and TOTP enrolment, a reversible gag-label save, a temporary background upload/revert/cleanup, and Render wake/reconnect.

## Rollback and retirement

On failure, redeploy the last Supabase-backed Vercel and Render commits with the ignored rollback environment. Leave Neon, Blob, and Supabase intact for diagnosis. After seven accepted days with no Supabase traffic, deletion of Supabase requires a separate explicit confirmation.

## Next action

With Kanu's explicit approval, commit and push only to `personal` (`KanuTomer/Music-Player`), deploy Render then Vercel from that same commit, and complete Kanu's manual smoke test.
