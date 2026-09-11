# Neon Production Migration Runbook

Last updated: 2026-09-11  
Repository: `KanuTomer/Music-Player`  
Working branch: `feat/neon-database-port`  
Local checkout: `C:\Kanu\Kanu(D)\Music App\music-app-sync`

## Purpose

This file is the persistent source of truth for moving the application's PostgreSQL data from Supabase to Neon. Read it before starting a new migration session, resume from the first unchecked stage, and update the stage tracker and **Next session** section after completing verified work.

The first production release is intentionally hybrid:

- Neon owns catalogue, room, playback, ambience, analytics, administrator, audit, provenance, reservation, and retention data.
- Supabase continues to provide Auth and MFA, Storage objects, live chat, reactions, presence, and Realtime broadcasts.
- Vercel Node.js Functions are the only application interface to Neon. Browsers never receive a database credential.
- The temporary Neon branch is a rehearsal environment. It must never be promoted directly to production.

## Safety Rules

- Use only terminal/CLI operations and file edits unless Kanu explicitly authorizes another interaction method in the current request.
- Never use Computer Use, picture-in-picture, mouse/keyboard automation, or visual desktop control without that explicit authorization.
- When dashboard or visual verification is required, give Kanu detailed manual instructions, stop, and wait for completion.
- The agent performs default automated checks: targeted tests, type-checking, linting, and a production build.
- The agent does not perform browser, UI, UAT, user-account, or other manual user tests. A stage requiring them remains unchecked until Kanu reports completion.
- Do not proceed to the next stage while a required user test is outstanding.
- Do not use sub-agents or delegated workers unless Kanu explicitly requests them.
- Develop and complete UAT in the personal repository and personal Vercel preview first.
- Never create, update, or merge a company PR without Kanu's explicit confirmation.
- Never store passwords, connection strings, access tokens, service keys, authenticator secrets, or other credentials in this file or Git.
- Use Neon's pooled connection (`DATABASE_URL`, hostname containing `-pooler`) for application runtime traffic.
- Use Neon's direct connection (`DATABASE_URL_UNPOOLED`, hostname without `-pooler`) for migrations, dumps, restores, and administrative database work.
- Never prefix a database credential with `NEXT_PUBLIC_`.
- Keep Supabase Auth, Storage, and Realtime active during this migration release.
- Do not delete or modify the old Supabase application tables until production acceptance and the observation period are complete.
- Do not improvise SQL against production or manually modify migration history.
- Keep the pre-existing untracked directories `drizzle/introspection/` and `drizzle/migrations-invalid-opclasses/` untouched unless a later task explicitly addresses them.

## Stage Tracker

- [x] Stage 1 — Validate the temporary Neon catalogue copy.
- [x] Stage 2 — Create and publish the personal migration branch.
- [x] Stage 3 — Add pinned Neon/Drizzle database dependencies.
- [x] Stage 4 — Define local connection-variable conventions.
- [x] Stage 5 — Add the portable Neon catalogue schema and baseline migration.
- [x] Stage 6 — Add the server-only pooled Neon database client.
- [x] Stage 7 — Port public room reads to Neon behind a backend switch.
- [x] Stage 8 — Port low-risk operational writes.
- [x] Stage 9 — Reuse Supabase JWT authentication for Neon-backed routes.
- [x] Stage 10 — Port administrator RPC behavior to atomic Neon transactions.
- [x] Stage 11 — Integrate Neon records with Supabase Storage.
- [x] Stage 12 — Preserve chat and Realtime behavior.
- [x] Stage 13 — Port cleanup and retention safely across both providers.
- [x] Stage 14 — Complete personal Vercel preview UAT.
- [x] Stage 15 — Test application and data rollback.
- [x] Stage 16 — Create the clean Neon production environment.
- [x] Stage 17 — Prepare the production maintenance window and backups.
- [x] Stage 18 — Export fresh production data from Supabase.
- [x] Stage 19 — Restore and reconcile production data in Neon.
- [x] Stage 20 — Configure and deploy Vercel Production.
- [ ] Stage 21 — Complete production public-read verification. **Current stage**
- [ ] Stage 22 — Complete production administrator acceptance.
- [ ] Stage 23 — Resume operations and monitor the observation period.

## Completed Work

### Stage 1 — Temporary Neon rehearsal

Selected portable catalogue tables were exported from Supabase and restored into a temporary Neon branch. This proved PostgreSQL connectivity and basic table/data compatibility. It did not validate Supabase Auth, Storage, Realtime, administrator RPCs, RLS, cleanup, or the production application.

Completion evidence:

- The temporary branch contains the selected catalogue data.
- Supabase remained the production source of truth.
- The rehearsal branch is not approved for production promotion.

### Stage 2 — Personal development branch

The migration work is isolated on personal branch `feat/neon-database-port` and published to `KanuTomer/Music-Player`.

### Stage 3 — Database dependencies

Commit `d442741` added the pinned Neon/Drizzle database dependencies required for PostgreSQL schema management and Vercel runtime access.

### Stage 4 — Connection conventions

The migration uses these server-only variable names:

