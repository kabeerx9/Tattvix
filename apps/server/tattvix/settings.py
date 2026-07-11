import os
from pathlib import Path

import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


def env_required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ImproperlyConfigured(f"{name} must be set.")
    return value


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-insecure-replace-me")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0")
DATABASE_URL = env_required("DATABASE_URL")

if not DATABASE_URL.startswith(("postgres://", "postgresql://")):
    raise ImproperlyConfigured("DATABASE_URL must use a postgres:// or postgresql:// URL.")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "tattvix.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "tattvix.wsgi.application"

DATABASES = {
    "default": dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=60,
        conn_health_checks=True,
        ssl_require=True,
    )
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3001,http://127.0.0.1:3001",
)
CORS_ALLOW_CREDENTIALS = True

CLERK_SECRET_KEY = os.environ.get("CLERK_SECRET_KEY", "")
CLERK_WEBHOOK_SIGNING_SECRET = os.environ.get("CLERK_WEBHOOK_SIGNING_SECRET", "")
CLERK_AUTHORIZED_PARTIES = env_list("CLERK_AUTHORIZED_PARTIES", "")

try:
    COMPANION_MINOR_AGE_YEARS = int(
        os.environ.get("COMPANION_MINOR_AGE_YEARS", "18")
    )
except ValueError as exc:
    raise ImproperlyConfigured(
        "COMPANION_MINOR_AGE_YEARS must be a positive integer."
    ) from exc

if COMPANION_MINOR_AGE_YEARS < 1:
    raise ImproperlyConfigured("COMPANION_MINOR_AGE_YEARS must be positive.")

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.authentication.ClerkAuthentication",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}
