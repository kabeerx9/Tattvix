from django.db.models import Prefetch

from .models import (
    ClerkUser,
    Membership,
    MembershipPropertyAccess,
    PlatformRoleAssignment,
    Property,
)
from .rbac import (
    permissions_for_membership_role,
    permissions_for_platform_role,
)


def build_current_user_payload(user: ClerkUser) -> dict:
    platform_role = (
        PlatformRoleAssignment.objects.filter(user=user)
        .values_list("role", flat=True)
        .first()
    )

    active_organization_properties = Property.objects.filter(
        is_active=True,
    ).order_by("name", "id")
    active_property_accesses = MembershipPropertyAccess.objects.filter(
        property__is_active=True,
    ).select_related("property").order_by("property__name", "property_id")

    memberships = (
        Membership.objects.filter(
            user=user,
            is_active=True,
            organization__is_active=True,
        )
        .select_related("organization")
        .prefetch_related(
            Prefetch(
                "organization__properties",
                queryset=active_organization_properties,
                to_attr="active_properties",
            ),
            Prefetch(
                "property_accesses",
                queryset=active_property_accesses,
                to_attr="active_property_accesses",
            ),
        )
        .order_by("organization__name", "id")
    )

    return {
        "id": user.id,
        "clerkId": user.clerk_id,
        "email": user.email,
        "firstName": user.first_name,
        "lastName": user.last_name,
        "username": user.username,
        "imageUrl": user.image_url,
        "createdAt": _isoformat(user.created_at),
        "updatedAt": _isoformat(user.updated_at),
        "lastSyncedAt": _isoformat(user.last_synced_at),
        "platformRole": platform_role,
        "platformPermissions": _permission_values(
            permissions_for_platform_role(platform_role)
        ),
        "memberships": [
            _membership_payload(membership) for membership in memberships
        ],
    }


def _membership_payload(membership: Membership) -> dict:
    if membership.has_all_properties:
        properties = membership.organization.active_properties
    else:
        properties = [
            access.property for access in membership.active_property_accesses
        ]

    return {
        "id": membership.id,
        "role": membership.role,
        "hasAllProperties": membership.has_all_properties,
        "permissions": _permission_values(
            permissions_for_membership_role(membership.role)
        ),
        "organization": {
            "id": membership.organization.id,
            "name": membership.organization.name,
            "slug": membership.organization.slug,
        },
        "properties": [
            {
                "id": property_.id,
                "name": property_.name,
                "slug": property_.slug,
            }
            for property_ in properties
        ],
    }


def _permission_values(permissions) -> list[str]:
    return sorted(permission.value for permission in permissions)


def _isoformat(value):
    if value is None:
        return None
    return value.isoformat().replace("+00:00", "Z")
