"""Stay-owned billing. All mutations serialize on the same lock as checkout."""

from django.db import transaction
from django.utils import timezone

from .check_in import CheckInError
from .models import OperationalStayStatus, Stay, StayCharge


def build_bill_payload(stay):
    items = [
        {
            "id": str(charge.public_id),
            "kind": charge.kind,
            "description": charge.description,
            "quantity": charge.quantity,
            "unitPriceMinor": charge.unit_price_minor,
            "lineTotalMinor": charge.quantity * charge.unit_price_minor,
            "createdAt": charge.created_at.isoformat(),
            "voidedAt": charge.voided_at.isoformat() if charge.voided_at else None,
            "voidReason": charge.void_reason,
        }
        for charge in stay.charges.all()
    ]
    return {
        "currency": "INR",
        "isFinal": stay.operational_status == OperationalStayStatus.CHECKED_OUT,
        "roomNights": stay.billing_nights,
        "nightlyRateMinor": stay.nightly_rate_minor,
        "items": items,
        "totalMinor": sum(
            item["lineTotalMinor"] for item in items if item["voidedAt"] is None
        ),
    }


@transaction.atomic
def read_stay_bill(stay):
    # Keep the status/snapshot and charge rows from the same logical revision.
    # Refresh after the access lookup: confirmation may have committed since it.
    locked = Stay.objects.select_for_update().get(pk=stay.pk)
    return build_bill_payload(locked)


def _require_open_bill(stay):
    if stay.operational_status != OperationalStayStatus.CHECKED_IN:
        raise CheckInError(
            "bill_not_open", "Charges can only be changed during a checked-in stay."
        )


@transaction.atomic
def add_extra_charge(
    *, stay, actor, request_id, description, quantity, unit_price_minor
):
    locked = Stay.objects.select_for_update().get(pk=stay.pk)
    existing = locked.charges.filter(request_id=request_id).first()
    if existing:
        if (
            existing.kind,
            existing.description,
            existing.quantity,
            existing.unit_price_minor,
        ) != (StayCharge.Kind.EXTRA, description, quantity, unit_price_minor):
            raise CheckInError(
                "charge_request_conflict",
                "This request ID was already used for a different charge.",
            )
        return build_bill_payload(locked)
    _require_open_bill(locked)
    current_total = sum(
        charge.quantity * charge.unit_price_minor
        for charge in locked.charges.filter(voided_at__isnull=True)
    )
    if current_total + quantity * unit_price_minor > 9007199254740991:
        raise CheckInError(
            "bill_total_limit", "This charge would exceed the supported bill total."
        )
    StayCharge.objects.create(
        stay=locked,
        created_by=actor,
        kind=StayCharge.Kind.EXTRA,
        request_id=request_id,
        description=description,
        quantity=quantity,
        unit_price_minor=unit_price_minor,
    )
    return build_bill_payload(locked)


@transaction.atomic
def void_extra_charge(*, stay, item_id, actor, reason):
    locked = Stay.objects.select_for_update().get(pk=stay.pk)
    _require_open_bill(locked)
    charge = locked.charges.get(public_id=item_id)
    if charge.kind != StayCharge.Kind.EXTRA:
        raise CheckInError(
            "room_charge_not_voidable", "The room charge cannot be voided."
        )
    if charge.voided_at:
        if charge.void_reason != reason:
            raise CheckInError(
                "charge_already_voided",
                "This charge was already voided with a different reason.",
            )
        return build_bill_payload(locked)
    charge.voided_at = timezone.now()
    charge.voided_by = actor
    charge.void_reason = reason
    charge.save(update_fields=["voided_at", "voided_by", "void_reason"])
    return build_bill_payload(locked)
