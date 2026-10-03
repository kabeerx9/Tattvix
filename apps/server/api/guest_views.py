import logging

from django.db import transaction
from django.http import Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .companion_profile import (
    build_companion_list_payload,
    build_companion_profile_payload,
)
from .guest_profile import build_guest_profile_payload
from .identity_documents import delete_identity_document, is_identity_document_ready
from .object_storage import PrivateObjectStorage
from .models import CompanionProfile, GuestProfile, IdentityDocument
from .serializers import CompanionProfileSerializer, GuestProfileSerializer


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def guest_profile(request):
    user = request.user.db_user
    profile = GuestProfile.objects.filter(user=user).first()
    identity_documents = IdentityDocument.objects.filter(
        user=user, companion__isnull=True
    ).prefetch_related("images")
    has_complete_identity_document = any(
        is_identity_document_ready(document) for document in identity_documents
    )

    if request.method == "GET":
        return Response(
            build_guest_profile_payload(
                profile,
                has_complete_identity_document=has_complete_identity_document,
            )
        )

    serializer = GuestProfileSerializer(instance=profile, data=request.data)
    serializer.is_valid(raise_exception=True)
    saved_profile = serializer.save(user=user)
    return Response(
        build_guest_profile_payload(
            saved_profile,
            has_complete_identity_document=has_complete_identity_document,
        )
    )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def guest_companion_list(request):
    user = request.user.db_user

    if request.method == "GET":
        companions = CompanionProfile.objects.filter(user=user).order_by(
            "-updated_at", "-id"
        )
        return Response(build_companion_list_payload(companions))

    serializer = CompanionProfileSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    companion = serializer.save(user=user)
    return Response(
        build_companion_profile_payload(companion),
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def guest_companion_detail(request, companion_id: int):
    companion = get_object_or_404(
        CompanionProfile,
        id=companion_id,
        user=request.user.db_user,
    )

    if request.method == "GET":
        return Response(build_companion_profile_payload(companion))

    if request.method == "PUT":
        serializer = CompanionProfileSerializer(instance=companion, data=request.data)
        serializer.is_valid(raise_exception=True)
        updated_companion = serializer.save()
        return Response(build_companion_profile_payload(updated_companion))

    try:
        with transaction.atomic():
            # Prevent document creation or upload mutation during private cleanup.
            companion = get_object_or_404(
                CompanionProfile.objects.select_for_update(),
                id=companion_id,
                user=request.user.db_user,
            )
            documents = companion.identity_documents.prefetch_related("images")
            if documents.exists():
                storage = PrivateObjectStorage()
                for document in documents:
                    delete_identity_document(document=document, storage=storage)
            companion.delete()
    except Http404:
        raise
    except Exception:
        logging.getLogger(__name__).warning(
            "Private storage cleanup failed for companion id=%s.", companion_id
        )
        return Response(
            {"error": "Private document storage is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    return Response(status=status.HTTP_204_NO_CONTENT)
