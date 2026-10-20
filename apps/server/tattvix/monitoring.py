"""Sentry error reporting, scrubbed so identity data never leaves the region.

Only stack traces, route shapes and status codes are sent: no request
bodies, headers, cookies, query strings, frame locals or user details. Raw
check-in tokens are bearer secrets and are redacted wherever they could
appear in an event.
"""

import re
from typing import Any

CHECK_IN_TOKEN_PATTERN = re.compile(r"(/check-in/)[^/?#\s\"']+")
# token_urlsafe(32) is always 43 URL-safe characters; catches a token that
# escaped its URL, e.g. into an exception message.
BARE_TOKEN_PATTERN = re.compile(r"(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])")
DROPPED_REQUEST_KEYS = ("data", "cookies", "headers", "query_string", "env")


def redact(value: Any) -> Any:
    if isinstance(value, str):
        value = CHECK_IN_TOKEN_PATTERN.sub(r"\1[token]", value)
        return BARE_TOKEN_PATTERN.sub("[token]", value)
    if isinstance(value, dict):
        return {key: redact(item) for key, item in value.items()}
    if isinstance(value, list):
        return [redact(item) for item in value]
    return value


def scrub_event(event: dict[str, Any], _hint: dict[str, Any]) -> dict[str, Any]:
    request = event.get("request")
    if isinstance(request, dict):
        for key in DROPPED_REQUEST_KEYS:
            request.pop(key, None)
    event.pop("user", None)
    return redact(event)


def sentry_init_options(
    *, dsn: str, environment: str, release: str | None = None
) -> dict[str, Any] | None:
    if not dsn:
        return None
    options: dict[str, Any] = {
        "dsn": dsn,
        "environment": environment,
        "send_default_pii": False,
        "include_local_variables": False,
        "max_request_body_size": "never",
        "traces_sample_rate": 0,
        "before_send": scrub_event,
        "before_send_transaction": scrub_event,
    }
    if release:
        options["release"] = release
    return options


def init_sentry(*, dsn: str, environment: str, release: str | None = None) -> None:
    options = sentry_init_options(dsn=dsn, environment=environment, release=release)
    if options is None:
        return

    import sentry_sdk
    from django.core.signals import got_request_exception
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(integrations=[DjangoIntegration()], **options)

    # Vercel freezes the function as soon as the response is returned, which
    # can strand the SDK's background sender. Flush on the error path only so
    # healthy requests pay nothing. Connected after DjangoIntegration's own
    # receiver, so the exception is already captured when this runs.
    def flush_after_exception(**_kwargs: Any) -> None:
        sentry_sdk.flush(timeout=2)

    got_request_exception.connect(flush_after_exception, weak=False)
