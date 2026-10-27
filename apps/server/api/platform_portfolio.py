"""Platform-admin portfolio: every property with rooms, rates and activity.

Privacy constraint: this module returns operational aggregates, with active
owner account contacts only when explicitly requested by an admin client.
It never reads guest profiles, identity snapshots, document images or guest
emails. Stay rows are touched only through
aggregates (Count/Max) or their timestamps.

Query budget: a fixed number of grouped queries regardless of how many
properties exist (properties, rooms, stays, recent stays, charges, photos,
registration requests, memberships, optional owner contacts). Each relation is grouped on its own
instead of joined into one annotate, which would multiply rows across the
rooms x stays x charges joins and inflate the counts.
"""

import logging
from collections import defaultdict
from datetime import date, datetime, time, timedelta

from django.db.models import Count, F, Max, Min, Q, Sum
from django.utils import timezone

from .models import (
    HotelRegistrationRequest,
    Membership,
    MembershipRole,
    OperationalStayStatus,
    Property,
    PropertyPhoto,
    Room,
    RoomStatus,
    Stay,
    StayCharge,
    StayStatus,
    Subscription,
)
from .object_storage import PrivateObjectStorage
from .subscriptions import build_subscription_payload

logger = logging.getLogger(__name__)

RECENT_OCCUPANCY_NIGHTS = 7
RECENT_CHECK_IN_DAYS = 7
REVENUE_DAYS = 30


def _local_day(value) -> date:
    return timezone.localtime(value).date()


def _photo_urls(property_ids: list[int]) -> dict[int, dict]:
    """Presigned cover and room-type photo URLs, keyed by property id.

    Signing is local (no network call), but a misconfigured bucket must not
    take the whole portfolio down: photos then fall back to placeholders.
    """
    photos = list(
        PropertyPhoto.objects.filter(property_id__in=property_ids)
        .exclude(object_key="")
        .values("property_id", "kind", "room_type", "object_key")
    )
    result: dict[int, dict] = defaultdict(lambda: {"cover": None, "roomTypes": {}})
    if not photos:
        return result
    try:
        storage = PrivateObjectStorage()
        for photo in photos:
            url = storage.create_download_url(object_key=photo["object_key"])
            slot = result[photo["property_id"]]
            if photo["kind"] == PropertyPhoto.Kind.COVER:
                slot["cover"] = url
            else:
                slot["roomTypes"][photo["room_type"]] = url
    except Exception:
        logger.warning("Portfolio photo URLs are unavailable; using placeholders.")
        return defaultdict(lambda: {"cover": None, "roomTypes": {}})
    return result


def _room_summaries(property_ids: list[int]) -> dict[int, dict]:
    rows = (
        Room.objects.filter(property_id__in=property_ids, is_active=True)
        .values("property_id", "room_type", "status")
        .annotate(
            rooms=Count("id"),
            rated=Count("nightly_rate_minor"),
            rate_sum=Sum("nightly_rate_minor"),
            rate_min=Min("nightly_rate_minor"),
            rate_max=Max("nightly_rate_minor"),
            last_updated=Max("updated_at"),
        )
        .order_by()
    )

    def empty_rates():
        return {"rated": 0, "sum": 0, "min": None, "max": None}

    summaries: dict[int, dict] = defaultdict(
        lambda: {
            "status": defaultdict(int),
            "types": defaultdict(lambda: {"status": defaultdict(int), "rates": empty_rates()}),
            "rates": empty_rates(),
            "last_updated": None,
        }
    )

    def merge_rates(target, row):
        if not row["rated"]:
            return
        target["rated"] += row["rated"]
        target["sum"] += row["rate_sum"]
        target["min"] = row["rate_min"] if target["min"] is None else min(target["min"], row["rate_min"])
        target["max"] = row["rate_max"] if target["max"] is None else max(target["max"], row["rate_max"])

    for row in rows:
        summary = summaries[row["property_id"]]
        summary["status"][row["status"]] += row["rooms"]
        room_type = summary["types"][row["room_type"]]
        room_type["status"][row["status"]] += row["rooms"]
        merge_rates(room_type["rates"], row)
        merge_rates(summary["rates"], row)
        if summary["last_updated"] is None or row["last_updated"] > summary["last_updated"]:
            summary["last_updated"] = row["last_updated"]
    return summaries


