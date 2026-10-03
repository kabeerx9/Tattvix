from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .billing import add_extra_charge, read_stay_bill, void_extra_charge
from .billing_serializers import (
    ExtraChargeSerializer,
    PropertyDetailsSerializer,
    RoomRateSerializer,
    VoidChargeSerializer,
)
from .check_in import CheckInError, build_guest_share_payload
from .hotel_access import get_accessible_property
from .hotel_operations import build_room_payload
from .models import Property, Room, Stay, StayCharge, StayStatus
from .property_details import build_property_details
from .rbac import Permission


def _property(request, organization_slug, property_slug, permission):
    return get_accessible_property(
        user=request.user.db_user,
        organization_slug=organization_slug,
        property_slug=property_slug,
        permission=permission,
    )


def _conflict(exc):
    return Response({"error": exc.message, "code": exc.code}, status=409)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def hotel_room_rate(request, organization_slug, property_slug, room_id):
    property_ = _property(
        request, organization_slug, property_slug, Permission.ROOMS_MANAGE
    )
    serializer = RoomRateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic():
        room = get_object_or_404(
            Room.objects.select_for_update(),
            pk=room_id,
            property=property_,
            is_active=True,
        )
        room.nightly_rate_minor = serializer.validated_data["nightly_rate_minor"]
        room.save(update_fields=["nightly_rate_minor", "updated_at"])
        return Response(build_room_payload(room))


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def hotel_property_details(request, organization_slug, property_slug):
    property_ = _property(
        request,
        organization_slug,
        property_slug,
        Permission.HOTEL_MANAGE if request.method == "PATCH" else Permission.HOTEL_VIEW,
    )
    if request.method == "PATCH":
        serializer = PropertyDetailsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            property_ = Property.objects.select_for_update().get(pk=property_.pk)
            for field, value in serializer.validated_data.items():
                setattr(property_, field, value)
            property_.save(update_fields=[*serializer.validated_data, "updated_at"])
    return Response(build_property_details(property_))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def hotel_stay_bill(request, organization_slug, property_slug, stay_id):
    property_ = _property(
        request,
        organization_slug,
        property_slug,
        Permission.STAYS_UPDATE if request.method == "POST" else Permission.STAYS_VIEW,
    )
    stay = get_object_or_404(Stay, public_id=stay_id, property=property_)
    if request.method == "GET":
        return Response(read_stay_bill(stay))
    serializer = ExtraChargeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        return Response(
            add_extra_charge(
                stay=stay, actor=request.user.db_user, **serializer.validated_data
            )
        )
    except CheckInError as exc:
        return _conflict(exc)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def hotel_stay_charge_void(request, organization_slug, property_slug, stay_id, item_id):
    property_ = _property(
        request, organization_slug, property_slug, Permission.STAYS_UPDATE
    )
    stay = get_object_or_404(Stay, public_id=stay_id, property=property_)
    serializer = VoidChargeSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        return Response(
            void_extra_charge(
                stay=stay,
                item_id=item_id,
                actor=request.user.db_user,
                **serializer.validated_data,
            )
        )
    except StayCharge.DoesNotExist:
        from rest_framework.exceptions import NotFound

        raise NotFound()
    except CheckInError as exc:
        return _conflict(exc)


def _guest_stay(request, stay_id):
    return get_object_or_404(
        Stay.objects.select_related(
            "property__organization", "room", "identity_snapshot"
        ).exclude(status=StayStatus.DRAFT),
        public_id=stay_id,
        guest=request.user.db_user,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def guest_stay_detail(request, stay_id):
    return Response(build_guest_share_payload(_guest_stay(request, stay_id)))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def guest_stay_bill(request, stay_id):
    return Response(read_stay_bill(_guest_stay(request, stay_id)))
