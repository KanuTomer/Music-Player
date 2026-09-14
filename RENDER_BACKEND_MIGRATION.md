# Render Backend Migration Runbook

## Architecture and Status

- Repository: `KanuTomer/Music-Player`, branch `feat/neon-database-port`.
- Frontend: static Vite/TanStack Router application on personal Vercel.
- Backend: Node API on Render Free in Singapore.
- Database: existing Neon PostgreSQL in Singapore.
- Supabase remains responsible for Auth, MFA, Storage, Realtime, chat, reactions, and presence.
- Vercel Cron calls a minimal relay; cleanup logic and database access execute on Render.
- The former Vercel Edge proposal is discarded. No Edge migration is in progress.
- No Neon schema migration or data copy is expected.

## Universal Execution Rules

These rules apply to every stage below and every future plan derived from this runbook.

- Use only terminal/CLI operations and file edits.
- Never use Computer Use, picture-in-picture, browser automation, screenshots, mouse/keyboard automation, or visual desktop control unless Kanu explicitly authorizes it in the current request.
- When a dashboard or visual action is required, give Kanu exact instructions, stop, and wait for confirmation.
- Never perform browser, account, playback, manual UI, or UAT tests. Give Kanu detailed instructions and wait for the result.
- A stage requiring manual verification remains unchecked until Kanu reports success. Do not proceed to the next stage while required testing is pending.
- Run proportionate automated checks: focused tests, affected suites, the full Bun suite where appropriate, type-checking, linting, production builds, secret scanning, and `git diff --check`.
- Do not use sub-agents or delegated workers unless Kanu explicitly requests them.
- Work in the personal repository first. Never modify the company repository, open a company PR, or deploy the company application without explicit confirmation.
- Do not commit or push without explicit approval.
- Never print or commit credentials, connection strings, tokens, passwords, MFA details, or secret keys.
- Preserve `drizzle/introspection/` and `drizzle/migrations-invalid-opclasses/` without modifying or staging them.
- After acceptance, record the date, checks, commit if one exists, and next unchecked action.

## Tracker

- [ ] Stage 1 — Separate the static frontend and Render API. **Current stage: implementation complete; awaiting Kanu's manual test.**
- [ ] Stage 2 — Deploy personal Render and Vercel rehearsal.
- [ ] Stage 3 — Accept and cut over personal Production.

## Stage 1 — Separate Frontend and Render API

Implementation:

1. Build the browser application into `dist-web` with Vite and TanStack Router.
2. Preserve the existing function-shaped frontend interfaces while routing them through a typed `/api/v1` client.
3. Build one Hono Node API into `dist-render/server.mjs`; bind `0.0.0.0:$PORT` and expose `/healthz` and `/readyz`.
4. Reuse the tested public, operational, administrator, Storage, Realtime, and cleanup services.
5. Populate a Node request context from API middleware so administrator JWT/AAL2 verification retains its existing behavior.
6. Use one pooled Neon process connection and close it during graceful shutdown.
7. Restrict browser origins, validate inputs, keep safe error envelopes, and prevent secrets from entering the static bundle.
8. Keep Vercel `/api/admin-cleanup` as a secret-protected relay to Render.

Completion gate:

- Focused transport/API tests, existing affected tests, full Bun tests, type-check, lint, both production builds, secret scan, and `git diff --check` pass.
- Stage 1 remains unchecked until Kanu completes the supplied local manual tests.

Automated results on 2026-09-12:

- Added the static frontend, typed API client, Render Hono API, Node request context, pooled Neon shutdown handling, Vercel cleanup relay, and Render Blueprint.
- Focused API, request-context, relay, room-route, and administrator authentication tests pass.
- Full suite passes: 187 tests, zero failures.
- Targeted lint for every Stage 1 source passes.
- Static and Render production builds pass. The Render entry is `dist-render/server.mjs`.
- A read-only request through the Hono boundary returned seven live Neon scenes.
- Pooled Neon TLS is normalized to `verify-full`; the former compatibility warning is absent.
- Static bundle scanning found no database URL, unpooled URL, Supabase secret, cron secret, Node request context, or Drizzle server marker.
- `git diff --check` passes. `render-backend.env.local` was generated with 13 variables, contains no unpooled URL, and is ignored by Git.
- The repository-wide type-check remains red with 81 previously known errors, dominated by missing Bun test declarations and existing strictness errors outside the new production files. The new production transport/API files add no type error.
- Repository-wide lint retains the previously known formatting errors and warnings in unrelated existing files. Targeted Stage 1 lint is clean.
- Render CLI and a local YAML parser are unavailable; the Blueprint will receive Render's authoritative validation when Kanu connects it in Stage 2.

## Stage 2 — Personal Render and Vercel Rehearsal

Render configuration is tracked in `render.yaml`. It describes the rehearsal service `music-player-api-test`, Node 22.23.1, Bun 1.4.0, Singapore, Free plan, `/healthz`, and disabled automatic deployment. This service may run in the company Render workspace but remains connected only to the personal repository during rehearsal. The later company-repository deployment uses a separate properly named `music-player-api` service so its environment, URL, deployment history, and rollback path remain isolated.

Dashboard handoff after Stage 1 acceptance:

1. Push only after Kanu explicitly approves it; the Blueprint must exist on personal GitHub before Render can read it.
2. Render Dashboard → **New** → **Blueprint** → select `KanuTomer/Music-Player` → branch `feat/neon-database-port`.
3. Confirm Singapore, Free, `/healthz`, the tracked build/start commands, and auto-deploy off.
4. Supply the secret variables from ignored `render-backend.env.local`; never add `DATABASE_URL_UNPOOLED`.
5. Deploy and report the generated `https://…onrender.com` URL.
6. Generate ignored `vercel-render-frontend.env.local` containing only `VITE_API_BASE_URL` and `RENDER_API_BASE_URL` for that Render URL.
7. Import it into the personal Vercel project with Preview scope first. Preserve existing browser Supabase variables, `VITE_SITE_URL`, and `CRON_SECRET`.

Completion gate:

- Render reports live; health and readiness pass; Vercel Preview uses the exact accepted commit; logs and client-bundle secret checks are clean.
- Kanu accepts public rooms, admin MFA, a reversible presentation change, one temporary background workflow, Realtime refresh, cleanup relay, and cold/warm behavior.

## Stage 3 — Personal Production Cutover

1. After explicit approval, commit the accepted feature branch changes and push only to the personal repository.
2. Deploy the accepted Render commit.
3. Scope the two Render URL variables to personal Vercel Production, then fast-forward and push personal `main`.
4. Verify deployments, health, readiness, logs, Neon activity, Supabase integrations, cron forwarding, and bundle-secret safety through CLI or MCP.
5. Kanu performs remaining Production UI/UAT checks.
6. Observe the accepted deployment for two hours before closing this runbook.

Rollback uses personal Vercel deployment `b47d788`, restoring the former Vercel-hosted Node backend. Render and Neon remain intact for diagnosis.

## Manual Stage 1 Test (Pending)

1. Do not edit or share any values from `.env.local` or `.env.development.local`.
2. Open PowerShell in `C:\Kanu\Kanu(D)\Music App\music-app-sync`.
3. In terminal one run `bun run dev:api`. Wait for `[render-api] listening` on port `8787`.
4. In terminal two run `bun run dev:web`. Open the printed local URL manually; it should normally be `http://localhost:5173`.
5. Confirm the homepage loads the expected seven rooms and a missing room retains normal not-found behavior.
6. Open at least one room using an older ambience asset and the room using the newly uploaded ambience asset. Confirm presentation, queue, music, ambience, oneliners, and attribution.
7. Open one room in two tabs. Confirm chat, reactions, and presence still synchronize; confirm URL and email messages remain blocked.
8. Sign out of administration, sign in again, complete MFA, and confirm bootstrap, analytics, songs, ambience, assets, and backgrounds load.
9. Make and immediately revert one harmless gag-label change. Confirm the public room refreshes without a reload and the player keeps its play/pause state.
10. Do not upload media and do not invoke cleanup during this Stage 1 test.
11. Stop both processes with `Ctrl+C` after testing.
12. Report pass/fail plus relevant browser or terminal errors without sharing credentials or tokens.

## Next Session

Wait for Kanu's Stage 1 manual result. Do not deploy, commit, push, or begin Stage 2 before manual acceptance passes.
