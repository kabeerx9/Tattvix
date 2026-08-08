import os
import re
import sys
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


DEV_INSECURE_SECRET_KEY = "dev-insecure-replace-me"


def validate_production_settings(
    *, debug: bool, secret_key: str, allowed_hosts_env: str | None
) -> None:
    """Fail fast on unsafe defaults when running with DJANGO_DEBUG=false.

    Pure function (no env/module access) so tests can exercise it directly
    with arbitrary inputs instead of re-importing the settings module.
    """
    if debug:
        return

    if not secret_key or secret_key == DEV_INSECURE_SECRET_KEY:
        raise ImproperlyConfigured(
            "SECRET_KEY must be set to a non-default value via DJANGO_SECRET_KEY "
            "when DJANGO_DEBUG=false."
        )

    if allowed_hosts_env is None or not allowed_hosts_env.strip():
        raise ImproperlyConfigured(
            "DJANGO_ALLOWED_HOSTS must be explicitly set when DJANGO_DEBUG=false. "
            "The development default host list must not be used in production."
        )


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", DEV_INSECURE_SECRET_KEY)
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,0.0.0.0")

validate_production_settings(
    debug=DEBUG,
    secret_key=SECRET_KEY,
    allowed_hosts_env=os.environ.get("DJANGO_ALLOWED_HOSTS"),
)

if not DEBUG:
    # HTTPS is terminated at the proxy; trust its forwarded-proto header when
    # deciding whether the original request was secure.
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "same-origin"

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
        # Local docker Postgres has no TLS; anything remote must keep it.
        ssl_require=env_bool("DATABASE_SSL_REQUIRE", True),
    )
}

# The test runner must never touch the real database. When tests are running
# and TEST_DATABASE_URL is set (local docker Postgres, no SSL), it replaces
# the default connection entirely.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "").strip()
RUNNING_TESTS = "test" in sys.argv
if RUNNING_TESTS:
    if not TEST_DATABASE_URL:
        raise ImproperlyConfigured(
            "TEST_DATABASE_URL must be set to run tests. "
            "Start the local database with `pnpm run db:up` first."
        )
    DATABASES = {"default": dj_database_url.parse(TEST_DATABASE_URL, conn_max_age=0)}

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
    7,
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

THROTTLE_PUBLIC_CHECK_IN_PER_MINUTE = env_positive_int(
    "THROTTLE_PUBLIC_CHECK_IN_PER_MINUTE",
    30,
)
THROTTLE_PUBLIC_WEBHOOK_PER_MINUTE = env_positive_int(
    "THROTTLE_PUBLIC_WEBHOOK_PER_MINUTE",
    60,
)
THROTTLE_IDENTITY_UPLOAD_PER_MINUTE = env_positive_int(
    "THROTTLE_IDENTITY_UPLOAD_PER_MINUTE",
    20,
)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "api.authentication.ClerkAuthentication",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    # Scopes are opted into per-view via ScopedRateThrottle subclasses; a
    # view without a matching `throttle_scope` is never throttled, so
    # /api/health/ and every authenticated, non-upload endpoint stay
    # unaffected by these rates.
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {
        "public-check-in": f"{THROTTLE_PUBLIC_CHECK_IN_PER_MINUTE}/min",
        "public-webhook": f"{THROTTLE_PUBLIC_WEBHOOK_PER_MINUTE}/min",
        "identity-upload": f"{THROTTLE_IDENTITY_UPLOAD_PER_MINUTE}/min",
    },
}
