#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
cd "$APP_DIR"

if [ -n "${PYTHON:-}" ]; then
  PYTHON_BIN="$PYTHON"
elif [ -x ".venv/bin/python" ]; then
  PYTHON_BIN=".venv/bin/python"
else
  PYTHON_BIN="python3"
fi

if ! "$PYTHON_BIN" - <<'PY' >/dev/null 2>&1
import django
import rest_framework
import dj_database_url
import dotenv
import psycopg
PY
then
  printf "Django dependencies are missing. Run: pnpm --filter server run setup\n" >&2
  exit 1
fi

exec "$PYTHON_BIN" manage.py "$@"
