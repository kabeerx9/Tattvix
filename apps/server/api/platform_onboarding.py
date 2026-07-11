from dataclasses import dataclass

from django.db import IntegrityError, transaction

from .models import Membership, MembershipRole, Organization, Property
from .user_lookup import (
    AmbiguousExistingUser,
    ExistingUserNotFound,
    get_unique_existing_user_by_email,
)


@dataclass(frozen=True)
class PlatformOnboardingError(Exception):
    code: str
    message: str


def onboard_organization(*, organization, property, owner_email):
    try:
        owner = get_unique_existing_user_by_email(owner_email)
    except ExistingUserNotFound as exc:
        raise PlatformOnboardingError(
            code="owner_not_found",
            message=(
                "No Tattvix account exists for the owner email. The owner must sign in "
                "once before onboarding."
            ),
        ) from exc
    except AmbiguousExistingUser as exc:
        raise PlatformOnboardingError(
            code="ambiguous_owner",
            message="Multiple Tattvix accounts use the owner email.",
        ) from exc

    if Organization.objects.filter(slug=organization["slug"]).exists():
        raise PlatformOnboardingError(
            code="organization_slug_exists",
            message="An organization with this slug already exists.",
        )

    try:
        with transaction.atomic():
            created_organization = Organization.objects.create(**organization)
            created_property = Property.objects.create(
                organization=created_organization,
                **property,
            )
            membership = Membership.objects.create(
                user=owner,
                organization=created_organization,
                role=MembershipRole.OWNER,
                has_all_properties=True,
            )
    except IntegrityError as exc:
        raise PlatformOnboardingError(
            code="onboarding_conflict",
            message="The organization could not be created because its data conflicts.",
        ) from exc

    return {
        "organization": {
            "id": created_organization.id,
            "name": created_organization.name,
            "slug": created_organization.slug,
        },
        "property": {
            "id": created_property.id,
            "name": created_property.name,
            "slug": created_property.slug,
        },
        "owner": {
            "id": owner.id,
            "email": owner.email,
            "firstName": owner.first_name,
            "lastName": owner.last_name,
        },
        "membership": {
            "id": membership.id,
            "role": membership.role,
            "hasAllProperties": membership.has_all_properties,
        },
    }