- `DATABASE_URL` for pooled application traffic.
- `DATABASE_URL_UNPOOLED` for migrations and administrative tools.
- `DATA_BACKEND` as the temporary `supabase`/`neon` backend selector when that switch is introduced.

Actual values must remain in local ignored environment files or Vercel environment settings, never in Git.

### Stage 5 — Portable catalogue schema

Commit `917e76a` added the portable Neon catalogue schema and baseline migration. The schema preserves standard PostgreSQL tables, constraints, indexes, and relationships while excluding Supabase-managed roles, Auth dependencies, RLS policies, Storage schemas, Realtime publications, and Supabase migration history.

Completion gate already met: the baseline is represented as code rather than relying solely on the manually restored rehearsal schema.

### Stage 6 — Server-only database client

Commit `d102aa0` added the server-only Neon database client. It:

- Requires a valid pooled `DATABASE_URL`.
- Rejects a runtime hostname that does not contain `-pooler`.
- Reuses a bounded PostgreSQL pool.
- Attaches the pool to the Vercel Function lifecycle.
- Exposes the Drizzle client only from a server module.

## Remaining Stages

### Stage 7 — Port public room reads

Goal: serve public catalogue and room hydration from Neon without changing the UI response contract.

Status: completed on 2026-09-10 after automated verification and user-run manual acceptance.

Automated verification recorded on 2026-09-10:

- Focused Stage 7 and room-route tests: 9 passed.
- Full Bun suite: 111 passed.
- Targeted ESLint for Stage 7 files: passed.
- Production build: passed using the Vercel Node.js 22 runtime.
- Stage 7 source files have no TypeScript errors. The repository-wide type-check remains blocked by pre-existing errors, including missing `bun:test` type declarations and unrelated strictness failures.
- The repository-wide lint remains blocked by pre-existing formatting/errors outside Stage 7; only Stage 7 files were formatted and their targeted lint passes.

Manual verification completed by Kanu on 2026-09-10:

- All public Neon-backed room reads passed.
- Room presentation, queues, playback, ambience, oneliners, and attribution passed.
- Missing and retired route behavior passed.
- Supabase-backed chat and reactions remained functional.
- Representative Supabase fallback comparisons passed.

Actions:

1. Keep the current Supabase implementation in `src/lib/rooms.server.ts` available for rollback.
2. Add a Neon repository for live scenes, individual rooms, playlists, ordered tracks, playback sources, oneliners, ambience profiles, sound stems, asset metadata, attribution, and presentation paths.
3. Add a server-only `DATA_BACKEND` selector. `supabase` uses the existing repository; `neon` uses the new repository. Default safely to `supabase` when the variable is absent during the transition.
4. Preserve all existing return types and JSON shapes so route components and room UI do not need provider-specific branches.
5. Continue converting stored media paths into Supabase Storage URLs on the server.
6. Do not add Neon credentials or direct Neon calls to client components.

Completion gate:

- Every live room produces equivalent Supabase and Neon results for catalogue, queue, ambience, attribution, and presentation data.
- Focused repository tests, type-checking, and the production build pass.
- Switching `DATA_BACKEND` back to `supabase` restores the existing behavior.

### Stage 8 — Port low-risk operational writes

Goal: move operational database writes without allowing them to disrupt playback.

Status: completed on 2026-09-11 after automated verification, Neon database verification, and user-run manual acceptance.

Implemented:

- Added an independent, server-only `OPERATIONAL_WRITE_BACKEND` selector that defaults to Supabase.
- Added portable Neon `room_visits` and `playback_source_failures` tables in migration `0001_neon_operational_writes`.
- Ported room-visit registration, listening heartbeats, and playback-source failure aggregation behind lazily loaded Supabase and Neon repositories.
- Added shared UUID, scene-slug, listening-duration, and playback-error validation without changing the public server-function contracts.
- Kept admin analytics derived from `room_visits`; no standalone analytics-event model was added.

Automated verification recorded on 2026-09-11:

- Focused Stage 8 and room-route tests: 15 passed.
- Full Bun suite: 121 passed.
- Targeted ESLint for Stage 8 application and test files: passed.
- Production build: passed using the Vercel Node.js 22 runtime.
- The repository-wide type-check remains blocked only by the previously recorded strictness failures and missing `bun:test` declarations; it reported no new Stage 8 application error.
- The repository-wide lint remains blocked by pre-existing formatting and warnings outside the formatted Stage 8 application/test files and the generated Drizzle schema.
- The migration applied successfully to the clean schema-rehearsal database and the populated temporary Neon rehearsal database.
- The populated rehearsal database was manually imported and has no Drizzle history, so `0001` was executed from the tracked SQL file only for UAT; never run the full migrator against or promote that branch.
- Transactional Neon assertions passed for visit deduplication, live-scene filtering, heartbeat accumulation/timestamps, mismatched-scene no-ops, failure aggregation, error-code separation, constraints, and foreign keys; all fixtures were rolled back.
- The compiled Stage 8 repository queries also executed successfully against the populated Neon rehearsal database inside a rolled-back transaction.

Manual verification completed by Kanu on 2026-09-11:

