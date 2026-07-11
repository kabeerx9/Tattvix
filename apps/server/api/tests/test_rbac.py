from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from api.models import (
    ClerkUser,
    Membership,
    MembershipPropertyAccess,
    MembershipRole,
    Organization,
    PlatformRole,
    Property,
)
from api.rbac import (
    Permission,
    permissions_for_membership_role,
    permissions_for_platform_role,
)


class RolePermissionTests(TestCase):
    def test_owner_has_member_management_permission(self):
        permissions = permissions_for_membership_role(MembershipRole.OWNER)

        self.assertIn(Permission.MEMBERS_MANAGE, permissions)

    def test_reception_cannot_manage_members_or_rooms(self):
        permissions = permissions_for_membership_role(MembershipRole.RECEPTION)

        self.assertNotIn(Permission.MEMBERS_MANAGE, permissions)
        self.assertNotIn(Permission.ROOMS_MANAGE, permissions)
        self.assertIn(Permission.ROOMS_ASSIGN, permissions)

    def test_super_admin_has_platform_permission(self):
        permissions = permissions_for_platform_role(PlatformRole.SUPER_ADMIN)

        self.assertEqual(permissions, frozenset({Permission.PLATFORM_ADMIN}))

    def test_unknown_role_has_no_permissions(self):
        self.assertEqual(permissions_for_membership_role("UNKNOWN"), frozenset())


class TenantModelTests(TestCase):
    def setUp(self):
        self.user = ClerkUser.objects.create(clerk_id="user_1")
        self.organization = Organization.objects.create(
            name="Tattvix Hotel Group",
            slug="tattvix-hotels",
        )
        self.property = Property.objects.create(
            organization=self.organization,
            name="Tattvix Jaipur",
            slug="jaipur",
        )
        self.membership = Membership.objects.create(
            user=self.user,
            organization=self.organization,
            role=MembershipRole.RECEPTION,
        )

    def test_user_can_have_only_one_membership_per_organization(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Membership.objects.create(
                user=self.user,
                organization=self.organization,
                role=MembershipRole.MANAGER,
            )

    def test_property_slug_is_unique_within_organization(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Property.objects.create(
                organization=self.organization,
                name="Duplicate Jaipur",
                slug="jaipur",
            )

    def test_property_access_rejects_a_property_from_another_organization(self):
        other_organization = Organization.objects.create(
            name="Other Hotels",
            slug="other-hotels",
        )
        other_property = Property.objects.create(
            organization=other_organization,
            name="Other Hotel",
            slug="other",
        )
        access = MembershipPropertyAccess(
            membership=self.membership,
            property=other_property,
        )

        with self.assertRaises(ValidationError):
            access.full_clean()

    def test_property_access_is_unique(self):
        MembershipPropertyAccess.objects.create(
            membership=self.membership,
            property=self.property,
        )

        with self.assertRaises(IntegrityError), transaction.atomic():
            MembershipPropertyAccess.objects.create(
                membership=self.membership,
                property=self.property,
            )
