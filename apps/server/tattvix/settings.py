import os
import re
from pathlib import Path
from urllib.parse import urlparse

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


def env_positive_int(name: str, default: int) -> int:
    try:
        value = int(os.environ.get(name, str(default)))
    except ValueError as exc:
        raise ImproperlyConfigured(f"{name} must be a positive integer.") from exc

    if value < 1:
        raise ImproperlyConfigured(f"{name} must be a positive integer.")
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

COMPANION_MINOR_AGE_YEARS = env_positive_int("COMPANION_MINOR_AGE_YEARS", 18)
HOTEL_QR_TOKEN_TTL_DAYS = env_positive_int("HOTEL_QR_TOKEN_TTL_DAYS", 365)
HOTEL_IDENTITY_MAX_ACCESS_DAYS = env_positive_int(
    "HOTEL_IDENTITY_MAX_ACCESS_DAYS",
    30,
)
HOTEL_IDENTITY_POST_CLOSE_GRACE_HOURS = env_positive_int(
    "HOTEL_IDENTITY_POST_CLOSE_GRACE_HOURS",
    24,
)

OBJECT_STORAGE_ENDPOINT_URL = os.environ.get(
    "OBJECT_STORAGE_ENDPOINT_URL",
    "http://127.0.0.1:9000",
).strip()
OBJECT_STORAGE_ACCESS_KEY_ID = os.environ.get(
    "OBJECT_STORAGE_ACCESS_KEY_ID",
    "tattvix-server",
).strip()
OBJECT_STORAGE_SECRET_ACCESS_KEY = os.environ.get(
    "OBJECT_STORAGE_SECRET_ACCESS_KEY",
    "tattvix-server-local-only",
).strip()
OBJECT_STORAGE_BUCKET_NAME = os.environ.get(
    "OBJECT_STORAGE_BUCKET_NAME",
    "tattvix-identity-documents-dev",
).strip()
OBJECT_STORAGE_REGION = os.environ.get("OBJECT_STORAGE_REGION", "us-east-1").strip()
OBJECT_STORAGE_PRESIGNED_URL_TTL_SECONDS = env_positive_int(
    "OBJECT_STORAGE_PRESIGNED_URL_TTL_SECONDS",
    120,
)
OBJECT_STORAGE_MAX_UPLOAD_BYTES = env_positive_int(
    "OBJECT_STORAGE_MAX_UPLOAD_BYTES",
    8 * 1024 * 1024,
)
OBJECT_STORAGE_ALLOWED_CONTENT_TYPES = frozenset(
    env_list(
        "OBJECT_STORAGE_ALLOWED_CONTENT_TYPES",
        "image/jpeg,image/png,image/webp",
    )
)

storage_endpoint = urlparse(OBJECT_STORAGE_ENDPOINT_URL)
if storage_endpoint.scheme not in {"http", "https"} or not storage_endpoint.netloc:
    raise ImproperlyConfigured(
        "OBJECT_STORAGE_ENDPOINT_URL must be an absolute http:// or https:// URL."
    )
if not OBJECT_STORAGE_ACCESS_KEY_ID or not OBJECT_STORAGE_SECRET_ACCESS_KEY:
    raise ImproperlyConfigured("Object storage credentials must not be empty.")
if not re.fullmatch(r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]", OBJECT_STORAGE_BUCKET_NAME):
    raise ImproperlyConfigured("OBJECT_STORAGE_BUCKET_NAME is not a valid S3 bucket name.")
if not OBJECT_STORAGE_REGION:
    raise ImproperlyConfigured("OBJECT_STORAGE_REGION must not be empty.")
if not OBJECT_STORAGE_ALLOWED_CONTENT_TYPES:
    raise ImproperlyConfigured("OBJECT_STORAGE_ALLOWED_CONTENT_TYPES must not be empty.")
if OBJECT_STORAGE_PRESIGNED_URL_TTL_SECONDS > 900:
    raise ImproperlyConfigured(
        "OBJECT_STORAGE_PRESIGNED_URL_TTL_SECONDS must not exceed 900 seconds."
    )
if not DEBUG and (
    storage_endpoint.scheme != "https"
    or OBJECT_STORAGE_SECRET_ACCESS_KEY == "tattvix-server-local-only"
):
    raise ImproperlyConfigured(
        "Production object storage must use HTTPS and non-development credentials."
    )

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.authentication.ClerkAuthentication",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}