- Neon-backed room visits and listening heartbeats completed without interrupting public room hydration or playback.
- Supabase operational-write fallback continued to work after restarting the application.
- Chat and reactions remained on Supabase and continued to work.
- Neon was slightly slower than Supabase during the test, consistent with the Neon compute being in Singapore rather than Mumbai; the difference was accepted for this rehearsal.
- Read-only post-test verification found 9 visits, 5 played visits, and 13 accumulated listening seconds in Neon.

Actions:

1. Port room visits, playback heartbeats, playback-source failure reports, and analytics events to server-only Neon queries.
2. Validate inputs and use parameterized queries.
3. Make non-critical telemetry failures observable but non-blocking for public listening.
4. Preserve deduplication and occurrence-count behavior from the existing database implementation.

Completion gate:

- Valid events are stored once with expected timestamps/counts.
- Invalid identifiers and error codes are rejected.
- A temporary Neon failure does not prevent room hydration or playback.

### Stage 9 — Supabase JWT authentication for Neon routes

Goal: retain Supabase Auth/MFA while authorizing Neon-backed server operations securely.

Status: completed on 2026-09-11 after automated verification and Kanu's manual acceptance.

Implementation recorded:

- Added strict, server-only Supabase JWT verification for signature, issuer, authenticated audience and role, expiry, UUID subject, anonymous status, and AAL.
- Added independent `ADMIN_AUTHORIZATION_BACKEND` routing with a safe Supabase default and lazy Neon repository loading.
- Added the portable Neon `app_admins` allowlist and migration `0002_neon_admin_authorization.sql`; it stores only the external Supabase user UUID and creation timestamp, with no `auth.users` dependency.
- Applied the migration transactionally to the populated temporary Neon rehearsal database and copied the one UUID from the matching Supabase allowlist. Supabase and Neon UUID sets matched.
- Rehearsal database checks confirmed the expected columns, primary key, no foreign key, arbitrary external UUID support, duplicate rejection, and transactional fixture rollback.

Automated verification recorded:

- Focused authentication, authorization, Neon allowlist, and existing administrator tests: 36 passed.
- Full Bun suite: 143 passed.
- Targeted Stage 9 ESLint: passed.
- Production build: passed using the Vercel Node.js 22 runtime.
- Stage 9 source files introduce no TypeScript errors. The repository-wide type-check remains blocked by the previously recorded missing `bun:test` declarations and unrelated strictness errors.
- Repository-wide lint remains blocked by pre-existing formatting and hook findings outside Stage 9; Stage 9 files pass targeted lint.

Manual verification completed by Kanu on 2026-09-11:

- The replacement rehearsal administrator was confirmed in Supabase Auth and in both matching administrator allowlists.
- Supabase reported one verified TOTP factor for the replacement account.
- Password-only access remained blocked until MFA verification.
- The Neon-authorized administrator dashboard, representative reads, and the harmless no-op save passed.
- The Supabase authorization fallback passed after restart.

Actions:

1. Read the bearer token from protected requests and verify it using the existing Supabase server authentication path.
2. Validate signature, issuer, audience, expiry, and subject; never trust a user ID supplied in request data.
3. Store the Supabase user UUID as an external UUID in Neon without a foreign key to `auth.users`.
4. For administrator mutations, require the verified subject to be present in Neon's administrator allowlist and require AAL2.
5. Reject anonymous, expired, AAL1, and non-allowlisted callers before opening a mutation transaction.

Completion gate:

- Authentication/authorization tests cover all four denied caller classes and an allowlisted AAL2 success case.
- No Supabase service credential or Neon credential is exposed to the browser.

### Stage 10 — Port administrator mutations

Goal: replace Supabase RPC mutations with server-side Neon transactions without weakening the hardening guarantees.

Status: **Completed and manually accepted on 2026-09-11.**

Implementation recorded on 2026-09-11:

- Added independent, exact and case-sensitive `ADMIN_DATA_BACKEND` routing with a safe Supabase default and lazy Neon repository loading.
- Added and applied `0003_neon_admin_transactions.sql` only to the temporary rehearsal database.
- Added portable profiles, audit, rate-limit, upload-reservation, cleanup-queue, and private provenance tables. Supabase Auth UUID relationships now target Neon `app_admins`; no Supabase roles, RLS, grants, triggers, or RPC history were copied.
- Copied the two rehearsal audit rows and two rate-limit rows. One historical scene relationship was reconciled by matching its scene slug because the manually populated Neon catalogue used a different scene UUID; audit IDs, request IDs, actors, actions, counts, and timestamps were preserved.
- Added Neon administrator reads and atomic transaction implementations for ambience, queues, presentation, reservations, finalization metadata/provenance, retention, and reference checks.
- Kept Supabase Auth, MFA, Storage URL/signing/object access, Realtime, chat, and cleanup-route execution unchanged.
- Existing public provenance remains sanitized; no private provenance was invented for the imported assets. New finalizations write genuine values to the private Neon table.

Automated verification recorded:

