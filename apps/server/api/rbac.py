from enum import StrEnum

from .models import MembershipRole, PlatformRole


class Permission(StrEnum):
    HOTEL_VIEW = "hotel:view"
    HOTEL_MANAGE = "hotel:manage"
    MEMBERS_VIEW = "members:view"
    MEMBERS_MANAGE = "members:manage"
    STAYS_VIEW = "stays:view"
    STAYS_UPDATE = "stays:update"
    ROOMS_VIEW = "rooms:view"
    ROOMS_MANAGE = "rooms:manage"
    ROOMS_ASSIGN = "rooms:assign"
    REPORTS_VIEW = "reports:view"
    PLATFORM_ADMIN = "platform:admin"


ROLE_PERMISSIONS: dict[str, frozenset[Permission]] = {
    MembershipRole.OWNER: frozenset(
        {
            Permission.HOTEL_VIEW,
            Permission.HOTEL_MANAGE,
            Permission.MEMBERS_VIEW,
            Permission.MEMBERS_MANAGE,
            Permission.STAYS_VIEW,
            Permission.STAYS_UPDATE,
            Permission.ROOMS_VIEW,
            Permission.ROOMS_MANAGE,
            Permission.ROOMS_ASSIGN,
            Permission.REPORTS_VIEW,
        }
    ),
    MembershipRole.MANAGER: frozenset(
        {
            Permission.HOTEL_VIEW,
            Permission.MEMBERS_VIEW,
            Permission.STAYS_VIEW,
            Permission.STAYS_UPDATE,
            Permission.ROOMS_VIEW,
            Permission.ROOMS_MANAGE,
            Permission.ROOMS_ASSIGN,
            Permission.REPORTS_VIEW,
        }
    ),
    MembershipRole.RECEPTION: frozenset(
        {
            Permission.HOTEL_VIEW,
            Permission.STAYS_VIEW,
            Permission.STAYS_UPDATE,
            Permission.ROOMS_VIEW,
            Permission.ROOMS_ASSIGN,
        }
    ),
}


PLATFORM_ROLE_PERMISSIONS: dict[str, frozenset[Permission]] = {
    PlatformRole.SUPER_ADMIN: frozenset({Permission.PLATFORM_ADMIN}),
}


def permissions_for_membership_role(role: str) -> frozenset[Permission]:
    return ROLE_PERMISSIONS.get(role, frozenset())


def permissions_for_platform_role(role: str | None) -> frozenset[Permission]:
    if role is None:
        return frozenset()
    return PLATFORM_ROLE_PERMISSIONS.get(role, frozenset())
