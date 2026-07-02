# Hotel App

A monorepo for the hotel app:

- `apps/web`: React, TanStack Router, Clerk, and shadcn/ui-style components
- `apps/server`: Django REST Framework API using PostgreSQL only
- `apps/native`: Expo development-build app
- `packages/*`: shared TypeScript config, contracts, env helpers, and UI

## Tooling

This repo uses both JavaScript and Python tooling.

- `pnpm` is the JavaScript package manager. It installs the monorepo packages, runs Turborepo, and starts the web/native workspaces.
- `uv` is the Python package and environment manager. It reads `apps/server/pyproject.toml`, installs Django dependencies, and creates the server virtual environment.

Yes, both need to be installed locally.

The Django server has an `apps/server/package.json` only so pnpm and Turborepo can run server commands from the monorepo root. The Python dependencies are still managed by `uv`, not by npm.

## Prerequisites

- Node.js 20+
- pnpm 10.x
- uv
- A Supabase PostgreSQL database
- A Clerk application for web auth
- Xcode/iOS Simulator for `pnpm --filter native ios`, or Android Studio/emulator for `pnpm --filter native android`

Install pnpm:

```bash
npm install -g pnpm@10.10.0
```

Install uv on macOS:

```bash
brew install uv
```

Check the tools:

```bash
node --version
pnpm --version
uv --version
```

## First Setup

Clone the repo, then install JavaScript dependencies:

```bash
pnpm install
```

Create local env files:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp apps/native/.env.example apps/native/.env
```

`apps/native/.env.example` is currently empty, but `pnpm run doctor` still expects the local file to exist.

Install the Django server dependencies:

```bash
pnpm run setup
```

That runs `uv sync` inside `apps/server` and creates the Python virtual environment for the backend.

## Environment Variables

Fill in `apps/server/.env`:

```bash
DJANGO_SECRET_KEY="replace-me"
DJANGO_DEBUG="true"
DATABASE_URL="postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require"
DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1,0.0.0.0"
CORS_ALLOWED_ORIGINS="http://localhost:3001,http://127.0.0.1:3001"
CLERK_SECRET_KEY="sk_test_replace_me"
CLERK_WEBHOOK_SIGNING_SECRET="whsec_replace_me"
CLERK_AUTHORIZED_PARTIES="http://localhost:3001,http://127.0.0.1:3001"
```

Use Supabase's direct PostgreSQL connection string for local development and migrations. If your database password contains special characters, URL-encode it before putting it in `DATABASE_URL`.

Fill in `apps/web/.env`:

```bash
VITE_SERVER_URL="http://localhost:3000"
VITE_CLERK_PUBLISHABLE_KEY="pk_test_replace_me"
```

The webhook signing secret is only used when Clerk webhooks call `POST /api/webhooks/clerk/`. The app can still start before webhooks are hosted, but keep the key in the env file because it is part of the documented server config.

Never commit real `.env` files.

## Database

This project is PostgreSQL-only. It does not use a local SQLite database.

After `DATABASE_URL` is set, run migrations:

```bash
pnpm run db:migrate
```

This creates Django's built-in tables plus the app table for Clerk users. The Clerk user table is named `api_clerkuser`.

When a signed-in web user calls `GET /api/me/`, the backend verifies the Clerk request and creates or updates the matching `api_clerkuser` row.

## Run The App

Start the Django API, web app, and native Metro server:

```bash
pnpm run dev
```

Local URLs:

- Web: `http://localhost:3001`
- API: `http://localhost:3000`
- API health check: `http://localhost:3000/api/health/`
- Native: Expo dev-client Metro server

For web auth, the Clerk app should allow this callback URL:

```text
http://localhost:3001/sso-callback
```

## Native App

The native app is an Expo development build. `pnpm run dev` starts Metro, but it does not build and install the native app binary.

First iOS run:

```bash
pnpm --filter native ios
```

First Android run:

```bash
pnpm --filter native android
```

After the development build is installed, `pnpm run dev` is enough for normal local development.

`pnpm --filter native <script>` means "run this script only in the `apps/native` workspace".

## Useful Commands

```bash
pnpm run dev          # server + web + native Metro
pnpm run dev:web      # web only
pnpm run dev:server   # Django server only
pnpm run dev:native   # native Metro only
pnpm run db:migrate   # Django migrations
pnpm run check-types  # type checks
pnpm run doctor       # repo setup checks
pnpm run setup        # uv sync for the Django backend
```

## Fresh Clone Checklist

```bash
pnpm install
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp apps/native/.env.example apps/native/.env
pnpm run setup
pnpm run db:migrate
pnpm run doctor
pnpm run dev
```

For native development, also run `pnpm --filter native ios` or `pnpm --filter native android` once to install the development build.