- Generated migration reviewed and applied transactionally; required constraints, indexes, relationships, and empty operational tables were inspected.
- Transactional rehearsal fixtures passed and rolled back for audit cardinality, rate rows, reservation state, provenance privacy, and database constraints.
- Neon administrator read smoke checks passed for 7 live scenes and their song/ambience payloads, 7 analytics rows, 40 active assets, Storage URL mapping, and JWT email identity mapping.
- Read parity checks matched the 7 live scenes, 40 active assets, and ambience profiles by stable scene slug. Four ambience profiles contained earlier rehearsal-test drift and were transactionally realigned from rehearsal Supabase before the final parity check.
- Focused Stage 10 and existing administrator tests passed; the full Bun suite passed with 145 tests. Targeted Stage 10 lint and the production build passed.
- Repository-wide lint remains blocked by 95 pre-existing formatting errors outside the Stage 10 files (plus 8 warnings); no Stage 10 lint finding remains.
- Repository-wide TypeScript failures remain the previously recorded unrelated UI strictness and missing `bun:test` declaration failures; Stage 10 files introduce no TypeScript errors.
- Manual acceptance initially exposed invalid UUID-array SQL while adding an oneliner. The Neon transaction rolled back cleanly. The oneliner keep-list and queue-removal list were changed to explicit parameterized UUID lists; a disposable add/remove reproduction then passed and restored the original presentation.

Manual acceptance completed by Kanu on 2026-09-11:

- Neon-backed administrator dashboard reads and controlled reversible mutation tests passed.
- The corrected Neon oneliner add/remove flow passed after a fresh server restart.
- The Supabase administrator-data fallback passed.
- Read-only Neon verification found one audit record per accepted mutation and matching rate-limit consumption. The three presentation entries comprise the automated diagnostic add/restore pair and Kanu's accepted retry.
- No audit row had an unknown administrator actor or missing request ID.

Port in this order:

1. Administrator status and analytics reads.
2. Ambience profile saves.
3. Stem saves and deactivation.
4. Queue append, remove, and track update operations.
5. Room presentation saves.
6. Upload reservation creation/check/discard operations.
7. Ambience asset finalization.
8. Retention and cleanup database operations.

Every mutation must perform validation, data changes, and exactly one audit insertion in one transaction. Any failure must roll back all three. Retain existing rate limits, provenance validation, reservation checks, direct-write denial at the application boundary, and affected-row expectations.

Completion gate:

- Each mutation has success, authorization-failure, validation-failure, rate-limit, and forced-rollback coverage.
- An allowlisted AAL2 no-op save reads back correctly and produces exactly one audit record.

### Stage 11 — Supabase Storage integration

Goal: keep existing media in Supabase Storage while Neon owns its metadata and provenance.

Status: **Completed and accepted on 2026-09-11.**

Actions:

1. Keep bucket names, object paths, MIME types, sizes, durations, hashes, and attribution in Neon.
2. Generate public or signed Storage URLs through server-side Supabase calls.
3. For uploads: authorize AAL2, create a Neon reservation, issue a signed Supabase upload URL, validate the uploaded object, finalize metadata/provenance in Neon, and complete the reservation.
4. If finalization fails, discard the reservation and remove or safely queue cleanup of the unreferenced object.
5. Keep the Supabase service credential server-only.

Completion gate:

- A controlled upload completes end to end.
- Invalid/expired reservations fail closed.
- Referenced Storage objects remain protected.
- A failed finalization does not leave an active reservation indefinitely.

Implementation record (2026-09-11):

- Added a server-only Supabase Storage gateway for scoped upload signing, downloads, removals, and public URLs without Supabase database access.
- Added strict UUIDv4 background/audio path validation, WebP limits and dimensions, MP3 validation, provenance normalization, and established role-specific stem defaults.
- Neon reservation signing now discards an unsigned reservation without queueing cleanup if Supabase signing fails.
- Background and ambience finalization now perform a read-only reservation preflight before Storage download and retain the locked validation inside the Neon transaction.
- Neon finalization failures discard unfinished reservations, queue cleanup, check references before removal, complete successful removals, and retain failed removals for Stage 13.
- Finalized ambience retries return successfully without consuming another rate limit or creating duplicate metadata/audit records; referenced and unknown-bucket objects fail closed against deletion.
- Rehearsal Supabase bucket settings remain public with their existing MIME and size restrictions. No bucket policy or object was changed by automated verification.
- Transactional Neon checks passed and rolled back for reservation ownership/expiry, sanitized public provenance, genuine private provenance, role-specific stem defaults, exactly one finalization audit, and reference protection.
- Focused Storage/media and administrator tests passed; the full Bun suite passed with 155 tests. Targeted Stage 11 lint and the production build passed.
- Repository-wide lint remains blocked by 95 pre-existing formatting errors (plus 8 warnings). Repository-wide TypeScript remains blocked by the previously recorded UI strictness and missing `bun:test` declaration failures; Stage 11 production files introduce no TypeScript error.
- Kanu accepted the rehearsal workflow and directed that the still-active disposable Stage 11 stem is not a completion blocker because rehearsal data will not be promoted. Commit: `c278fe0`.

### Stage 12 — Chat and Realtime

