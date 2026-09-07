# Admin security operations

## First sign-in and onboarding

1. Create the person in Supabase Auth and insert their user ID into `public.app_admins` through an approved operator workflow.
2. The admin signs in with their email and password at `/admin/login`.
3. If the account has no verified TOTP factor, the page displays a QR code and manual secret. The admin scans it with an authenticator app and verifies one six-digit code.
4. If a verified factor already exists, the page asks for its current code instead of creating another factor.
5. Admin data is available only after the resulting access token has `aal = aal2`. A password-only token can call only the onboarding-status function.

The account menu contains **Account security**. An authenticated admin can add and verify a backup authenticator. The UI will not remove the final verified factor.

Supabase Auth does not issue recovery codes for TOTP. If every authenticator is lost, a trusted Supabase Auth operator must remove the inaccessible factor and let the admin enroll again. Verify the requester outside the application before using this break-glass procedure.

## Auth project settings

- Minimum password length: 12 characters.
- Leaked-password protection: enabled.
- TOTP enrollment and verification: enabled.
- Do not add password-only bypasses to admin server functions or RLS policies.

## Scheduled cleanup

Vercel calls `GET /api/admin-cleanup` daily at 02:30 UTC. Set a long random `CRON_SECRET` in Production; Vercel sends it as a bearer token. The job processes at most 100 storage objects per run, retries failures with backoff, removes expired rate-limit buckets, and retains audit metadata for 180 days.

## Advisor exceptions

`app_admins`, `room_visits`, and the admin security metadata tables deliberately have RLS enabled without browser-readable policies. They are server-only tables. Do not “fix” the advisor notice by adding broad read policies.

Audit rows contain actor, action, scene/target identifiers, affected counts, request IDs, and timestamps only. Do not add message text, URLs, filenames, credentials, tokens, or other submitted payload data.
