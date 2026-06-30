#!/usr/bin/env sh
set -eu

pnpm install
pnpm --filter server run setup

pnpm run dev