def _status_payload(status_counts) -> dict:
    return {
        "total": sum(status_counts.values()),
        "occupied": status_counts[RoomStatus.OCCUPIED],
        "ready": status_counts[RoomStatus.VACANT],
        "cleaning": status_counts[RoomStatus.CLEANING],
        "maintenance": status_counts[RoomStatus.MAINTENANCE],
    }


def _rates_payload(rates) -> dict:
    return {
        "minMinor": rates["min"],
        "avgMinor": round(rates["sum"] / rates["rated"]) if rates["rated"] else None,
        "maxMinor": rates["max"],
    }


def _stay_summaries(property_ids: list[int], now) -> dict[int, dict]:
    recent_cutoff = now - timedelta(days=RECENT_CHECK_IN_DAYS)
    rows = (
        Stay.objects.filter(property_id__in=property_ids)
        .exclude(status=StayStatus.DRAFT)
        .values("property_id")
        .annotate(
            in_house=Count(
                "id", filter=Q(operational_status=OperationalStayStatus.CHECKED_IN)
            ),
            arrivals_pending=Count(
                "id",
                filter=Q(operational_status=OperationalStayStatus.PENDING_CHECK_IN),
            ),
            check_ins_recent=Count("id", filter=Q(checked_in_at__gte=recent_cutoff)),
            last_updated=Max("updated_at"),
        )
        .order_by()
    )
    return {row["property_id"]: row for row in rows}


def _recent_room_nights(property_ids: list[int], today: date, now) -> dict[int, int]:
    """Occupied room-nights over the last N nights, same rule as hotel overview.

    A stay occupies night `d` when it checked in on or before `d` and had not
    checked out by `d`. Only stays overlapping the window are fetched.
    """
    window = [today - timedelta(days=offset) for offset in range(RECENT_OCCUPANCY_NIGHTS)]
    window_start = timezone.make_aware(datetime.combine(window[-1], time.min))
    stays = (
        Stay.objects.filter(
            property_id__in=property_ids,
            checked_in_at__isnull=False,
            checked_in_at__lte=now,
            operational_status__in=[
                OperationalStayStatus.CHECKED_IN,
                OperationalStayStatus.CHECKED_OUT,
            ],
        )
        .filter(Q(checked_out_at__isnull=True) | Q(checked_out_at__gte=window_start))
        .values_list("property_id", "checked_in_at", "checked_out_at")
    )
    nights: dict[int, int] = defaultdict(int)
    for property_id, checked_in_at, checked_out_at in stays:
        start = _local_day(checked_in_at)
        end = _local_day(checked_out_at) if checked_out_at else None
        nights[property_id] += sum(
            1 for day in window if start <= day and (end is None or end > day)
        )
    return nights


def _charge_summaries(property_ids: list[int], now) -> dict[int, dict]:
    cutoff = now - timedelta(days=REVENUE_DAYS)
    rows = (
        StayCharge.objects.filter(stay__property_id__in=property_ids, voided_at__isnull=True)
        .values("stay__property_id")
        .annotate(
            revenue=Sum(
                F("quantity") * F("unit_price_minor"), filter=Q(created_at__gte=cutoff)
            ),
            last_created=Max("created_at"),
        )
        .order_by()
    )
    return {row["stay__property_id"]: row for row in rows}


def _latest(*values):
    present = [value for value in values if value is not None]
    return max(present) if present else None


