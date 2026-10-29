# Production Deploy

## Help desk contacts

Set `SUPPORT_CALL_PHONE` and `SUPPORT_WHATSAPP_PHONE` on the Django API service
to the real international-format numbers (for India, `+91` followed by ten
digits). They can differ. Redeploy/restart the API after changing the environment.
Both apps read `/api/support/`; no web rebuild or native OTA is needed to change
the contacts once the help desk screens have shipped. They refresh when opened.
The default `+910000000000` is a placeholder: both actions remain disabled until
real numbers are configured. Blank or malformed values disable the corresponding
action. No guest details are included in call or WhatsApp links.

## Production stack

India-resident pilot stack on free tiers. Everything that stores or
processes guest data runs in Mumbai; only the static SPA is served from a
global CDN.

| Piece | Where | Region | Hostname |
| --- | --- | --- | --- |
| Web SPA | Vercel project `tattwix-web` (root `apps/web`) | CDN | `tattwix.in` |
| Django API | Vercel project `tattwix-api` (root `apps/server`), one Python function | `bom1` Mumbai | `api.tattwix.in` |
| Postgres | Supabase free, transaction pooler | `ap-south-1` Mumbai | |
| Identity images | S3 bucket `tattwix-identity-documents` | `ap-south-1` Mumbai | |
| Auth | Clerk production instance | | `clerk.tattwix.in` + Clerk's records |
| Image purge | Vercel Cron, daily 03:00 IST | `bom1` | `/api/cron/purge-identity-images/` |
| DNS | GoDaddy | | |

Both Vercel projects are Git-connected to `kabeerx9/Tattvix`; pushing `main`
deploys both. The API's `git.deploymentEnabled` (`{"main": true, "**": false}`)
means only `main` creates API deployments, so branch previews never build (or
migrate) the API; `scripts/vercel_build.py` also refuses to migrate outside
production. (An earlier `ignoreCommand` made Vercel cancel every git-triggered
production build at creation for a week — 2026-09-26 to 2026-10-03.)

## How the API runs on Vercel

- Vercel finds `apps/server/manage.py`, imports settings to discover
  `WSGI_APPLICATION`, runs `collectstatic`, and bundles Django as one
  function pinned to `bom1` (`apps/server/vercel.json`). **Settings import
  at build time, so every required env var must exist before the first
  build.**
- `scripts/vercel_build.py` runs `migrate` during production builds.
  Migrations must be backward compatible (expand/contract): the old
  deployment serves against the new schema until the new one is promoted,
  and a build that fails after migrating leaves the schema ahead.
- `DATABASE_TRANSACTION_POOLER=true`: no held connections, no server-side
  cursors. Django already disables psycopg prepared statements.
- `TRUSTED_PROXY_COUNT=1`: Vercel's edge sets `X-Forwarded-For`; DRF keys
  anonymous throttles on it.

## Environment variables

`tattwix-api` (production). ✅ = already set.

| Var | Value / source |
| --- | --- |
| ✅ `DJANGO_SECRET_KEY` | generated, sensitive |
| ✅ `DJANGO_DEBUG` | `false` |
| ✅ `DJANGO_ALLOWED_HOSTS` | `api.tattwix.in,tattwix-api.vercel.app` |
| ✅ `CORS_ALLOWED_ORIGINS` | `https://tattwix.in` |
| ✅ `TRUSTED_PROXY_COUNT` | `1` |
| ✅ `CRON_SECRET` | generated, sensitive; Vercel Cron sends it as a Bearer token |
| ✅ `DATABASE_URL` | Supabase → Connect → **Transaction pooler** URI (port 6543) |
| ✅ `DATABASE_SSL_REQUIRE` | `true` |
| ✅ `DATABASE_TRANSACTION_POOLER` | `true` |
| ✅ `CLERK_SECRET_KEY` | Clerk production `sk_live_…` |
| ✅ `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk webhook → `https://api.tattwix.in/api/webhooks/clerk/` |
| ✅ `CLERK_AUTHORIZED_PARTIES` | `https://tattwix.in` |
| ✅ `OBJECT_STORAGE_ENDPOINT_URL` | `https://s3.ap-south-1.amazonaws.com` |
| ✅ `OBJECT_STORAGE_REGION` | `ap-south-1` |
| ✅ `OBJECT_STORAGE_BUCKET_NAME` | `tattwix-identity-documents` |
| ✅ `OBJECT_STORAGE_ACCESS_KEY_ID` / `_SECRET_ACCESS_KEY` | IAM user `tattwix-api-object-storage`, sensitive |
| `SENTRY_DSN` | Sentry project `tattwix-api` → Client Keys (DSN) |

`tattwix-web` (production): ✅ `VITE_SERVER_URL=https://api.tattwix.in`,
`VITE_CLERK_PUBLISHABLE_KEY=pk_live_…`; to add: `VITE_SENTRY_DSN` (Sentry
project `tattwix-web`) and `VITE_GA_MEASUREMENT_ID=G-YENGRV5FFC` (GA4
property "Tattwix"); `SENTRY_AUTH_TOKEN` (sensitive, build-time source map
upload, see Error reporting). `VITE_*` values are baked in at build time; changing
one needs a redeploy.

## Error reporting and analytics

Sentry (org `kabeer-joshi`, projects `tattwix-web` and `tattwix-api`) and
GA4 are off unless their env vars are set. Both are scrubbed for identity
data: no request bodies, headers, cookies, query strings, frame locals,
session replay or emails; users are identified by Clerk id only. Check-in
tokens are bearer secrets and are redacted everywhere
(`apps/server/tattvix/monitoring.py`, `apps/web/src/lib/telemetry-privacy.ts`);
GA sees `/check-in/:token`. Expected 4xx API errors are not reported. GA
enhanced measurement has site search and form interactions turned off.
Product events: `check_in_qr_generated`, `identity_document_saved`,
`check_in_submitted`, `stay_checked_in`, `stay_checked_out` — params are
slugs and counts only.

