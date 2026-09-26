import hmac

from django.conf import settings
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .check_in import purge_expired_shared_identity_images
from .current_user import build_current_user_payload
from .object_storage import PrivateObjectStorage
from .webhooks import ClerkWebhookError, verify_clerk_webhook


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(_request):
    # Deliberately unthrottled: used for uptime/liveness checks.
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(build_current_user_payload(request.user.db_user))


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([ScopedRateThrottle])
def clerk_webhook(request):
    try:
        event = verify_clerk_webhook(request.body, request.headers)
    except ClerkWebhookError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {
            "received": True,
            "type": event.get("type"),
            "id": event.get("id"),
        }
    )


# Separate scope from public-check-in: this is server-to-server traffic
# from Clerk, not a guest-facing flow, and may legitimately burst higher.
clerk_webhook.cls.throttle_scope = "public-webhook"


# Sized so one run finishes well inside the function timeout: each image is
# one sequential object-storage DELETE plus one row delete.
CRON_PURGE_BATCH_SIZE = 200


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def cron_purge_identity_images(request):
    # Vercel Cron calls this with `Authorization: Bearer <CRON_SECRET>`.
    # Unconfigured must fail closed: an empty secret is not "no auth".
    if not settings.CRON_SECRET:
        return Response(
            {"error": "Cron is not configured."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    supplied = request.headers.get("Authorization", "")
    expected = f"Bearer {settings.CRON_SECRET}"
    if not hmac.compare_digest(supplied.encode(), expected.encode()):
        return Response(
            {"error": "Unauthorized."}, status=status.HTTP_401_UNAUTHORIZED
        )

    deleted_count, failed_count = purge_expired_shared_identity_images(
        storage=PrivateObjectStorage(),
        batch_size=CRON_PURGE_BATCH_SIZE,
    )
    return Response(
        {"deleted": deleted_count, "deferred": failed_count},
        # Non-2xx marks the run failed in Vercel, the only signal we get
        # that storage deletes are stuck.
        status=(
            status.HTTP_500_INTERNAL_SERVER_ERROR
            if failed_count
            else status.HTTP_200_OK
        ),
    )
