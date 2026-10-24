from django.http import Http404
from django.shortcuts import get_object_or_404

from .models import Membership, MembershipPropertyAccess, Property, Subscription
from .rbac import Permission, permissions_for_membership_role
from .subscriptions import SubscriptionExpired, is_entitled

# When the subscription has lapsed the hotel keeps read access to its own
# records (stay list, guest register, bills, property details) but cannot
# create new business or see analytics. Checkout is a mutation that must stay
# open so no guest is stranded in a room; the view opts out with
# `allow_expired=True`.
GATED_WHEN_EXPIRED = frozenset(
    {
        Permission.HOTEL_MANAGE,
        Permission.MEMBERS_MANAGE,
        Permission.STAYS_UPDATE,
        Permission.ROOMS_MANAGE,
        Permission.ROOMS_ASSIGN,
        Permission.REPORTS_VIEW,
    }
)


def get_accessible_property(
    *,
    user,
    organization_slug: str,
    property_slug: str,
    permission: Permission,
    allow_expired: bool = False,
) -> Property:
    membership = (
        Membership.objects.filter(
            user=user,
            organization__slug=organization_slug,
            organization__is_active=True,
            is_active=True,
        )
        .select_related("organization")
        .first()
    )
    if (
        membership is None
        or permission not in permissions_for_membership_role(membership.role)
    ):
        raise Http404

    if permission in GATED_WHEN_EXPIRED and not allow_expired:
        subscription = Subscription.objects.filter(
            organization=membership.organization
        ).first()
        if not is_entitled(subscription):
            raise SubscriptionExpired(subscription)

    property_ = get_object_or_404(
        Property.objects.select_related("organization"),
        organization=membership.organization,
        slug=property_slug,
        is_active=True,
    )
    if membership.has_all_properties:
        return property_

    if not MembershipPropertyAccess.objects.filter(
        membership=membership,
        property=property_,
    ).exists():
        raise Http404

    return property_
