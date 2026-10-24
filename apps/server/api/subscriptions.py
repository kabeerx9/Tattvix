"""Organization entitlement: free trial, then paid.

Entitlement is computed from dates, never stored: a hotel may operate while
`now < max(trial_ends_at, paid_until)`. Writes set a target date rather than
adding a delta, so a retried or double-submitted request is a no-op.
"""

import logging
from dataclasses import dataclass
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import status

from .exceptions import PayloadAPIException
from .models import (
    Organization,
    Property,
    Subscription,
    SubscriptionEvent,
    SubscriptionEventKind,
)

logger = logging.getLogger(__name__)

RECENT_EVENTS = 20


class SubscriptionExpired(PayloadAPIException):
    status_code = status.HTTP_402_PAYMENT_REQUIRED

    def __init__(self, subscription):
        super().__init__(
            {
                "error": "This hotel's free trial has ended. Contact Tattwix to continue.",
                "code": "subscription_expired",
                "trialEndsAt": _isoformat(subscription.trial_ends_at) if subscription else None,
                "paidUntil": _isoformat(subscription.paid_until) if subscription else None,
            }
        )


@dataclass(frozen=True)
class SubscriptionError(Exception):
    code: str
    message: str


def entitled_until(subscription):
    if subscription is None:
        return None
    candidates = [subscription.trial_ends_at]
    if subscription.paid_until is not None:
        candidates.append(subscription.paid_until)
    return max(candidates)


def is_entitled(subscription, *, now=None) -> bool:
    """False when there is no subscription row: fail closed, and say so loudly."""
    if subscription is None:
        return False
    return (now or timezone.now()) < entitled_until(subscription)


def start_trial(organization: Organization, *, now=None) -> Subscription:
    """Open the trial clock. Call inside the transaction that creates the org."""
    now = now or timezone.now()
    subscription = Subscription.objects.create(
        organization=organization,
        trial_ends_at=now + timedelta(days=settings.SUBSCRIPTION_TRIAL_DAYS),
    )
    SubscriptionEvent.objects.create(
        subscription=subscription,
        kind=SubscriptionEventKind.TRIAL_STARTED,
        new_trial_ends_at=subscription.trial_ends_at,
    )
    return subscription


@transaction.atomic
def extend_trial(*, organization: Organization, actor, trial_ends_at, note: str):
    """Set the trial end to a later date. Idempotent: the same target is a no-op."""
    subscription = Subscription.objects.select_for_update().get(
        organization=organization
    )
    if trial_ends_at <= timezone.now():
        raise SubscriptionError(
            "trial_end_in_past", "The new trial end must be in the future."
        )
    if trial_ends_at < subscription.trial_ends_at:
        raise SubscriptionError(
            "trial_end_shortened", "Extending a trial cannot move its end earlier."
        )
    if trial_ends_at == subscription.trial_ends_at:
        return subscription
    previous = subscription.trial_ends_at
    subscription.trial_ends_at = trial_ends_at
    subscription.save(update_fields=["trial_ends_at", "updated_at"])
    SubscriptionEvent.objects.create(
        subscription=subscription,
        actor=actor,
        kind=SubscriptionEventKind.TRIAL_EXTENDED,
        previous_trial_ends_at=previous,
        new_trial_ends_at=trial_ends_at,
        note=note,
    )
    return subscription


def build_subscription_payload(subscription, *, now=None, include_events=False) -> dict:
    """Shared shape for /api/me memberships and the platform admin views.

    `status` is derived here for display and filtering only; the gate in
    hotel_access.py compares the dates directly.
    """
    now = now or timezone.now()
    if subscription is None:
        logger.warning(
            "Organization has no subscription row; treating as expired.",
        )
        return {
            "status": "MISSING",
            "entitled": False,
            "trialEndsAt": None,
            "paidUntil": None,
            "entitledUntil": None,
            "daysLeft": 0,
            **({"events": []} if include_events else {}),
        }
    until = entitled_until(subscription)
    entitled = now < until
    if not entitled:
        label = "EXPIRED"
    elif subscription.paid_until is not None and now < subscription.paid_until:
        label = "PAID"
    else:
        label = "TRIALING"
    payload = {
        "status": label,
        "entitled": entitled,
        "trialEndsAt": _isoformat(subscription.trial_ends_at),
        "paidUntil": _isoformat(subscription.paid_until),
        "entitledUntil": _isoformat(until),
        # Ceil so "ends in 30 minutes" still reads as 1 day, and never negative.
        "daysLeft": int(-(-(until - now).total_seconds() // 86400)) if entitled else 0,
    }
    if include_events:
        payload["events"] = [
            _event_payload(event)
            for event in subscription.events.select_related("actor")[:RECENT_EVENTS]
        ]
    return payload


def build_pricing_payload(organization: Organization) -> dict:
    properties = Property.objects.filter(organization=organization, is_active=True).count()
    per_property = settings.SUBSCRIPTION_PRICE_PER_PROPERTY_MINOR
    return {
        "currency": "INR",
        "pricePerPropertyMinor": per_property,
        "activeProperties": properties,
        "monthlyTotalMinor": per_property * properties,
    }


def _event_payload(event: SubscriptionEvent) -> dict:
    return {
        "id": event.id,
        "kind": event.kind,
        "actorEmail": event.actor.email if event.actor else None,
        "previousTrialEndsAt": _isoformat(event.previous_trial_ends_at),
        "newTrialEndsAt": _isoformat(event.new_trial_ends_at),
        "note": event.note,
        "createdAt": _isoformat(event.created_at),
    }


def _isoformat(value):
    if value is None:
        return None
    return value.isoformat().replace("+00:00", "Z")
