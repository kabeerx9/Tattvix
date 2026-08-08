from django.db import IntegrityError, transaction
from django.db.models import Count, Q

from .models import (
    ClerkUser,
    Membership,
    MembershipRole,
    Organization,
    PlatformAuditAction,
    PlatformAuditLog,
    Property,
)
from .platform_onboarding import PlatformOnboardingError
from .user_lookup import (
    AmbiguousExistingUser,
    ExistingUserNotFound,
    get_unique_existing_user_by_email,
)


def build_member_payload(membership: Membership) -> dict:
    user = membership.user
    return {
        "id": membership.id,
        "role": membership.role,
        "isActive": membership.is_active,
        "hasAllProperties": membership.has_all_properties,
        "user": {
            "id": user.id,
            "email": user.email,
            "firstName": user.first_name,
            "lastName": user.last_name,
            "imageUrl": user.image_url,
        },
    }


def build_property_payload(property_: Property) -> dict:
    return {
        "id": property_.id,
        "name": property_.name,
        "slug": property_.slug,
        "isActive": property_.is_active,
    }


def list_organizations() -> list[dict]:
    organizations = Organization.objects.annotate(
        property_count=Count(
            "properties",
            filter=Q(properties__is_active=True),
            distinct=True,
        ),
        member_count=Count(
            "memberships",
            filter=Q(memberships__is_active=True),
            distinct=True,
        ),
    ).order_by("name", "id")
    return [
        {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
            "isActive": organization.is_active,
            "propertyCount": organization.property_count,
            "memberCount": organization.member_count,
        }
        for organization in organizations
    ]


def build_organization_detail(organization: Organization) -> dict:
    properties = organization.properties.order_by("name", "id")
    members = (
        organization.memberships.select_related("user")
        .order_by("user__email", "id")
    )
    return {
        "organization": {
            "id": organization.id,
            "name": organization.name,
            "slug": organization.slug,
            "isActive": organization.is_active,
        },
        "properties": [build_property_payload(p) for p in properties],
        "members": [build_member_payload(m) for m in members],
    }


def create_organization_property(
    *,
    organization: Organization,
    name: str,
    slug: str,
    actor: ClerkUser,
) -> Property:
    try:
        with transaction.atomic():
            property_ = Property.objects.create(
                organization=organization,
                name=name,
                slug=slug,
            )
            PlatformAuditLog.objects.create(
                actor=actor,
                organization=organization,
                action=PlatformAuditAction.PROPERTY_CREATED,
                target=slug,
            )
    except IntegrityError as exc:
        raise PlatformOnboardingError(
            code="property_slug_exists",
            message="A property with this slug already exists in the organization.",
        ) from exc
    return property_


def add_organization_member(
    *,
    organization: Organization,
    email: str,
    role: str,
    actor: ClerkUser,
) -> Membership:
    try:
        user = get_unique_existing_user_by_email(email)
    except ExistingUserNotFound as exc:
        raise PlatformOnboardingError(
            code="member_not_found",
            message=(
                "No Tattvix account exists for this email. The member must sign in "
                "once before being added."
            ),
        ) from exc
    except AmbiguousExistingUser as exc:
        raise PlatformOnboardingError(
            code="ambiguous_member",
            message="Multiple Tattvix accounts use this email.",
        ) from exc

    try:
        with transaction.atomic():
            membership = Membership.objects.create(
                user=user,
                organization=organization,
                role=role,
                has_all_properties=True,
            )
            PlatformAuditLog.objects.create(
                actor=actor,
                organization=organization,
                action=PlatformAuditAction.MEMBER_ADDED,
                target=user.email,
            )
    except IntegrityError as exc:
        raise PlatformOnboardingError(
            code="member_exists",
            message="This user already has a membership in the organization.",
        ) from exc
    return membership


def update_organization_member(
    *,
    organization: Organization,
    membership: Membership,
    actor: ClerkUser,
    role: str | None = None,
    is_active: bool | None = None,
) -> Membership:
    with transaction.atomic():
        locked = Membership.objects.select_for_update().get(
            id=membership.id,
            organization=organization,
        )

        removes_owner = locked.role == MembershipRole.OWNER and locked.is_active and (
            (role is not None and role != MembershipRole.OWNER)
            or is_active is False
        )
        if removes_owner:
            other_active_owners = (
                Membership.objects.select_for_update()
                .filter(
                    organization=organization,
                    role=MembershipRole.OWNER,
                    is_active=True,
                )
                .exclude(id=locked.id)
                .exists()
            )
            if not other_active_owners:
                raise PlatformOnboardingError(
                    code="last_owner",
                    message=(
                        "An organization must keep at least one active owner. "
                        "Add another owner first."
                    ),
                )

        update_fields = ["updated_at"]
        if role is not None and role != locked.role:
            PlatformAuditLog.objects.create(
                actor=actor,
                organization=organization,
                action=PlatformAuditAction.MEMBER_ROLE_CHANGED,
                target=f"{locked.user.email}:{locked.role}->{role}",
            )
            locked.role = role
            update_fields.append("role")
        if is_active is not None and is_active != locked.is_active:
            PlatformAuditLog.objects.create(
                actor=actor,
                organization=organization,
                action=(
                    PlatformAuditAction.MEMBER_REACTIVATED
                    if is_active
                    else PlatformAuditAction.MEMBER_DEACTIVATED
                ),
                target=locked.user.email,
            )
            locked.is_active = is_active
            update_fields.append("is_active")

        if len(update_fields) > 1:
            locked.save(update_fields=update_fields)
        return locked
