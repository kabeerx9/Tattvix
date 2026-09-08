#!/usr/bin/env sh
set -eu

pnpm install
pnpm run setup

pnpm run db:up
pnpm run storage:up
pnpm run db:migrate

echo "Next (in another terminal): pnpm run seed -- --email=you@example.com (your Clerk dev email)"
echo "Starting dev servers..."

pnpm run dev
