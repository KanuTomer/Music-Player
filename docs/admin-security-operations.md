# Admin security operations

## First sign-in and onboarding

1. Create the person in Supabase Auth and insert their user ID into `public.app_admins` through an approved operator workflow.
2. The admin signs in with their email and password at `/admin/login`.
3. If the account has no verified TOTP factor, the page displays a QR code and manual secret. The admin scans it with an authenticator app and verifies one six-digit code.
4. If a verified factor already exists, the page asks for its current code instead of creating another factor.
5. Admin data is available only after the resulting access token has `aal = aal2`. A password-only token can call only the onboarding-status function.

The account menu contains **Account security**. An authenticated admin can add and verify a backup authenticator. The UI will not remove the final verified factor. An administrator with a current `aal2` session can also change their password by confirming the existing password. A successful change revokes every other refresh-token session while preserving the current session.

Supabase Auth does not issue recovery codes for TOTP. If the password is forgotten or every authenticator is lost, a trusted Supabase Auth operator must perform recovery or remove the inaccessible factor and let the admin enroll again. Verify the requester outside the application before using this break-glass procedure.

## Auth project settings

- Application password changes require a new password of at least 12 characters.
- Require the current password before password changes: enabled in the hosted project.
- Leaked-password protection: disabled because it is unavailable on the current Supabase Free plan. Enable it if the project moves to a plan that supports it.
- TOTP enrollment and verification: enabled.
- Do not add password-only bypasses to admin server functions or RLS policies.

## Scheduled cleanup

Vercel calls `GET /api/admin-cleanup` daily at 02:30 UTC. Set a long random `CRON_SECRET` in Production; Vercel sends it as a bearer token. The job processes at most 100 storage objects per run, retries failures with backoff, removes expired rate-limit buckets, and retains audit metadata for 180 days.

The cleanup worker rechecks database references immediately before removing an object. A referenced object is marked as skipped and is never deleted. A later valid replacement can reactivate that cleanup entry.

## Admin mutation boundary

Authenticated administrators have read access to the records needed by the dashboard, but durable writes run only through named `admin_secured_*` functions. Each function verifies the allowlist and `aal2`, consumes a fixed rate-limit bucket, performs the mutation, and appends its audit row in one transaction. Direct table writes and direct audit insertion are revoked from browser roles.

Original ambience filenames, sizes, durations, hashes, and trim selections are stored in the private `ambience_asset_provenance` table. Listener roles can read only public attribution columns from `ambience_asset_sources`.

## Advisor exceptions

`app_admins`, `room_visits`, and the admin security metadata tables deliberately have RLS enabled without browser-readable policies. They are server-only tables. Do not “fix” the advisor notice by adding broad read policies.

Audit rows contain actor, action, scene/target identifiers, affected counts, request IDs, and timestamps only. Do not add message text, URLs, filenames, credentials, tokens, or other submitted payload data.
