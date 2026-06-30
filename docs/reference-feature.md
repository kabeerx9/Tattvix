# Reference Feature: Example Projects

This starter still includes the `ExampleProject` web/native UI, contracts, and
Prisma schema as replacement inventory. The original TypeScript API endpoints have been
removed in favor of the minimal Django REST Framework scaffold, so treat this as
reference code rather than a complete end-to-end backend flow.

## What it demonstrates

- A Prisma model previously owned by the local `User` record synced from Clerk
- Shared Zod contracts for request and response validation
- Typed client patterns for owner-scoped API calls
- Typed web and native API clients built on `@app-starter/contracts`
- Dashboard UI panels with list, create, edit, delete, loading, empty, and error states

## Authorization invariant

Every server read and write filters by the authenticated Clerk user through the
local `User` relation. Non-owned and nonexistent IDs both return `404 Not found`.

## Apply the schema in real projects

After pulling these changes, generate the Prisma client and apply the schema to
your database:

```bash
pnpm run db:generate
pnpm run db:push
```

Use `pnpm run db:migrate` instead when you maintain migration history for production.

## Removal inventory

Delete or revert the following when you replace this reference feature:

### Database

- `packages/db/prisma/schema/schema.prisma`
  - `ExampleProject` model
  - `exampleProjects ExampleProject[]` field on `User`
  - Fields: `id`, `ownerId`, `name`, `description`, `createdAt`, `updatedAt`
  - Index: `@@index([ownerId, updatedAt])`
- `packages/db/src/types.ts` — `ExampleProject` type export

### Contracts

- `packages/contracts/src/example-projects.ts`
- `packages/contracts/src/example-projects.test.ts`
- `packages/contracts/src/index.ts` — example project exports
- `packages/contracts/package.json` — `./example-projects` export map entry

### Server

The previous TypeScript server implementation has been replaced by the Django
REST Framework scaffold in `apps/server`.

### Web client

- `apps/web/src/lib/api.ts` — example project client functions
- `apps/web/src/components/example-projects.tsx`
- `apps/web/src/routes/_auth/dashboard.tsx` — `ExampleProjectsPanel` usage

### Native client

- `apps/native/lib/api.ts` — example project client functions
- `apps/native/components/example-projects.tsx`
- `apps/native/app/index.tsx` — `ExampleProjectsPanel` usage

### Documentation

- `docs/reference-feature.md`
- `README.md` — link to this document

### Search terms

Use these queries to confirm nothing was missed:

```bash
rg -n "ExampleProject|example-projects" packages apps docs/reference-feature.md
```

Every remaining hit should belong to this inventory or to your replacement domain
after you rename the feature intentionally.
