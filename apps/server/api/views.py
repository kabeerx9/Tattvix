from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .webhooks import ClerkWebhookError, verify_clerk_webhook


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def health(_request):
    return Response({"status": "ok"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    return Response(
        {
            "id": request.user.id,
            "session_id": request.user.session_id,
            "organization_id": request.user.organization_id,
            "organization_role": request.user.organization_role,
        }
    )


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
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
