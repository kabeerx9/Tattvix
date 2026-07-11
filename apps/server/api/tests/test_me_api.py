from types import SimpleNamespace

from django.urls import reverse
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser,
    Membership,
    MembershipPropertyAccess,
    MembershipRole,
    Organization,
    PlatformRole,
    PlatformRoleAssignment,
    Property,
)
from api.rbac import Permission


class CurrentUserApiTests(APITestCase):
    def setUp(self):
        self.user = ClerkUser.objects.create(
            clerk_id="user_123",
            email="guest@example.com",
        )
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=self.user)
        )

    def test_guest_only_user_has_no_privileged_access(self):
        response = self.client.get(reverse("me"))

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["platformRole"])
        self.assertEqual(response.data["platformPermissions"], [])
        self.assertEqual(response.data["memberships"], [])

    def test_super_admin_receives_platform_permission(self):
        PlatformRoleAssignment.objects.create(
            user=self.user,
            role=PlatformRole.SUPER_ADMIN,
        )

        response = self.client.get(reverse("me"))

        self.assertEqual(response.data["platformRole"], PlatformRole.SUPER_ADMIN)
        self.assertEqual(
            response.data["platformPermissions"],
            [Permission.PLATFORM_ADMIN.value],
        )

    def test_reception_membership_returns_only_assigned_active_properties(self):
        organization = Organization.objects.create(
            name="Example Hotels",
            slug="example-hotels",
        )
        assigned_property = Property.objects.create(
            organization=organization,
            name="Jaipur Hotel",
            slug="jaipur",
        )
        Property.objects.create(
            organization=organization,
            name="Delhi Hotel",
            slug="delhi",
        )
        inactive_property = Property.objects.create(
            organization=organization,
            name="Closed Hotel",
            slug="closed",
            is_active=False,
        )
        membership = Membership.objects.create(
            user=self.user,
            organization=organization,
            role=MembershipRole.RECEPTION,
        )
        MembershipPropertyAccess.objects.create(
            membership=membership,
            property=assigned_property,
        )
        MembershipPropertyAccess.objects.create(
            membership=membership,
            property=inactive_property,
        )

        response = self.client.get(reverse("me"))

        returned_membership = response.data["memberships"][0]
        self.assertEqual(returned_membership["role"], MembershipRole.RECEPTION)
        self.assertEqual(
            returned_membership["properties"],
            [{"id": assigned_property.id, "name": "Jaipur Hotel", "slug": "jaipur"}],
        )
        self.assertIn(
            Permission.ROOMS_ASSIGN.value,
            returned_membership["permissions"],
        )
        self.assertNotIn(
            Permission.ROOMS_MANAGE.value,
            returned_membership["permissions"],
        )

    def test_all_properties_membership_returns_every_active_property(self):
        organization = Organization.objects.create(
            name="Example Hotels",
            slug="example-hotels",
        )
        Property.objects.create(
            organization=organization,
            name="Jaipur Hotel",
            slug="jaipur",
        )
        Property.objects.create(
            organization=organization,
            name="Delhi Hotel",
            slug="delhi",
        )
        Property.objects.create(
            organization=organization,
            name="Closed Hotel",
            slug="closed",
            is_active=False,
        )
        Membership.objects.create(
            user=self.user,
            organization=organization,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )

        response = self.client.get(reverse("me"))

        self.assertEqual(
            [property_["slug"] for property_ in response.data["memberships"][0]["properties"]],
            ["delhi", "jaipur"],
        )

    def test_inactive_memberships_and_organizations_are_not_returned(self):
        active_organization = Organization.objects.create(
            name="Active Hotels",
            slug="active-hotels",
        )
        inactive_organization = Organization.objects.create(
            name="Inactive Hotels",
            slug="inactive-hotels",
            is_active=False,
        )
        Membership.objects.create(
            user=self.user,
            organization=active_organization,
            role=MembershipRole.RECEPTION,
            is_active=False,
        )
        Membership.objects.create(
            user=self.user,
            organization=inactive_organization,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )

        response = self.client.get(reverse("me"))

        self.assertEqual(response.data["memberships"], [])

    def test_unauthenticated_request_is_rejected(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("me"))

        self.assertIn(response.status_code, {401, 403})
