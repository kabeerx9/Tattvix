import logging

from rest_framework import serializers
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .hotel_access import get_accessible_property
from .identity_document_views import IdentityUploadThrottle
from .models import PropertyPhoto
from .object_storage import ObjectStorageValidationError, PrivateObjectStorage
from .property_photos import (
    PropertyPhotoError, build_photo_payload, create_pending_photo_upload,
    finalize_photo_upload, remove_photo,
)
from .rbac import Permission

logger = logging.getLogger(__name__)


class PhotoSlotSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=PropertyPhoto.Kind.choices)
    roomType = serializers.CharField(source="room_type", max_length=100, required=False, allow_blank=True, default="", trim_whitespace=False)

    def validate(self, attrs):
        if attrs["kind"] == PropertyPhoto.Kind.COVER and attrs["room_type"]:
            raise serializers.ValidationError("A cover photo cannot have a room type.")
        return attrs


class PhotoUploadSerializer(PhotoSlotSerializer):
    contentType = serializers.CharField(source="content_type")
    contentLength = serializers.IntegerField(source="content_length", min_value=1)


def _property(request, organization_slug, property_slug, permission):
    return get_accessible_property(
        user=request.user.db_user, organization_slug=organization_slug,
        property_slug=property_slug, permission=permission,
    )


def _storage_error():
    logger.warning("Property photo storage is temporarily unavailable.")
    return Response({"error": "Photo storage is temporarily unavailable."}, status=503)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def hotel_property_photos(request, organization_slug, property_slug):
    property_ = _property(request, organization_slug, property_slug,
                          Permission.HOTEL_VIEW if request.method == "GET" else Permission.HOTEL_MANAGE)
    if request.method == "DELETE":
        serializer = PhotoSlotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
    try:
        storage = PrivateObjectStorage()
        if request.method == "DELETE":
            remove_photo(property_=property_, storage=storage, **serializer.validated_data)
        return Response(build_photo_payload(property_=property_, storage=storage))
    except PropertyPhotoError as exc:
        return Response({"error": str(exc)}, status=400)
    except Exception:
        return _storage_error()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([IdentityUploadThrottle])
def hotel_property_photo_upload(request, organization_slug, property_slug):
    property_ = _property(request, organization_slug, property_slug, Permission.HOTEL_MANAGE)
    serializer = PhotoUploadSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        upload = create_pending_photo_upload(property_=property_, storage=PrivateObjectStorage(), **serializer.validated_data)
    except (PropertyPhotoError, ObjectStorageValidationError) as exc:
        return Response({"error": str(exc)}, status=400)
    except Exception:
        return _storage_error()
    return Response({"upload": {
        "url": upload.url, "method": upload.method, "headers": upload.headers,
        "expiresInSeconds": upload.expires_in_seconds,
    }})


hotel_property_photo_upload.cls.throttle_scope = "identity-upload"


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([IdentityUploadThrottle])
def hotel_property_photo_upload_complete(request, organization_slug, property_slug):
    property_ = _property(request, organization_slug, property_slug, Permission.HOTEL_MANAGE)
    serializer = PhotoSlotSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        storage = PrivateObjectStorage()
        finalize_photo_upload(property_=property_, storage=storage, **serializer.validated_data)
        return Response(build_photo_payload(property_=property_, storage=storage))
    except PropertyPhotoError as exc:
        return Response({"error": str(exc)}, status=400)
    except Exception:
        return _storage_error()


hotel_property_photo_upload_complete.cls.throttle_scope = "identity-upload"
