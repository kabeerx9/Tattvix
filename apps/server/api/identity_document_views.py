import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .identity_documents import (
    IdentityDocumentImageMissing,
    IdentityDocumentUploadConflict,
    build_identity_document_list_payload,
    build_identity_document_payload,
    create_image_access_url,
    create_pending_upload,
    delete_identity_document,
    finalize_pending_upload,
)
from .models import IdentityDocument
from .object_storage import PrivateObjectStorage
from .serializers import (
    IdentityDocumentImageAccessSerializer,
    IdentityDocumentImageFinalizeSerializer,
    IdentityDocumentImageUploadSerializer,
    IdentityDocumentSerializer,
)


logger = logging.getLogger(__name__)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def guest_identity_document_list(request):
    user = request.user.db_user

    if request.method == "GET":
        documents = IdentityDocument.objects.filter(user=user).prefetch_related(
            "images"
        )
        return Response(build_identity_document_list_payload(documents))

    serializer = IdentityDocumentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    document = serializer.save(user=user)
    return Response(
        build_identity_document_payload(document),
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def guest_identity_document_detail(request, document_id: int):
    document = _owned_document(request, document_id)

    if request.method == "GET":
        return Response(build_identity_document_payload(document))

    if request.method == "PUT":
        serializer = IdentityDocumentSerializer(instance=document, data=request.data)
        serializer.is_valid(raise_exception=True)
        updated_document = serializer.save()
        return Response(build_identity_document_payload(updated_document))

    try:
        delete_identity_document(
            document=document,
            storage=PrivateObjectStorage(),
        )
    except Exception:
        return _storage_unavailable_response(
            "delete",
            document_id=document.id,
        )
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def guest_identity_document_upload(request, document_id: int):
    document = _owned_document(request, document_id)
    serializer = IdentityDocumentImageUploadSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        pending_upload = create_pending_upload(
            document=document,
            storage=PrivateObjectStorage(),
            **serializer.validated_data,
        )
    except Exception:
        return _storage_unavailable_response(
            "authorize upload for",
            document_id=document.id,
        )

    upload = pending_upload.upload
    return Response(
        {
            "objectKey": upload.object_key,
            "url": upload.url,
            "method": upload.method,
            "headers": upload.headers,
            "expiresInSeconds": upload.expires_in_seconds,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def guest_identity_document_upload_complete(request, document_id: int):
    document = _owned_document(request, document_id)
    serializer = IdentityDocumentImageFinalizeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        updated_document = finalize_pending_upload(
            document=document,
            storage=PrivateObjectStorage(),
            **serializer.validated_data,
        )
    except IdentityDocumentUploadConflict as exc:
        return Response(
            {"error": str(exc)},
            status=status.HTTP_409_CONFLICT,
        )
    except Exception:
        return _storage_unavailable_response(
            "finalize upload for",
            document_id=document.id,
        )

    return Response(build_identity_document_payload(updated_document))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def guest_identity_document_image_access(request, document_id: int):
    document = _owned_document(request, document_id)
    serializer = IdentityDocumentImageAccessSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        url = create_image_access_url(
            document=document,
            storage=PrivateObjectStorage(),
            **serializer.validated_data,
        )
    except IdentityDocumentImageMissing as exc:
        return Response(
            {"error": str(exc)},
            status=status.HTTP_404_NOT_FOUND,
        )
    except Exception:
        return _storage_unavailable_response(
            "create image access for",
            document_id=document.id,
        )

    return Response(
        {
            "url": url,
            "expiresInSeconds": settings.OBJECT_STORAGE_PRESIGNED_URL_TTL_SECONDS,
        }
    )


def _owned_document(request, document_id: int) -> IdentityDocument:
    return get_object_or_404(
        IdentityDocument.objects.select_related("user").prefetch_related("images"),
        id=document_id,
        user=request.user.db_user,
    )


def _storage_unavailable_response(action: str, *, document_id: int) -> Response:
    logger.warning(
        "Object storage could not %s identity document id=%s.",
        action,
        document_id,
    )
    return Response(
        {"error": "Private document storage is temporarily unavailable."},
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )
