# Render Backend Migration Runbook

## Architecture and Status

- Repository: `KanuTomer/Music-Player`; personal `main` is the deployment branch.
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

- [x] Stage 1 — Separate the static frontend and Render API; implementation commit `0e6d268`.
- [x] Stage 2 — Fast-forward the tested Render implementation to personal `main`; accepted deployment commit `ce5e84b`.
- [x] Stage 3 — Accept the personal Production deployment; completed on 2026-09-15.
- [ ] Stage 4 — Replace the remaining Supabase services after the Render cutover. **Current stage.**

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

## Stage 2 — Personal `main` Render Cutover

The existing Render service remains `music-player-api-test` in the confirmed `Litmustest` workspace. It uses the personal repository and must be switched from `feat/neon-database-port` to `main`; auto-deploy remains disabled. Personal `main` at `b47d788` is a clean fast-forward ancestor of Render implementation commit `0e6d268`.

Generate two ignored, authoritative import files with `bun scripts/generate-render-env.mjs`:

- `render-main.env.local`: the pooled `music_app_runtime` Neon URL, all five Neon selectors, temporary production Supabase server values, matching cron secret, production/main Vercel origins, and production mode. It never contains the unpooled URL.
- `vercel-main-production.env.local`: Render API/relay URLs, temporary production Supabase browser values, personal canonical site URL, and matching cron secret. It never contains a database URL or Supabase server secret.

Cutover sequence:

1. Kanu imports `vercel-main-production.env.local` into personal Vercel project `music-player`, scoped to **Production**.
2. Kanu imports `render-main.env.local` into `music-player-api-test`, changes the Render branch to `main`, leaves auto-deploy off, and does not manually deploy yet.
3. Commit the runbook/generator corrections on top of `0e6d268`, verify the staged secret scan, and push that exact commit directly to personal `main` only.
4. Vercel builds personal Production from `main`; trigger Render from the same commit through the Render connector.
5. Verify commit parity, `/healthz`, `/readyz`, CORS for the Production and main-alias origins, seven room reads, production Storage references, Neon activity, and a secret-free static bundle.

Keep legacy Vercel server variables until acceptance so deployment `b47d788` remains immediately restorable. After UAT, remove the obsolete Vercel database URLs, backend selectors, and Supabase server-only variables; retain only the static frontend and cron-relay variables.

Completion recorded on 2026-09-15:

- Kanu imported both generated environment files and changed `music-player-api-test` to personal `main` with automatic deployment disabled.
- Personal `main`, Vercel Production deployment `dpl_B8EzJY8bgpvaksbrnxWzdNTojW9t`, and Render deployment `dep-dakcd7fqj5pc73alrdt0` use commit `ce5e84b957c5a5ba82755dfc4b26e26363c5a497`.
- Vercel reports `READY`; Render reports `live`; Render `/healthz` and `/readyz` return HTTP 200.
- Exact CORS checks passed for the personal Production domain and personal `main` alias.
- The API returned all seven live Neon rooms in the expected order. Representative room media used only production Supabase Storage URLs, and every checked object returned HTTP 200.
- The deployed frontend contains the Render API URL and production Supabase project reference, with no rehearsal project reference, PostgreSQL URL, runtime-role name, unpooled variable, or Supabase server-secret variable.
- Vercel and Render reported no runtime errors after the accepted deployment. The cleanup-relay test was moved outside Vercel's reserved `/api` directory in `ce5e84b`, removing the former nonfatal `bun:test` function-build error.

## Stage 3 — Personal Production Acceptance

Kanu verifies all seven rooms, music, old/new ambience, presentation, queue order, oneliners, attribution, chat blocking, reactions, and two-tab presence. Kanu then signs in with the disposable administrator, enrolls MFA, verifies dashboard reads, performs and reverts one gag-label change, confirms Realtime refresh, and compares one cold Render request with a warm request. Cleanup is invoked only through the protected relay and without adding new media.

Manual acceptance reported by Kanu on 2026-09-15. The post-UAT read-only baseline at `2026-09-15T08:06:26Z` confirmed:

- Seven live Neon scenes, two room visits since deployment, and current listening/visit activity.
- The expected administrator audit activity, three allowlisted administrators, zero unfinished reservations, and zero pending cleanup rows.
- No Render or Vercel runtime errors after deployment.
- The personal homepage, Render liveness/readiness endpoints, and protected cleanup relay remained healthy.

The required two-hour observation ran from `2026-09-15T08:06:26Z` to approximately `2026-09-15T10:09Z`. The one-hour and two-hour gates were clean: Render remained live, Vercel remained ready, all health checks returned HTTP 200, and there were zero Render/Vercel errors, repeated 5xx responses, invalid Neon visits, unfinished reservations, or pending cleanup rows. Stage 3 completed on 2026-09-15.

On failure, restore personal Vercel deployment `b47d788` and redeploy Render commit `0e6d268`. Neon and Supabase remain unchanged. Observe an accepted deployment for two hours before closing Stage 3.

## Stage 4 — Deferred Supabase Exit

Supabase removal begins only after Stage 3:

1. **Clerk Auth/MFA/JWT:** require email/password plus authenticator TOTP and backup codes. Render verifies Clerk JWT signature, issuer, expiry, authorized party, and recent second-factor verification. Add a Neon identity mapping from Clerk's string subject to the existing internal administrator UUID so audit and ownership foreign keys do not change. Recreate administrators and re-enroll MFA; never migrate passwords or TOTP secrets.
2. **Cloudflare R2 media:** copy all referenced ambience/background objects with identical paths, MIME types, sizes, and hashes. Render issues path-scoped presigned uploads and owns downloads/removals; public reads use an R2 custom domain. Keep Supabase Storage unchanged until hash and reference reconciliation passes.
3. **Neon chat:** add a tracked `chat_messages` migration, route validated inserts through Render, broadcast only after commit, and move retention cleanup to Neon. Expired Supabase chat history is not migrated.
4. **Ably Realtime:** use one room channel for chat delivery, reactions, presence, and `room_refresh`. Render issues short-lived room-scoped tokens; clients never receive the Ably API key. Preserve refresh coalescing and player-state behavior.

Use `AUTH_BACKEND`, `STORAGE_BACKEND`, and `REALTIME_BACKEND` rollback switches during their respective migrations. After final acceptance, remove `@supabase/supabase-js`, every Supabase environment variable, the old provider switches, and the disposable Supabase administrator.

## Next Session

Stage 4 is current. Plan the first remaining Supabase replacement before implementation, retaining the accepted personal Render/Vercel/Neon deployment and rollback deployment `b47d788`. Do not remove legacy variables, commit, push, or begin a provider migration without a separate instruction.
