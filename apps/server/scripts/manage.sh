#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
cd "$APP_DIR"

# pnpm forwards `pnpm run <script> -- <args>` with the `--` separator left in
# place, and Django's parser rejects a bare `--`. Strip it (space-safe).
_filtered_count=0
for _arg in "$@"; do
  case "$_arg" in
    --) ;;
    *)
      _filtered_count=$((_filtered_count + 1))
      eval "_filtered_$_filtered_count=\"\$_arg\""
      ;;
  esac
done
set --
_i=1
while [ "$_i" -le "$_filtered_count" ]; do
  eval "set -- \"\$@\" \"\$_filtered_$_i\""
  _i=$((_i + 1))
done
unset _filtered_count _i _arg

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
