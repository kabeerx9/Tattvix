#!/usr/bin/env sh
# Container boot: apply migrations, then run the passed command.
# Single-VPS assumption — with multiple replicas this wants a proper
# release phase or advisory lock instead.
set -eu

python manage.py migrate --noinput

exec "$@"
