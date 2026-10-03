from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from .check_in import CheckInError, hotel_identity_access_state
from .models import (
    ClerkUser,
    IdentityAccessAction,
    IdentityAccessAudit,
    OperationalStayStatus,
    Property,
    Room,
    RoomStatus,
    Stay,
    StayStatus,
    StayCharge,
)


def build_room_payload(room: Room) -> dict:
    return {
        "id": room.id,
        "number": room.number,
        "floor": room.floor,
        "roomType": room.room_type,
        "status": room.status,
        "isActive": room.is_active,
        "nightlyRateMinor": room.nightly_rate_minor,
    }


def create_room(
    *,
    property_: Property,
    number: str,
    floor: str,
    room_type: str,
    nightly_rate_minor: int | None = None,
) -> Room:
    try:
        return Room.objects.create(
            property=property_,
            number=number,
            floor=floor,
            room_type=room_type,
            nightly_rate_minor=nightly_rate_minor,
        )
    except IntegrityError as exc:
        raise CheckInError(
            "room_number_exists",
            "A room with this number already exists at this property.",
        ) from exc


def change_room_status(
    *,
    property_: Property,
    room: Room,
    next_status: str,
) -> Room:
    with transaction.atomic():
        locked_room = Room.objects.select_for_update().get(
            id=room.id,
            property=property_,
        )
        if locked_room.status == RoomStatus.OCCUPIED:
            raise CheckInError(
                "room_is_occupied",
                "An occupied room cannot be changed manually.",
            )
        locked_room.status = next_status
        locked_room.save(update_fields=["status", "updated_at"])
        return locked_room


def confirm_hotel_check_in(
    *,
    property_: Property,
    stay: Stay,
    room_id: int,
    actor: ClerkUser,
    nights: int = 1,
) -> Stay:
    try:
        with transaction.atomic():
            locked_stay = Stay.objects.select_for_update().get(
                id=stay.id, property=property_
            )
            if locked_stay.operational_status == OperationalStayStatus.CHECKED_IN:
                if (
                    locked_stay.room_id == room_id
                    and locked_stay.billing_nights == nights
                ):
                    return locked_stay
                raise CheckInError(
                    "stay_already_checked_in",
                    "This guest is already checked into another room.",
                )
            if locked_stay.operational_status == OperationalStayStatus.CHECKED_OUT:
                raise CheckInError(
                    "stay_already_checked_out",
                    "A completed stay cannot be checked in again.",
                )
            if locked_stay.status != StayStatus.SUBMITTED:
                raise CheckInError(
                    "identity_unavailable",
                    "An active submitted identity package is required for check-in.",
                )
            if not hotel_identity_access_state(locked_stay)["isActive"]:
                raise CheckInError(
                    "identity_unavailable",
                    "The guest's identity access window has ended.",
                )

            room = Room.objects.select_for_update().get(
                id=room_id,
                property=property_,
                is_active=True,
            )
            if room.status != RoomStatus.VACANT:
                raise CheckInError(
                    "room_unavailable",
                    "Choose a vacant room before confirming check-in.",
                )

            if room.nightly_rate_minor is None:
                raise CheckInError(
                    "room_rate_missing",
                    "Set a nightly rate before confirming check-in.",
                )

            now = timezone.now()
            room.status = RoomStatus.OCCUPIED
            room.save(update_fields=["status", "updated_at"])
            locked_stay.billing_nights = nights
            locked_stay.nightly_rate_minor = room.nightly_rate_minor
            StayCharge.objects.create(
                stay=locked_stay,
                kind=StayCharge.Kind.ROOM,
                description=f"Room {room.number}",
                quantity=nights,
                unit_price_minor=room.nightly_rate_minor,
                created_by=actor,
            )
            locked_stay.room = room
            locked_stay.operational_status = OperationalStayStatus.CHECKED_IN
            locked_stay.checked_in_at = now
            locked_stay.checked_out_at = None
            locked_stay.save(
                update_fields=[
                    "room",
                    "billing_nights",
                    "nightly_rate_minor",
                    "operational_status",
                    "checked_in_at",
                    "checked_out_at",
                    "updated_at",
                ]
            )
            return (
                Stay.objects.select_related("identity_snapshot", "room")
                .prefetch_related("identity_snapshot__document_images")
                .get(id=locked_stay.id)
            )
    except Room.DoesNotExist as exc:
        raise CheckInError(
            "room_unavailable",
            "That room is unavailable at this property.",
        ) from exc
    except IntegrityError as exc:
        raise CheckInError(
            "room_unavailable",
            "That room was assigned to another stay. Choose another room.",
        ) from exc


def checkout_hotel_stay(
    *,
    property_: Property,
    stay: Stay,
    actor: ClerkUser,
) -> Stay:
    with transaction.atomic():
        locked_stay = (
            Stay.objects.select_for_update()
            .get(id=stay.id, property=property_)
        )
        if locked_stay.operational_status == OperationalStayStatus.CHECKED_OUT:
            return locked_stay
        if locked_stay.operational_status != OperationalStayStatus.CHECKED_IN:
            raise CheckInError(
                "stay_not_checked_in",
                "Assign a room and confirm check-in before checkout.",
            )
        if locked_stay.room_id is None:
            raise CheckInError(
                "room_assignment_missing",
                "This stay has no room assignment.",
            )

        room = Room.objects.select_for_update().get(
            id=locked_stay.room_id,
            property=property_,
        )
        now = timezone.now()
        room.status = RoomStatus.CLEANING
        room.save(update_fields=["status", "updated_at"])
        locked_stay.operational_status = OperationalStayStatus.CHECKED_OUT
        locked_stay.checked_out_at = now

        identity_fields = []
        if locked_stay.status == StayStatus.SUBMITTED:
            grace_expires_at = now + timedelta(
                hours=settings.HOTEL_IDENTITY_POST_CLOSE_GRACE_HOURS
            )
            locked_stay.status = StayStatus.CLOSED
            locked_stay.closed_at = now
            identity_fields.extend(["status", "closed_at"])
            if (
                locked_stay.hotel_access_expires_at is None
                or locked_stay.hotel_access_expires_at > grace_expires_at
            ):
                locked_stay.hotel_access_expires_at = grace_expires_at
                identity_fields.append("hotel_access_expires_at")
            IdentityAccessAudit.objects.create(
                stay=locked_stay,
                actor=actor,
                action=IdentityAccessAction.STAY_CLOSED,
            )

        locked_stay.save(
            update_fields=[
                "operational_status",
                "checked_out_at",
                "updated_at",
                *identity_fields,
            ]
        )
        return (
            Stay.objects.select_related("identity_snapshot", "room")
            .prefetch_related("identity_snapshot__document_images")
            .get(id=locked_stay.id)
        )


def build_hotel_guest_stay_payload(stay: Stay) -> dict:
    snapshot = stay.identity_snapshot
    guest_data = snapshot.guest_data
    return {
        "id": str(stay.public_id),
        "guestName": " ".join(
            value
            for value in (
                guest_data.get("legalFirstName", ""),
                guest_data.get("legalLastName", ""),
            )
            if value
        )
        or "Guest",
        "companionCount": len(snapshot.companion_data),
        "operationalStatus": stay.operational_status,
        "room": build_room_payload(stay.room) if stay.room else None,
        "checkedInAt": (
            stay.checked_in_at.isoformat() if stay.checked_in_at else None
        ),
        "checkedOutAt": (
            stay.checked_out_at.isoformat() if stay.checked_out_at else None
        ),
    }
