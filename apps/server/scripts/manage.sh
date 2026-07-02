#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
cd "$APP_DIR"

if command -v uv >/dev/null 2>&1; then
  exec uv run python manage.py "$@"
fi

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
  printf "uv is missing and Django dependencies are not installed. Install uv, then run: pnpm run setup\n" >&2
  exit 1
fi

exec "$PYTHON_BIN" manage.py "$@"