Source maps upload during the Vercel build when `SENTRY_AUTH_TOKEN` is set on
`tattwix-web`. Use a Sentry org auth token with `project:releases` and
`org:read` scopes, added as a sensitive env var. Without the token the build
still emits hidden maps, but nothing is uploaded and no maps are deleted. Web
and API releases are tagged with the git commit SHA (`VERCEL_GIT_COMMIT_SHA`),
and the Sentry environment is `production` or `preview` from `VERCEL_ENV`.

### Native app (EAS)

The app uses `@sentry/react-native` (project `tattwix-app`, org and project
named in the `@sentry/react-native` plugin block of `apps/native/app.json`;
change both if the project is renamed). It is off unless
`EXPO_PUBLIC_SENTRY_DSN` is set, so dev builds and tests need nothing. Set
these as EAS environment variables (`eas env:create` or the Expo dashboard),
not in `eas.json`:

| Environment | Variable | Value |
| --- | --- | --- |
| `preview`, `production` | `EXPO_PUBLIC_SENTRY_DSN` | Sentry project `tattwix-app` → Client Keys (DSN); plain text, baked into the JS bundle |
| `preview`, `production` | `SENTRY_AUTH_TOKEN` | **sensitive**; org auth token with `project:releases` and `org:read`; used only at build time to upload source maps and native symbols |
| optional | `SENTRY_ORG`, `SENTRY_PROJECT` | only needed if removed from the `app.json` plugin block |

Without `SENTRY_AUTH_TOKEN` the build still succeeds; events arrive
unsymbolicated. Releases are the native `com.tattwix.app@<version>+<versionCode>`
that the Gradle plugin uploads under, so `release`/`dist` are not overridden
in JS. The Sentry environment is the EAS Update channel (`preview`,
`production`) or `development` in the dev client; events also carry
`expo.updates.channel`, `update_id` and `runtime_version` tags.

Scrubbing (`apps/native/src/lib/telemetry-privacy.ts`, tested): no request
bodies, headers, cookies or query strings; console breadcrumbs dropped;
network breadcrumbs reduced to method, URL and status; storage URLs reduced
to their origin (the path is an identity-document object key); check-in and
bearer tokens and emails redacted in every string; keys named
authorization/cookie/token/secret/password/email redacted; no screenshots,
view hierarchy, session replay or touch labels. Users are the internal
numeric id only. Reported: 5xx, storage refusals during an upload and
unexpected exceptions. Not reported: expected 4xx (validation, 401, 403,
404, lapsed subscription), no-connection, upload timeouts. To verify on a
device, open `tattwix://gallery` in a dev build and press "Send test error".

Add a secret without it touching the terminal history:

```sh
cd apps/server && vercel env add CLERK_SECRET_KEY production --sensitive
```

## S3

Created with the AWS CLI: all public access blocked, SSE-S3 default
encryption, a bucket policy denying non-TLS requests, and CORS allowing
`PUT`/`GET` from `https://tattwix.in` with `content-type` and
`cache-control` headers. The app's IAM user has an inline policy that only
allows `ListBucket`/`GetBucketLocation` on the bucket and
`Get`/`Put`/`DeleteObject` on its objects (same shape as
`infra/minio/identity-documents-policy.json`).

Rotate the app key: `aws iam create-access-key --user-name
tattwix-api-object-storage`, update both Vercel vars, redeploy, then delete
the old key.

## DNS at GoDaddy

Add the records Vercel shows under each project's Domains tab
(`tattwix.in` → web, `api.tattwix.in` → API), plus Clerk's records. Redirect
`www.tattwix.in` → `tattwix.in` in Vercel.

## First admin

Sign in once on `https://tattwix.in`, then run locally against production:

```sh
cd apps/server
DATABASE_URL='<supabase session pooler URI>' DJANGO_DEBUG=false \
  … uv run python manage.py grant_super_admin --email you@example.com
```

(Settings need the production object-storage and secret vars too; easiest is
a temporary, gitignored `apps/server/.env.production.local` sourced into the
shell and deleted afterwards.)

## Known limits (fine for the pilot)

- **Hobby plan is non-commercial.** Move to Pro, or the self-hosted path
  below, once a paying hotel is onboard.
- **Supabase free:** no backups; pauses after ~7 idle days.
- **AWS Free plan** ends 2027-02-28 (or when credits run out) and the
  account is **closed** unless upgraded to Paid — that would take the S3
  identity images with it.
- Throttle counters are per-function-instance LocMemCache, so rate limits
  are soft. A shared cache (e.g. Upstash Redis) fixes it.
- Daily purge: expired images are already refused at read time
  (`hotel_identity_access_state`), so the cron only delays deletion.
- Cold starts of ~1–2 s after idle.

## Upgrade path: self-hosted VPS

`infra/prod/` runs the same image under Docker Compose behind Caddy (TLS,
slow-client buffering, forwarded headers) on any Ubuntu VPS in Mumbai. Use
the Supabase **session** pooler there (long-lived connections) and leave
`DATABASE_TRANSACTION_POOLER` unset. Migrations run in the container
entrypoint (single-instance only); the purge job moves to host cron:

```sh
*/15 * * * * cd ~/tattvix/infra/prod && docker compose exec -T server python manage.py purge_expired_identity_images >> ~/purge.log 2>&1
```
