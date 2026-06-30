from typing import Any, Mapping

from django.conf import settings
from svix.webhooks import Webhook, WebhookVerificationError


class ClerkWebhookError(ValueError):
    pass


def verify_clerk_webhook(payload: bytes, headers: Mapping[str, str]) -> dict[str, Any]:
    if not settings.CLERK_WEBHOOK_SIGNING_SECRET:
        raise ClerkWebhookError("CLERK_WEBHOOK_SIGNING_SECRET is not configured.")

    normalized_headers = {key.lower(): value for key, value in headers.items()}
    try:
        event = Webhook(settings.CLERK_WEBHOOK_SIGNING_SECRET).verify(
            payload,
            normalized_headers,
        )
    except WebhookVerificationError as exc:
        raise ClerkWebhookError("Invalid Clerk webhook signature.") from exc

    if not isinstance(event, dict):
        raise ClerkWebhookError("Invalid Clerk webhook payload.")

    return event
