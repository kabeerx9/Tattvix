from datetime import date, timedelta

from django.utils import timezone

from .models import OperationalStayStatus, Room, Stay, StayCharge


def _day(value) -> date:
    return timezone.localtime(value).date()


def build_overview_summary(*, property_, today: date, days: int, include_revenue: bool) -> dict:
    window = [today - timedelta(days=offset) for offset in range(days - 1, -1, -1)]
    stays = list(Stay.objects.filter(
        property=property_,
        operational_status__in=[
            OperationalStayStatus.CHECKED_IN, OperationalStayStatus.CHECKED_OUT,
        ],
        checked_in_at__isnull=False,
    ))
    payload = {
        "dateFrom": window[0].isoformat(),
        "dateTo": window[-1].isoformat(),
        # Rooms have no historical inventory: today's count is the denominator.
        "activeRooms": Room.objects.filter(property=property_, is_active=True).count(),
        "occupancy": [
            {
                "date": day.isoformat(),
                "occupiedRooms": sum(
                    1 for stay in stays
                    if _day(stay.checked_in_at) <= day
                    and (stay.checked_out_at is None or _day(stay.checked_out_at) > day)
                ),
            }
            for day in window
        ],
        "revenue": None,
    }
    if not include_revenue:
        return payload

    totals = {day: 0 for day in window}
    charges = StayCharge.objects.filter(
        stay__property=property_, voided_at__isnull=True,
    ).select_related("stay")
    for charge in charges:
        if charge.kind == StayCharge.Kind.ROOM:
            start = _day(charge.stay.checked_in_at or charge.created_at)
            for night in range(charge.quantity):
                day = start + timedelta(days=night)
                if day in totals:
                    totals[day] += charge.unit_price_minor
        else:
            day = _day(charge.created_at)
            if day in totals:
                totals[day] += charge.quantity * charge.unit_price_minor
    payload["revenue"] = {
        "totalMinor": sum(totals.values()),
        "byDay": [{"date": day.isoformat(), "amountMinor": totals[day]} for day in window],
    }
    return payload
