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

from .current_user import build_current_user_payload
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
