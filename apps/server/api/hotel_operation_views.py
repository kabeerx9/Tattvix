from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .check_in import CheckInError, build_hotel_stay_detail
from .hotel_access import get_accessible_property
from .hotel_operations import (
    build_hotel_guest_stay_payload,
    build_room_payload,
    change_room_status,
    checkout_hotel_stay,
    confirm_hotel_check_in,
    create_room,
)
from .models import OperationalStayStatus, Room, Stay, StayStatus
from .rbac import Permission
from .serializers import (
    HotelRoomCreateSerializer,
    HotelRoomStatusSerializer,
    HotelStayCheckInSerializer,
)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def hotel_room_list(request, organization_slug: str, property_slug: str):
    permission = (
        Permission.ROOMS_MANAGE
        if request.method == "POST"
        else Permission.ROOMS_VIEW
    )
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=permission,
    )
    if request.method == "GET":
        rooms = Room.objects.filter(property=property_, is_active=True)
        return Response({"rooms": [build_room_payload(room) for room in rooms]})

    serializer = HotelRoomCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        room = create_room(property_=property_, **serializer.validated_data)
    except CheckInError as exc:
        return _operations_error_response(exc)
    return Response(build_room_payload(room), status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def hotel_room_status(
    request,
    organization_slug: str,
    property_slug: str,
    room_id: int,
):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.ROOMS_MANAGE,
    )
    room = get_object_or_404(Room, id=room_id, property=property_, is_active=True)
    serializer = HotelRoomStatusSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        updated_room = change_room_status(
            property_=property_,
            room=room,
            next_status=serializer.validated_data["status"],
        )
    except CheckInError as exc:
        return _operations_error_response(exc)
    return Response(build_room_payload(updated_room))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hotel_stay_check_in(
    request,
    organization_slug: str,
    property_slug: str,
    stay_id,
):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.ROOMS_ASSIGN,
    )
    stay = get_object_or_404(
        Stay,
        public_id=stay_id,
        property=property_,
    )
    serializer = HotelStayCheckInSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        updated_stay = confirm_hotel_check_in(
            property_=property_,
            stay=stay,
            room_id=serializer.validated_data["room_id"],
        )
    except CheckInError as exc:
        return _operations_error_response(exc)
    return Response(build_hotel_stay_detail(updated_stay))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hotel_stay_checkout(
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
        updated_stay = checkout_hotel_stay(
            property_=property_,
            stay=stay,
            actor=request.user.db_user,
        )
    except CheckInError as exc:
        return _operations_error_response(exc)
    return Response(build_hotel_stay_detail(updated_stay))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def hotel_guest_list(request, organization_slug: str, property_slug: str):
    property_ = get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=Permission.STAYS_VIEW,
    )
    stays = (
        Stay.objects.filter(
            property=property_,
            operational_status__in=(
                OperationalStayStatus.CHECKED_IN,
                OperationalStayStatus.CHECKED_OUT,
            ),
        )
        .exclude(status=StayStatus.DRAFT)
        .select_related("identity_snapshot", "room")
        .order_by("-checked_in_at", "-id")
    )
    current = []
    history = []
    for stay in stays:
        payload = build_hotel_guest_stay_payload(stay)
        if stay.operational_status == OperationalStayStatus.CHECKED_IN:
            current.append(payload)
        else:
            history.append(payload)
    return Response({"current": current, "history": history})


def _operations_error_response(exc: CheckInError) -> Response:
    return Response(
        {"error": exc.message, "code": exc.code},
        status=status.HTTP_409_CONFLICT,
    )
