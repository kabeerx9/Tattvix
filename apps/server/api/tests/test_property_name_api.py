from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from api.models import ClerkUser, Membership, MembershipRole, Organization
from api.tests import test_hotel_operations_api as fixtures


class PropertyNameApiTests(APITestCase):
    authenticate = fixtures.HotelOperationsApiTests.authenticate

    def setUp(self):
        fixtures.HotelOperationsApiTests.setUp(self)
        self.base = f"/api/hotel/{self.organization.slug}/{self.property.slug}"
        self.url = f"{self.base}/name/"
        self.authenticate(self.owner)

    def test_rename_preserves_urls_qr_and_legacy_details_response(self):
        legacy = self.client.get(f"{self.base}/details/").data
        token_id = self.qr_token.id
        response = self.client.patch(self.url, {"name": "  The Jaipur House  "}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"name": "The Jaipur House"})
        self.property.refresh_from_db()
        self.assertEqual(self.property.name, "The Jaipur House")
        self.assertEqual(self.property.slug, "jaipur")
        self.qr_token.refresh_from_db()
        self.assertEqual(self.qr_token.id, token_id)
        self.assertIsNone(self.qr_token.revoked_at)
        self.assertEqual(self.client.get(self.url).data, response.data)
        self.assertEqual(self.client.get(f"{self.base}/details/").data, legacy)
        self.assertEqual(self.client.patch(f"{self.base}/details/", {"address": "New address"}, format="json").status_code, 200)
        self.assertNotIn("name", self.client.get(f"{self.base}/details/").data)
        me = self.client.get("/api/me/").data
        self.assertEqual(me["memberships"][0]["properties"][0]["name"], "The Jaipur House")

    def test_invalid_names_never_change_the_property(self):
        original = self.property.name
        for payload in ({}, {"name": ""}, {"name": "   "}, {"name": "a" * 256}, {"name": None}, {"name": "Valid", "slug": "changed"}):
            with self.subTest(payload=payload):
                self.assertEqual(self.client.patch(self.url, payload, format="json").status_code, 400)
                self.property.refresh_from_db()
                self.assertEqual(self.property.name, original)
        self.assertEqual(self.client.patch(self.url, {"name": "a" * 255}, format="json").status_code, 200)

    def test_only_an_owner_with_access_can_rename(self):
        manager = ClerkUser.objects.create(clerk_id="rename_manager", email="manager@example.com")
        Membership.objects.create(user=manager, organization=self.organization, role=MembershipRole.MANAGER, has_all_properties=True)
        other_org = Organization.objects.create(name="Other", slug="other")
        outsider = ClerkUser.objects.create(clerk_id="rename_outsider", email="outside@example.com")
        Membership.objects.create(user=outsider, organization=other_org, role=MembershipRole.OWNER, has_all_properties=True)
        for user in (manager, self.reception, self.guest, outsider):
            self.authenticate(user)
            self.assertEqual(self.client.patch(self.url, {"name": "Denied"}, format="json").status_code, 404)
        self.authenticate(manager)
        self.assertEqual(self.client.get(self.url).status_code, 200)
        membership = Membership.objects.get(user=self.owner)
        membership.has_all_properties = False
        membership.save()
        self.authenticate(self.owner)
        self.assertEqual(self.client.patch(self.url, {"name": "Denied"}, format="json").status_code, 404)
        self.property.refresh_from_db()
        self.assertEqual(self.property.name, "Tattvix Jaipur")

    def test_expired_subscription_allows_reads_but_blocks_rename(self):
        subscription = self.organization.subscription
        subscription.trial_ends_at = timezone.now() - timedelta(days=1)
        subscription.save()
        self.assertEqual(self.client.get(self.url).status_code, 200)
        self.assertEqual(self.client.patch(self.url, {"name": "Denied"}, format="json").status_code, 402)
        self.property.refresh_from_db()
        self.assertEqual(self.property.name, "Tattvix Jaipur")

    def test_signed_out_and_inactive_members_cannot_rename(self):
        self.client.force_authenticate(user=None)
        self.assertIn(
            self.client.patch(self.url, {"name": "Denied"}, format="json").status_code,
            (401, 403),
        )
        membership = Membership.objects.get(user=self.owner)
        membership.is_active = False
        membership.save()
        self.authenticate(self.owner)
        self.assertEqual(
            self.client.patch(self.url, {"name": "Denied"}, format="json").status_code,
            404,
        )
        self.property.refresh_from_db()
        self.assertEqual(self.property.name, "Tattvix Jaipur")
