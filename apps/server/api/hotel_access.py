from django.http import Http404
from django.shortcuts import get_object_or_404

from .models import Membership, MembershipPropertyAccess, Property
from .rbac import Permission, permissions_for_membership_role


def get_accessible_property(
    *,
    user,
    organization_slug: str,
    property_slug: str,
    permission: Permission,
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
