# Hotel App

A full-stack hotel app monorepo for web, native, and API development.

## Included

- React 19 and TanStack Router web app
- Expo and React Native app
- Django REST Framework API scaffold
- Clerk authentication on web and native
- Reference web/native CRUD UI and contracts (`ExampleProject`) to replace
- PostgreSQL-only Django database configuration
- Shared shadcn/ui package
- Shared, validated environment configuration
- Turborepo and pnpm workspaces

## Create A Project

Use GitHub's **Use this template** button, then clone the generated repository.

Install dependencies:

```bash
pnpm install
```

Install `uv` if it is not already available, then set up the Django virtual
environment:

```bash
pnpm run setup
```

Initialize the project metadata in one step:

```bash
pnpm run init:project -- \
  --name "Acme Tasks" \
  --slug acme-tasks \
  --scope acme-tasks \
  --scheme acme-tasks \
  --bundle-id com.acme.tasks
```

`init:project` updates the root package name, workspace scope, Expo identifiers,
visible branding, and import specifiers across the known starter files. It also
creates missing `.env` files by copying the matching `.env.example` files.

Options:

- `--name` visible product name
- `--slug` root package and Expo slug
- `--scope` npm workspace scope, with or without a leading `@`
- `--scheme` Expo URL scheme
- `--bundle-id` iOS bundle identifier and Android package name
- `--dry-run` print planned changes without writing files
- `--yes` apply changes without interactive confirmation

Preview changes first:

```bash
pnpm run init:project -- \
  --name "Acme Tasks" \
  --slug acme-tasks \
  --scope acme-tasks \
  --scheme acme-tasks \
  --bundle-id com.acme.tasks \
  --dry-run
```

After a scope rename, run:

```bash
pnpm install
```

The initializer never provisions Clerk, PostgreSQL, hosting, or app-store
projects, and it never overwrites an existing `.env` file.

### Manual fallback

If you prefer to customize by hand:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
cp apps/native/.env.example apps/native/.env
```

Then rename the root package, `@hotel-app/*` workspace scope, Expo metadata,
and visible branding yourself.

Create a new Clerk application for each project and add a Supabase PostgreSQL
connection string to `apps/server/.env`. Replace the placeholder values in the
three environment files.

Run the doctor before shipping:

```bash
pnpm run doctor
```

Doctor checks runtime availability, required environment keys, remaining starter
identifiers, native metadata consistency, and workspace dependency integrity.
It reports missing keys only and never prints environment values.

Set up or refresh the Django server environment with uv:

```bash
pnpm run setup
```

The Django server requires `DATABASE_URL`; this project does not use a local
SQLite database.

Start the web app and Django API:

```bash
pnpm run dev
```

For the first run after filling in all `.env` files, sync Python server
dependencies before starting the dev servers:

```bash
pnpm run dev:first-run
```

- Web: `http://localhost:3001`
- API: `http://localhost:3000`
- Native: Expo development server for a custom development build, started separately

The native app uses `expo-dev-client`, so build and install a development
client before opening the Metro server:

```bash
pnpm --filter native android
pnpm run dev:native
```

Or for iOS:

```bash
pnpm --filter native ios
pnpm run dev:native
```

Use `pnpm --filter native dev:go` only if you intentionally want to test with
Expo Go.

## Clerk Setup

Configure these values:

- Server: `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`
- Web: `VITE_CLERK_PUBLISHABLE_KEY`
- Native: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

The Django API uses Clerk's Python backend SDK for request authentication and
Svix verification for Clerk webhooks. Local Clerk sync models are defined, but
their migrations are intentionally deferred until the database setup is ready.

For web Google OAuth, allow:

```text
http://localhost:3001/sso-callback
```

## Structure

```text
apps/
  web/       React and TanStack Router
  native/    Expo and React Native
  server/    Django REST Framework API
packages/
  config/    Shared TypeScript configuration
  env/       Validated environment variables
  ui/        Shared UI components and styles
```

## Scripts

- `pnpm run dev`
- `pnpm run build`
- `pnpm run check-types`
- `pnpm test`
- `pnpm run setup`
- `pnpm run init:project`
- `pnpm run doctor`
- `pnpm run dev:first-run`
- `pnpm run dev:web`
- `pnpm run dev:server`
- `pnpm run dev:native`
- `pnpm --filter server run setup`
- `pnpm run db:migrate`

## Before Shipping A New Product

- Run `pnpm run doctor` and resolve required findings.
- Replace the placeholder branding and dashboard.
- Replace the example CRUD contracts and UI when your product domain is ready.
- Use separate Clerk, database, and deployment projects.
- Never commit real `.env` files.
