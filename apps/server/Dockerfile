# syntax=docker/dockerfile:1

# Tattvix Django API. Two targets:
#   development — runserver with live reload against a bind mount (local dev)
#   production  — gunicorn serving collected static via WhiteNoise (VPS)
# psycopg[binary] bundles libpq, so no apt packages are needed.

FROM python:3.13-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app
RUN useradd --create-home --uid 10001 app


FROM base AS dependencies

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-install-project


FROM dependencies AS development

COPY . .
USER app
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:3000"]


FROM dependencies AS production

COPY . .
# collectstatic loads settings (which require DATABASE_URL to be set) but
# never opens a DB connection, so a dummy URL is enough at build time.
RUN DATABASE_URL=postgresql://collectstatic:collectstatic@localhost:5432/collectstatic \
    python manage.py collectstatic --noinput
USER app
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["gunicorn", "tattvix.wsgi:application", "--bind", "0.0.0.0:3000", "--workers", "3"]