def build_platform_portfolio(*, organization_slug: str | None = None, include_contacts: bool = False) -> dict:
    now = timezone.now()
    today = timezone.localdate()

    properties_qs = Property.objects.select_related("organization").order_by(
        "organization__name", "name", "id"
    )
    if organization_slug:
        properties_qs = properties_qs.filter(organization__slug=organization_slug)
    properties = list(properties_qs)
    property_ids = [property_.id for property_ in properties]
    if not property_ids:
        return {"generatedAt": now.isoformat(), "properties": []}

    rooms = _room_summaries(property_ids)
    stays = _stay_summaries(property_ids, now)
    room_nights = _recent_room_nights(property_ids, today, now)
    charges = _charge_summaries(property_ids, now)
    photos = _photo_urls(property_ids)
    via_request = set(
        HotelRegistrationRequest.objects.filter(property_id__in=property_ids)
        .values_list("property_id", flat=True)
    )
    organization_ids = {property_.organization_id for property_ in properties}
    owners = defaultdict(list)
    if include_contacts:
        for member in Membership.objects.filter(
            organization_id__in=organization_ids, is_active=True, role=MembershipRole.OWNER,
        ).select_related("user").order_by("user__email", "id"):
            owners[member.organization_id].append({
                "name": f"{member.user.first_name} {member.user.last_name}".strip(),
                "email": member.user.email,
            })
    members = dict(
        Membership.objects.filter(
            organization_id__in=organization_ids,
            is_active=True,
        )
        .values("organization_id")
        .annotate(count=Count("id"))
        .order_by()
        .values_list("organization_id", "count")
    )
    subscriptions = {
        subscription.organization_id: subscription
        for subscription in Subscription.objects.filter(
            organization_id__in=organization_ids
        )
    }

    payload = []
    for property_ in properties:
        room_summary = rooms[property_.id]
        room_counts = _status_payload(room_summary["status"])
        stay_summary = stays.get(property_.id, {})
        charge_summary = charges.get(property_.id, {})
        property_photos = photos[property_.id]
        rates = _rates_payload(room_summary["rates"])
        room_types = [
            {
                "name": name,
                "rooms": _status_payload(summary["status"]),
                "rates": _rates_payload(summary["rates"]),
                "photoUrl": property_photos["roomTypes"].get(name) if name else None,
            }
            for name, summary in sorted(
                room_summary["types"].items(), key=lambda item: (item[0] == "", item[0].lower())
            )
        ]
        last_activity = _latest(
            stay_summary.get("last_updated"),
            charge_summary.get("last_created"),
            room_summary["last_updated"],
        )
        organization = property_.organization
        payload.append(
            {
                "id": property_.id,
                "name": property_.name,
                "slug": property_.slug,
                "isActive": property_.is_active,
                "address": property_.address,
                **({"contacts": {"phone": property_.contact_phone, "owners": owners[organization.id]}} if include_contacts else {}),
                "coverPhotoUrl": property_photos["cover"],
                "organization": {
                    "name": organization.name,
                    "slug": organization.slug,
                    "isActive": organization.is_active,
                    "activeMemberCount": members.get(organization.id, 0),
                    "subscription": build_subscription_payload(
                        subscriptions.get(organization.id), now=now
                    ),
                },
                "onboarding": {
                    "source": "REQUEST" if property_.id in via_request else "ADMIN",
                    "onboardedAt": property_.created_at.isoformat(),
                },
                "setup": {
                    "hasAddress": bool(property_.address.strip()),
                    "hasCoverPhoto": property_photos["cover"] is not None,
                    "hasRooms": room_counts["total"] > 0,
                    "hasRates": rates["minMinor"] is not None,
                },
                "rooms": room_counts,
                "rates": rates,
                "roomTypes": room_types,
                "occupancy": {
                    "recentNights": RECENT_OCCUPANCY_NIGHTS,
                    "recentOccupiedRoomNights": room_nights.get(property_.id, 0),
                    "recentAvailableRoomNights": room_counts["total"] * RECENT_OCCUPANCY_NIGHTS,
                },
                "stays": {
                    "inHouse": stay_summary.get("in_house", 0),
                    "arrivalsPending": stay_summary.get("arrivals_pending", 0),
                    "checkInsLast7Days": stay_summary.get("check_ins_recent", 0),
                },
                "revenueLast30DaysMinor": charge_summary.get("revenue") or 0,
                "lastActivityAt": last_activity.isoformat() if last_activity else None,
            }
        )
    return {"generatedAt": now.isoformat(), "properties": payload}
