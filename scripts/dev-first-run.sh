#!/usr/bin/env sh
set -eu

pnpm install
pnpm run setup

pnpm run dev
