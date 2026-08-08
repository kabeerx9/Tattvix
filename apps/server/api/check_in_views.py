import logging

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .check_in import (
    CheckInError,
    build_check_in_context,
    build_guest_share_payload,
    build_guest_stay_payload,
    build_hotel_stay_detail,
    build_hotel_stay_list_item,
    close_hotel_stay,
    generate_hotel_qr_token,
    get_valid_hotel_qr_token,
    hotel_identity_access_state,
    revoke_guest_consent,
    submit_guest_identity,
)
from .hotel_access import get_accessible_property
from .models import (
    IdentityAccessAction,
    IdentityAccessAudit,
    SharedIdentityDocumentImage,
    Stay,
    StayStatus,
)
from .object_storage import PrivateObjectStorage
from .rbac import Permission
from .serializers import (
    GuestCheckInSubmitSerializer,
    HotelStayImageAccessSerializer,
)


logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([AllowAny])
def check_in_context(request, raw_token: str):
    try:
        qr_token = get_valid_hotel_qr_token(raw_token)
    except CheckInError as exc:
        return _check_in_error_response(exc, status.HTTP_404_NOT_FOUND)

    guest = (
        request.user.db_user
        if getattr(request.user, "is_authenticated", False)
        else None
    )
    return Response(build_check_in_context(qr_token=qr_token, guest=guest))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def guest_check_in_submit(request, raw_token: str):
    serializer = GuestCheckInSubmitSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        qr_token = get_valid_hotel_qr_token(raw_token)
        stay = submit_guest_identity(
            qr_token=qr_token,
            guest=request.user.db_user,
            storage=PrivateObjectStorage(),
            identity_document_id=serializer.validated_data["identity_document_id"],
            companion_ids=serializer.validated_data["companion_ids"],
        )
    except CheckInError as exc:
        return _check_in_error_response(exc, status.HTTP_400_BAD_REQUEST)
    except Exception:
        logger.exception("Guest identity submission failed.")
        return Response(
            {"error": "Identity sharing is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    return Response(build_guest_stay_payload(stay), status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def guest_stay_revoke(request, stay_id):
    stay = get_object_or_404(
        Stay,
        public_id=stay_id,
        guest=request.user.db_user,
    )
    try:
        updated_stay = revoke_guest_consent(
            stay=stay,
            guest=request.user.db_user,
        )
    except CheckInError as exc:
        return _check_in_error_response(exc, status.HTTP_409_CONFLICT)
    return Response(build_guest_stay_payload(updated_stay))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def guest_stay_list(request):
    stays = (
        Stay.objects.filter(guest=request.user.db_user)
        .exclude(status=StayStatus.DRAFT)
        .select_related("property__organization", "room")
        .prefetch_related("identity_access_events")
        .order_by("-submitted_at", "-created_at")
    )
    return Response(
        {"stays": [build_guest_share_payload(stay) for stay in stays]}
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hotel_check_in_token_create(
    request,
    organization_slug: str,
    property_slug: str,
):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.STAYS_UPDATE,
    )
    return Response(
        generate_hotel_qr_token(property_=property_, actor=request.user.db_user),
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hotel_stay_list(
    request,
    organization_slug: str,
    property_slug: str,
):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.STAYS_VIEW,
    )
    stays = (
        Stay.objects.filter(property=property_)
        .exclude(status=StayStatus.DRAFT)
        .select_related("identity_snapshot", "room")
        .order_by("-submitted_at", "-created_at")[:100]
    )
    return Response(
        {"stays": [build_hotel_stay_list_item(stay) for stay in stays]}
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hotel_stay_detail(
    request,
    organization_slug: str,
    property_slug: str,
    stay_id,
):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.STAYS_VIEW,
    )
    stay = get_object_or_404(
        Stay.objects.select_related("identity_snapshot", "room").prefetch_related(
            "identity_snapshot__document_images"
        ),
        public_id=stay_id,
        property=property_,
    )
    payload = build_hotel_stay_detail(stay)
    if payload["identityAccess"]["isActive"]:
        IdentityAccessAudit.objects.create(
            stay=stay,
            actor=request.user.db_user,
            action=IdentityAccessAction.DETAILS_VIEWED,
        )
    return Response(payload)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hotel_stay_image_access(
    request,
    organization_slug: str,
    property_slug: str,
    stay_id,
):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.STAYS_VIEW,
    )
    stay = get_object_or_404(
        Stay.objects.select_related("identity_snapshot"),
        public_id=stay_id,
        property=property_,
    )
    access = hotel_identity_access_state(stay)
    if not access["isActive"]:
        return Response(
            {"error": "Hotel access to this identity package has ended."},
            status=status.HTTP_403_FORBIDDEN,
        )

    serializer = HotelStayImageAccessSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    image = get_object_or_404(
        SharedIdentityDocumentImage,
        snapshot=stay.identity_snapshot,
        side=serializer.validated_data["side"],
    )
    try:
        url = PrivateObjectStorage().create_download_url(
            object_key=image.object_key
        )
    except Exception:
        logger.exception(
            "Could not create shared identity image URL for stay id=%s.",
            stay.id,
        )
        return Response(
            {"error": "Private document storage is temporarily unavailable."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    IdentityAccessAudit.objects.create(
        stay=stay,
        actor=request.user.db_user,
        action=IdentityAccessAction.DOCUMENT_VIEWED,
        image_side=image.side,
    )
    return Response(
        {
            "url": url,
            "expiresInSeconds": settings.OBJECT_STORAGE_PRESIGNED_URL_TTL_SECONDS,
        }
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hotel_stay_close(
    request,
    organization_slug: str,
    property_slug: str,
    stay_id,
):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.STAYS_UPDATE,
    )
    stay = get_object_or_404(
        Stay,
        public_id=stay_id,
        property=property_,
    )
    try:
        updated_stay = close_hotel_stay(
            stay=stay,
            actor=request.user.db_user,
        )
    except CheckInError as exc:
        return _check_in_error_response(exc, status.HTTP_409_CONFLICT)
    return Response(build_hotel_stay_detail(updated_stay))


def _check_in_error_response(exc: CheckInError, response_status: int) -> Response:
    return Response(
        {"error": exc.message, "code": exc.code},
        status=response_status,
    )