Goal: keep social features on Supabase while Neon becomes authoritative for room configuration.

Status: **Completed and manually accepted on 2026-09-11 together with Stage 13.**

Actions:

1. Leave chat messages, reactions, presence, and broadcasts in Supabase.
2. After a Neon administrator transaction commits, broadcast a room/ambience refresh event through Supabase Realtime.
3. Make clients respond by refetching authoritative room data from the Neon-backed server path.
4. Never use a broadcast as the authoritative copy of changed room data.

Completion gate:

- Chat link/email blocking, reactions, and presence still work.
- Connected clients refresh after Neon-backed admin changes.
- Failed/rolled-back transactions do not broadcast a successful refresh.

Implementation record (2026-09-11):

- Added post-commit Supabase Realtime REST broadcasts on `room:scene:<slug>` with the `room_refresh` event and a marker-only `{ sceneId, committedAt }` payload.
- Neon song, ambience, presentation, and oneliner mutations broadcast only after commit. Failed mutations, previews, reservations, discarded uploads, and Supabase fallback mutations do not emit the custom event.
- The shared room channel now distributes refresh markers alongside presence and reactions. Clients validate the marker, coalesce events over 750 ms, allow one fetch in flight, and refetch the complete authoritative room payload.
- Player refreshes preserve the room session, playback intent, volume, ambience preference, current membership and position when possible. Surviving queue entries keep their session order, updated metadata replaces stale data, and new entries append without reshuffling.
- Chat persistence and broadcasts, contact/link blocking, reactions, presence, and the Supabase `postgres_changes` fallback remain unchanged.
- Realtime, presence, mutation, queue reconciliation, chat, room-route, and related focused tests passed. Failed delivery removes its temporary channel and remains a sanitized best-effort warning.
- Kanu manually confirmed that presentation, queue, and ambience changes reached the public room without a reload while preserving playback state. Chat, reactions, presence, URL/email blocking, and the Supabase administrator-data fallback also passed.

### Stage 13 — Cleanup and retention

Goal: coordinate Neon references with Supabase Storage deletion safely.

Status: **Completed and manually accepted on 2026-09-11 together with Stage 12.**

Actions:

1. Keep `/api/admin-cleanup` protected by `CRON_SECRET`.
2. Query Neon for expired reservations and unreferenced paths.
3. Mark work as processing, delete through the Supabase service client, then record completion or a retryable failure.
4. Make every cleanup operation idempotent because Neon and Supabase Storage cannot share one transaction.
5. Leave Supabase chat expiry/cleanup active while chat remains there.

Completion gate:

- Repeated cleanup runs are safe.
- Referenced objects are never deleted.
- Partial failures are recorded and recoverable.

Implementation record (2026-09-11):

- Added the independent, exact and case-sensitive `CLEANUP_BACKEND` selector, defaulting to Supabase, and documented its non-secret default in `.env.example`.
- Neon retention queues expired unfinished reservations, removes audit rows older than 180 days and rate-limit rows older than two days, then atomically claims at most 100 due cleanup rows with `FOR UPDATE SKIP LOCKED` and a ten-minute lease.
- Every Storage removal follows an immediate Neon reference check. Referenced items complete as `skipped_referenced`; unknown buckets and unavailable checks retry without contacting Storage; missing objects are accepted as idempotent success; failures use sanitized exponential backoff capped at 24 hours.
- Chat purging runs in both backend modes and deletes only messages whose expiry is older than an additional 24 hours, in batches of 200 up to 1,000 rows per run.
- Transactional Neon rehearsal checks passed and rolled back for expired reservation queueing, claims, leases, retries, completion, and reservation discard.
- Controlled rehearsal cleanup preserved the referenced Stage 11 audio object and marked its queue item `skipped_referenced`; it removed the unreferenced replaced background and completed its queue item. Supabase chat fixtures confirmed old-expired deletion while recent-expired and active messages survived.
- No schema migration was added or changed. Migration `0003_neon_admin_transactions` remains untouched.

Combined automated verification (2026-09-11):

- Focused Realtime, presence, cleanup, and Storage tests: 30 passed.
- Full Bun suite: 167 passed, 0 failed.
- Targeted lint: 0 errors and one existing Fast Refresh warning in `player.tsx`.
- Production build passed. Repository-wide lint and TypeScript still report the previously recorded formatting, UI strictness, and missing `bun:test` declaration baseline failures; no Stage 12/13 production file introduced a TypeScript error.
- Kanu accepted the combined manual UAT after all requested Realtime, playback-preservation, social-feature, chat-blocking, and fallback checks passed.

### Stage 14 — Personal preview UAT

Goal: validate the entire hybrid system outside production.

Status: **Completed on 2026-09-11.**

Actions:

1. Configure the personal Vercel preview with the temporary branch's pooled `DATABASE_URL` and all backend selectors set to `neon`; keep `DATABASE_URL_UNPOOLED` local-only for migrations, dumps, and reconciliation.
2. Retain preview Supabase Auth, Storage, and Realtime configuration.
3. Test every public room, playlists, playback, ambience, attribution, media, chat, reactions, presence, admin AAL2, mutations, audit entries, uploads, refresh broadcasts, and cleanup.
4. Run focused tests, type-checking, linting, and the production build.
5. Inspect Vercel errors, Neon connection usage, and representative query latency.

