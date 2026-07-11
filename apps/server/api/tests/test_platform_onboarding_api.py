from types import SimpleNamespace

from django.urls import reverse
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser,
    Membership,
    MembershipRole,
    Organization,
    PlatformRole,
    PlatformRoleAssignment,
    Property,
)


class PlatformOrganizationOnboardingApiTests(APITestCase):
    def setUp(self):
        self.admin = ClerkUser.objects.create(
            clerk_id="admin_1",
            email="admin@example.com",
        )
        PlatformRoleAssignment.objects.create(
            user=self.admin,
            role=PlatformRole.SUPER_ADMIN,
        )
        self.owner = ClerkUser.objects.create(
            clerk_id="owner_1",
            email="owner@example.com",
            first_name="Hotel",
            last_name="Owner",
        )
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=self.admin)
        )
        self.payload = {
            "organization": {
                "name": "Tattvix Hotels",
                "slug": "tattvix-hotels",
            },
            "property": {
                "name": "Tattvix Jaipur",
                "slug": "jaipur",
            },
            "ownerEmail": self.owner.email,
        }

    def test_super_admin_atomically_onboards_hotel_and_owner(self):
        response = self.client.post(
            reverse("platform-organization-list"),
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        organization = Organization.objects.get(slug="tattvix-hotels")
        property_ = Property.objects.get(organization=organization)
        membership = Membership.objects.get(
            organization=organization,
            user=self.owner,
        )
        self.assertEqual(property_.slug, "jaipur")
        self.assertEqual(membership.role, MembershipRole.OWNER)
        self.assertTrue(membership.has_all_properties)
        self.assertEqual(response.data["membership"]["role"], MembershipRole.OWNER)

    def test_regular_user_cannot_onboard_an_organization(self):
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=self.owner)
        )

        response = self.client.post(
            reverse("platform-organization-list"),
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Organization.objects.exists())

    def test_missing_owner_rolls_back_the_entire_onboarding(self):
        self.payload["ownerEmail"] = "missing@example.com"

        response = self.client.post(
            reverse("platform-organization-list"),
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "owner_not_found")
        self.assertFalse(Organization.objects.exists())
        self.assertFalse(Property.objects.exists())
        self.assertFalse(Membership.objects.exists())

    def test_duplicate_organization_slug_is_rejected_without_partial_data(self):
        Organization.objects.create(name="Existing", slug="tattvix-hotels")

        response = self.client.post(
            reverse("platform-organization-list"),
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "organization_slug_exists")
        self.assertEqual(Organization.objects.count(), 1)
        self.assertFalse(Property.objects.exists())
        self.assertFalse(Membership.objects.exists())

    def test_invalid_slug_is_rejected_without_partial_data(self):
        self.payload["organization"]["slug"] = "Not Valid"

        response = self.client.post(
            reverse("platform-organization-list"),
            self.payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Organization.objects.exists())
        self.assertFalse(Property.objects.exists())
        self.assertFalse(Membership.objects.exists())

    def test_unauthenticated_user_is_rejected(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            reverse("platform-organization-list"),
            self.payload,
            format="json",
        )

        self.assertIn(response.status_code, {401, 403})


class PlatformUserSearchApiTests(APITestCase):
    def setUp(self):
        self.admin = ClerkUser.objects.create(clerk_id="search_admin", email="admin@example.com")
        PlatformRoleAssignment.objects.create(user=self.admin, role=PlatformRole.SUPER_ADMIN)
        self.user = ClerkUser.objects.create(
            clerk_id="search_owner",
            email="owner@example.com",
            first_name="Hotel",
            last_name="Owner",
            image_url="https://example.com/owner.png",
            private_metadata={"secret": True},
        )
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=self.admin)
        )

    def test_super_admin_can_search_existing_users_by_partial_email(self):
        response = self.client.get(reverse("platform-user-list"), {"email": "OWNER@"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["users"], [{
            "id": self.user.id,
            "email": "owner@example.com",
            "firstName": "Hotel",
            "lastName": "Owner",
            "imageUrl": "https://example.com/owner.png",
        }])
        self.assertNotIn("clerkId", response.data["users"][0])
        self.assertNotIn("privateMetadata", response.data["users"][0])

    def test_search_requires_at_least_three_characters(self):
        response = self.client.get(reverse("platform-user-list"), {"email": "ow"})
        self.assertEqual(response.status_code, 400)

    def test_regular_user_cannot_search_users(self):
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=self.user)
        )
        response = self.client.get(reverse("platform-user-list"), {"email": "owner"})
        self.assertEqual(response.status_code, 403)

    def test_search_results_are_limited_to_ten(self):
        ClerkUser.objects.bulk_create([
            ClerkUser(clerk_id=f"limited_{index}", email=f"limited{index}@example.com")
            for index in range(12)
        ])
        response = self.client.get(reverse("platform-user-list"), {"email": "limited"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["users"]), 10)
