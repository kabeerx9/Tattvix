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
    db_user = request.user.db_user

    return Response(
        {
            "id": db_user.id,
            "clerkId": db_user.clerk_id,
            "email": db_user.email,
            "firstName": db_user.first_name,
            "lastName": db_user.last_name,
            "username": db_user.username,
            "imageUrl": db_user.image_url,
            "createdAt": _isoformat(db_user.created_at),
            "updatedAt": _isoformat(db_user.updated_at),
            "lastSyncedAt": _isoformat(db_user.last_synced_at),
        }
    )


def _isoformat(value):
    if value is None:
        return None
    return value.isoformat().replace("+00:00", "Z")


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