Completion gate:

- Preview behavior matches production expectations and all security/functional checks pass.

Implementation record (2026-09-11):

- Stages 12–13 were committed as `5200f3f` and pushed only to the personal `feat/neon-database-port` branch.
- Vercel functions were pinned to Singapore region `sin1` in commit `5b3e00f`.
- Personal Vercel preview deployment `dpl_FgPeJfXPAbvFfiVDHbkzK4UMLGvq` reached Ready for exact commit `5b3e00f`; its stable branch alias is `music-player-git-feat-neon-d-1f4d83-kanutomer123-6953s-projects.vercel.app`.
- Build-error inspection was clean and the preview homepage returned HTTP 200. The only initial runtime finding was a non-failing PostgreSQL SSL-mode compatibility warning to review before production.
- Local configuration validation confirmed the rehearsal Supabase project, pooled runtime URL, direct CLI URL, and all required secret names without printing their values.
- Initial preview UAT found that deleting an older queue membership could violate the non-deferrable unique queue-position constraint. Queue compaction now uses a safe two-phase positive renumbering; the exact affected rehearsal queue passed a rolled-back 40-to-39-row transactional check with consecutive positions.
- Initial runtime logs showed successful Supabase Realtime REST sends were treated as failures because `httpSend()` returns `{ success: true }`, not `"ok"`. The acknowledgement handling and deterministic tests were corrected.
- All 21 active legacy ambience records in Neon were checked against rehearsal Supabase Storage and their objects are absent. Newly uploaded rehearsal ambience works, confirming this is incomplete disposable rehearsal Storage data rather than a Neon reader/player defect. No production objects were accessed or copied.
- After the fixes: focused tests passed (4), the full Bun suite passed (169), targeted lint passed, and the production build passed. Repository-wide TypeScript retains the previously recorded baseline failures and introduced no error in the changed production files.
- The fixes were committed as `bb6f97d` and pushed only to the personal `feat/neon-database-port` branch. Kanu confirmed that older-song deletion, administrator operations, and cross-tab refresh behavior passed in the redeployed preview.
- Kanu reconfirmed that newly uploaded ambience plays. Legacy ambience remains unavailable only because the disposable rehearsal Supabase bucket lacks all 21 referenced legacy objects; this accepted fixture gap does not block Stage 14 and must be replaced by a complete Storage-reference inventory gate before production cutover.

### Stage 15 — Rollback rehearsal

Goal: prove recovery before production changes.

Status: **Completed on 2026-09-11.**

Actions:

1. Switch preview from `DATA_BACKEND=neon` to `supabase` and confirm the previous implementation works.
2. Switch back to Neon and repeat critical reads.
3. Create and test an audit-driven reverse reconciliation procedure for mutations made after cutover.
4. Include database metadata and Storage-reference handling in rollback; an application rollback alone is insufficient after Neon accepts writes.

Completion gate:

- Both the pre-write application rollback and post-write paired rollback have been rehearsed successfully.

Rehearsed rollback procedure:

1. Freeze administrator mutations and cleanup, record an exact cutover timestamp, and leave public listening/chat online.
2. Run `scripts/neon-rollback-scope.mjs --since=<cutover timestamp>` with the direct Neon URL. Stop for any unknown audit action rather than silently omitting a mutation.
3. Export complete current Neon aggregates for every audit-identified scene. Export operational deltas separately because room visits, listening heartbeats, and source failures are not administrator-audited. Include changed reservations, cleanup rows, and audit records.
4. Load the export into temporary Supabase staging tables. Before mutation, require matching scene, queue, track, source, asset, and administrator IDs; production must preserve the IDs imported at cutover. Stop on any mismatch.
5. While cleanup remains paused, verify every Storage path referenced by the staged state exists. Never remove an object during rollback and never replace Supabase Storage URLs.
6. In one error-stopping Supabase transaction, lock affected aggregates, upsert parents before children, replace only affected ordered child collections, merge operational rows idempotently, carry reservation/cleanup state, and insert a dedicated rollback audit record.
7. Compare affected counts, IDs, queue positions, provenance, references, and representative payloads before commit. On any mismatch, roll back and keep the Neon deployment active.
8. After commit, deploy the previously tested Supabase selector configuration. Keep Neon and its recovery point intact until the fallback observation window passes.

Rehearsal record:

