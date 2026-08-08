"""Read-only aggregates for hotel operational reports (issue #15).

Scope is deliberately narrow, per the resolution on issue #4: cheap
aggregates over data that already exists (stays, rooms), gated behind
Permission.REPORTS_VIEW, and never touching payment/revenue data. The
register and status-counts reports share the same date-range semantics —
a stay is "in range" if its check-in OR its check-out falls within
[date_from, date_to] — so a stay that checked in yesterday and checked out
today still shows up in today's register. Occupancy and the in-house list
are live snapshots of current state and take no date range.

Guest-name derivation mirrors build_hotel_guest_stay_payload /
build_hotel_stay_list_item: read off the immutable shared identity
snapshot, never the guest's live profile, and never anything beyond the
legal name. Document numbers and other identity-document fields are never
touched here.
"""

from django.db.models import Count, Q

from .models import OperationalStayStatus, Property, Room, RoomStatus, Stay


def _guest_name(stay: Stay) -> str:
    snapshot = getattr(stay, "identity_snapshot", None)
    guest_data = snapshot.guest_data if snapshot is not None else {}
    return (
        " ".join(
            value
            for value in (
                guest_data.get("legalFirstName", ""),
                guest_data.get("legalLastName", ""),
            )
            if value
        )
        or "Guest"
    )


def _companion_count(stay: Stay) -> int:
    snapshot = getattr(stay, "identity_snapshot", None)
    return len(snapshot.companion_data) if snapshot is not None else 0


def _isoformat(value):
    return value.isoformat() if value else None


def _in_range_filter(date_from, date_to) -> Q:
    return Q(
        checked_in_at__date__gte=date_from,
        checked_in_at__date__lte=date_to,
    ) | Q(
        checked_out_at__date__gte=date_from,
        checked_out_at__date__lte=date_to,
    )


def build_register_entry(stay: Stay) -> dict:
    return {
        "stayId": str(stay.public_id),
        "guestName": _guest_name(stay),
        "companionCount": _companion_count(stay),
        "roomNumber": stay.room.number if stay.room else None,
        "checkedInAt": _isoformat(stay.checked_in_at),
        "checkedOutAt": _isoformat(stay.checked_out_at),
        "operationalStatus": stay.operational_status,
    }


def build_register_entries(
    *, property_: Property, date_from, date_to
) -> list[dict]:
    stays = (
        Stay.objects.filter(property=property_)
        .filter(_in_range_filter(date_from, date_to))
        .select_related("identity_snapshot", "room")
        .order_by("-checked_in_at", "-checked_out_at", "-id")
    )
    return [build_register_entry(stay) for stay in stays]


def build_in_house_entries(*, property_: Property) -> list[dict]:
    stays = (
        Stay.objects.filter(
            property=property_,
            operational_status=OperationalStayStatus.CHECKED_IN,
        )
        .select_related("identity_snapshot", "room")
        .order_by("room__number", "-checked_in_at")
    )
    return [
        {
            "stayId": str(stay.public_id),
            "guestName": _guest_name(stay),
            "roomNumber": stay.room.number if stay.room else None,
            "checkedInAt": _isoformat(stay.checked_in_at),
        }
        for stay in stays
    ]


def build_occupancy_report(*, property_: Property) -> dict:
    rooms = Room.objects.filter(property=property_, is_active=True)
    raw_counts = {
        row["status"]: row["count"]
        for row in rooms.values("status").annotate(count=Count("id"))
    }
    status_counts = {
        status: raw_counts.get(status, 0) for status in RoomStatus.values
    }
    active_rooms = sum(status_counts.values())
    return {
        "occupiedRooms": status_counts[RoomStatus.OCCUPIED],
        "activeRooms": active_rooms,
        "statusCounts": status_counts,
    }


def build_status_counts(*, property_: Property, date_from, date_to) -> dict:
    stays = Stay.objects.filter(property=property_).filter(
        _in_range_filter(date_from, date_to)
    )
    raw_counts = {
        row["operational_status"]: row["count"]
        for row in stays.values("operational_status").annotate(count=Count("id"))
    }
    return {
        "pendingCheckIn": raw_counts.get(
            OperationalStayStatus.PENDING_CHECK_IN, 0
        ),
        "checkedIn": raw_counts.get(OperationalStayStatus.CHECKED_IN, 0),
        "checkedOut": raw_counts.get(OperationalStayStatus.CHECKED_OUT, 0),
    }