- Kanu switched all five Preview backend selectors to Supabase, redeployed, verified the fallback, restored every selector to Neon, redeployed, and confirmed the Neon path again.
- Added a read-only rollback scope tool that summarizes affected scenes, audit actions, operational deltas, and Storage-reference counts without returning credentials or object paths. It fails closed for unknown administrator actions; its two deterministic tests and targeted lint passed.
- The rehearsal scope identified `sainik-dhaba` as the only administrator-mutated scene in the selected window, alongside operational deltas that require separate reconciliation.
- The manually assembled rehearsal databases do not share every historical UUID. A production-style blind ID merge was therefore correctly rejected; production reconciliation may proceed only after the clean import proves complete ID equality.
- A staged, transactional presentation reconciliation was first applied and rolled back in rehearsal Supabase, proving the original value remained. The same Neon presentation was then committed to rehearsal Supabase with exactly one `stage15.rollback.reconcile` audit entry and read back successfully.
- Storage-reference verification found both newly uploaded rehearsal ambience objects present. The three missing legacy objects are the already accepted disposable-fixture gap; production rollback cannot commit with any equivalent missing reference.

### Stage 16 — Clean Neon production environment

Status: **completed on 2026-09-11.**

Goal: create production from reviewed code, not rehearsal residue.

Actions:

1. Create a clean Neon `production` branch from an untouched empty parent or a separate production project.
2. Apply the complete version-controlled migration chain through `DATABASE_URL_UNPOOLED`.
3. Configure runtime/migration roles, autoscaling, recovery history, monitoring, and an appropriate scale-to-zero policy.
4. Create a pre-import recovery branch or snapshot.

Completion gate:

- The full schema is reproducible from empty and contains only expected objects.

Implementation record:

- Confirmed the new Singapore `neondb` database was empty before migration.
- Applied tracked migrations `0000` through `0003` using the direct TLS connection; Drizzle records all four migrations.
- Verified 19 public tables, one private provenance table, 20 foreign keys, 172 checks, and 50 indexes.
- Created `music_app_runtime` with pooled TLS access, DML/sequence/schema-use privileges, and no superuser, database creation, role creation, replication, bypass-RLS, schema creation, or object ownership privileges.
- Moved the three plaintext connection-string files outside the repository and created an ignored local migration environment file without exposing values.
- Kanu created the non-expiring `pre-import-schema-20260911-104708Z` snapshot for the `production` branch and confirmed the requested project settings.

### Stage 17 — Maintenance and backups

Status: **completed for the personal shadow deployment on 2026-09-11.**

Goal: freeze the relevant write set and establish recovery points.

Actions:

1. Schedule an administrator-only maintenance window; keep public listening, chat, and reactions online.
2. Pause administrator saves/uploads, cleanup, and every other writer to Neon-owned tables.
3. Capture encrypted Supabase schema/data backups, migration history, table counts, grants/functions needed for rollback, a Storage inventory, and the exact cutover time.
4. Confirm the Neon recovery point exists.

Completion gate:

- All backups are readable, stored outside Git, and the approved writers are paused.

Shadow-deployment record:

- The company application was intentionally not paused; this is a point-in-time shadow copy, not the company cutover.
- Captured one exported PostgreSQL snapshot at `2026-09-11T10:59:22.640Z`.
- Stored the recovery/schema/data artifacts and sensitive inventories as a Windows CurrentUser DPAPI-encrypted archive outside Git.
- Recorded plaintext and encrypted SHA-256 values, proved DPAPI round-trip integrity, inspected the recovery dump with PostgreSQL 17 `pg_restore`, and removed plaintext backup artifacts.
- Confirmed the non-expiring pre-import Neon snapshot existed before importing data.

### Stage 18 — Fresh production export

Status: **completed for the personal shadow deployment on 2026-09-11.**

Goal: export current production data after the write freeze.

Actions:

1. Use PostgreSQL 17 tools when the source reports PostgreSQL 17.
2. Create a fresh data-only custom-format dump for the explicitly approved Neon-owned `public` and `private` tables.
3. Exclude `auth`, `storage`, `realtime`, `supabase_migrations`, chat, reactions, and any other table still owned by Supabase.
4. Do not reuse the rehearsal dump.

Completion gate:

- The dump inventory contains exactly the approved tables and no managed Supabase schema or secret.

Export record:

- Created schema-only and complete `public`/`private` recovery dumps plus a separate custom-format data dump from the same exported snapshot.
- The approved import contains exactly 20 Neon-owned tables, 19,718 rows, and one sequence state.
- Excluded Auth, Storage, Realtime, Supabase migration history, chat, reactions, generated rooms, and saved rooms from the import dump.
- Captured grants, functions, constraints, Supabase migration history, table metrics, Storage metadata, and Storage references in the encrypted recovery archive.
- Verified 63 objects in the two scoped Storage buckets and zero missing database references at the snapshot time.

### Stage 19 — Production restore and reconciliation

Status: **completed for the personal shadow deployment on 2026-09-11.**

Goal: load and validate production Neon before application cutover.

Actions:

1. Restore data through the direct Neon connection with transactional/error-stop behavior.
2. Compare counts, primary IDs, foreign keys, hashes, queue order, ambience links, allowlist membership, provenance, reservations, and audit data with Supabase.
3. Run representative public and administrator queries against Neon.
4. Stop and keep Supabase active if any required comparison fails.

Completion gate:

- All reconciliation checks pass with no unexplained difference.

Reconciliation record:

- Restored the approved data to Neon in one transaction with error-stop, no-owner, and no-privileges behavior.
- Ordered table data by foreign-key dependency; the first unordered attempt rolled back completely before this correction.
- Matched all 20 table row counts, primary-key definitions, and canonical SHA-256 hashes to the exported snapshot.
- Passed eight orphan, uniqueness, queue, provenance, and administrator-integrity checks with zero findings.
- The limited pooled runtime role read seven live scenes, completed a rolled-back write probe, and was denied schema creation.
- This Neon copy is current only through `2026-09-11T10:59:22.640Z`; a later company cutover requires a new frozen export or audited delta reconciliation.

### Stage 20 — Vercel Production deployment

Status: **completed for personal Vercel Production on 2026-09-11.**

Goal: deploy the tested hybrid backend without exposing secrets.

Actions:

1. Configure the least-privilege pooled Production `DATABASE_URL` and all five backend selectors in Vercel. Never configure `DATABASE_URL_UNPOOLED` in Vercel.
2. Retain Supabase variables needed for Auth, Storage, Realtime, and server-side Storage work.
3. Run Vercel Node.js Functions in a region close to Neon.
4. Deploy the exact reviewed commit that passed personal preview UAT.
5. Keep administrator activity and cleanup paused after deployment.

Completion gate:

- Deployment health checks pass and no credential appears in the client bundle or logs.

Verification record before deployment:

- Added deterministic exported-snapshot backup, DPAPI protection, restore-order, reconciliation, and rollback-scope tooling.
- Focused migration-tool tests pass (6 tests), and the complete Bun suite passes (175 tests).
- Production build succeeds for Vercel Node.js 22; the existing client chunk-size advisory remains unchanged.
- Targeted lint for the migration tooling passes.
- Repository-wide lint remains blocked by 91 pre-existing formatting errors and 8 warnings in unrelated application files.
- Repository-wide type-check remains blocked by pre-existing application typing and missing Bun test-type errors; the new runtime `.mjs` tools introduce no reported type-check error.
- Kanu imported the ignored six-key environment file into personal Vercel Production without adding the unpooled owner URL; existing Supabase and cron variables remained in place.
- The accidental manual redeploy rebuilt the previous personal `main` only and was superseded by the intended Git deployment.
- Personal `main` was fast-forwarded to `73db948`; Vercel deployment `dpl_ACBjPCeGV4pNdER1MzVbB8AwJ5pm` reached `READY` with one Node.js function in `sin1`.
- Build-error and runtime-error checks were clean; the homepage and `sainik-dhaba` route both returned HTTP 200.
- Scanned 25 deployed JavaScript assets: no database URL, Neon hostname, unpooled key, or concrete Supabase secret key was present.

### Stage 21 — Public production verification

Goal: prove that public behavior survived the cutover before allowing administrator writes.

Verify every live room, playlist order, playback source, ambience layer, attribution, image/video/audio URL, chat, reaction, and presence path. Inspect Vercel errors, Neon connections, and latency.

Completion gate:

- All public gates pass. Otherwise immediately use the pre-write application rollback.

### Stage 22 — Administrator production acceptance

Goal: accept protected production writes deliberately.

Actions:

1. Sign in as an allowlisted production administrator and complete AAL2.
2. Perform one harmless save and verify Neon read-back, exactly one atomic audit record, and a connected-client refresh.
3. Perform one controlled upload and verify its reservation, Supabase object, Neon metadata/provenance, finalization, public playback, and cleanup protection.
4. Invoke cleanup once manually and confirm no referenced object is removed.

Completion gate:

- Every administrator, upload, audit, Realtime, and cleanup check passes.

### Stage 23 — Resume and monitor

Goal: return to normal operation without removing the rollback path.

Actions:

1. Resume administrator activity, then re-enable the cleanup cron.
2. Monitor Vercel errors, Neon query latency/connections, authentication/AAL2 failures, audits, uploads, public hydration, broadcasts, and cleanup.
3. Keep old Supabase application tables, backups, the prior Vercel deployment, and the temporary Neon environment through the agreed observation period.
4. Treat replacement of Supabase Auth, Storage, and Realtime as separate future migrations.

Completion gate:

- Production remains stable through the observation period and rollback assets remain verified.

## Rollback Rules

### Before Neon administrator writes are enabled

1. Keep administrator activity and cleanup paused.
2. Set the application back to the Supabase backend or roll Vercel back to the previous Supabase-backed deployment.
3. Verify public behavior against Supabase.
4. Preserve Neon for diagnosis; do not retry until the cause is understood.

### After Neon administrator writes are enabled

1. Pause administrator activity and cleanup immediately.
2. Use Neon audit records and the recorded cutover time to identify post-cutover changes.
3. Execute the rehearsed reverse reconciliation, including Storage references.
4. Verify Supabase consistency before rolling the application back.
5. Resume operations only after the restored system passes its gates.

## Next Session

Current stage: **Stage 21 — Personal Production public-read verification.**

Kanu performs the browser, playback, chat, reactions, presence, and all-live-room UAT against personal Vercel Production. The agent may perform only read-only terminal/MCP verification and must not begin Stage 22 until Kanu reports Stage 21 acceptance.

Do not commit, push, or interact with the company repository without a separate explicit request.
