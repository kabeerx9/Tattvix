from types import SimpleNamespace
from datetime import timedelta
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

from api.models import ClerkUser, Membership, MembershipPropertyAccess, MembershipRole, Organization, Property


class TeamApiTests(APITestCase):
    def setUp(self):
        self.owner = ClerkUser.objects.create(clerk_id="owner-team", email="owner@example.com", first_name="Owner")
        self.manager = ClerkUser.objects.create(clerk_id="manager-team", email="manager@example.com")
        self.guest = ClerkUser.objects.create(clerk_id="guest-team", email="guest@example.com")
        self.org = Organization.objects.create(name="Hotel", slug="hotel")
        self.property = Property.objects.create(organization=self.org, name="Main", slug="main")
        self.owner_membership = Membership.objects.create(user=self.owner, organization=self.org, role=MembershipRole.OWNER, has_all_properties=True)
        self.auth(self.owner)

    def auth(self, user):
        self.client.force_authenticate(user=SimpleNamespace(is_authenticated=True, db_user=user))

    def url(self):
        return reverse("hotel-team", kwargs={"organization_slug": self.org.slug})

    def test_owner_lists_searches_and_adds_scoped_staff(self):
        listed = self.client.get(self.url())
        self.assertEqual(listed.status_code, 200, listed.data)
        self.assertEqual(listed.data["properties"][0]["id"], self.property.id)
        searched = self.client.get(reverse("hotel-team-users", kwargs={"organization_slug": self.org.slug}), {"email": "man"})
        self.assertEqual(searched.status_code, 200, searched.data)
        self.assertEqual(searched["Cache-Control"], "no-store")
        self.assertEqual(searched.data["users"][0]["id"], self.manager.id)
        created = self.client.post(self.url(), {"userId": self.manager.id, "role": "MANAGER", "propertyIds": [self.property.id]}, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        membership = Membership.objects.get(user=self.manager, organization=self.org)
        self.assertFalse(membership.has_all_properties)
        self.assertTrue(MembershipPropertyAccess.objects.filter(membership=membership, property=self.property).exists())

    def test_staff_cannot_manage_and_owner_demotion_requires_scope(self):
        Membership.objects.create(user=self.manager, organization=self.org, role=MembershipRole.MANAGER, has_all_properties=True)
        self.auth(self.manager)
        self.assertEqual(self.client.get(self.url()).status_code, 404)
        self.auth(self.owner)
        response = self.client.patch(reverse("hotel-team-member", kwargs={"organization_slug": self.org.slug, "membership_id": self.owner_membership.id}), {"role": "MANAGER"}, format="json")
        self.assertEqual(response.status_code, 400, response.data)
        self.assertEqual(response.data["code"], "property_scope_required")

    def test_last_owner_and_foreign_property_are_rejected(self):
        response = self.client.patch(reverse("hotel-team-member", kwargs={"organization_slug": self.org.slug, "membership_id": self.owner_membership.id}), {"isActive": False}, format="json")
        self.assertEqual(response.status_code, 409, response.data)
        other = Organization.objects.create(name="Other", slug="other")
        foreign = Property.objects.create(organization=other, name="Foreign", slug="foreign")
        response = self.client.post(self.url(), {"userId": self.manager.id, "role": "RECEPTION", "propertyIds": [foreign.id]}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_restricted_owner_cannot_promote_someone_to_all_properties(self):
        MembershipPropertyAccess.objects.create(
            membership=self.owner_membership, property=self.property
        )
        self.owner_membership.has_all_properties = False
        self.owner_membership.save(update_fields=["has_all_properties"])
        response = self.client.post(
            self.url(),
            {"userId": self.manager.id, "role": "OWNER", "propertyIds": []},
            format="json",
        )
        self.assertEqual(response.status_code, 404, response.data)

    def test_expired_subscription_allows_read_but_blocks_writes_without_partial_membership(self):
        subscription = self.org.subscription
        subscription.trial_ends_at = timezone.now() - timedelta(seconds=1)
        subscription.save(update_fields=["trial_ends_at"])
        self.assertEqual(self.client.get(self.url()).status_code, 200)
        response = self.client.post(
            self.url(),
            {"userId": self.manager.id, "role": "RECEPTION", "propertyIds": [self.property.id]},
            format="json",
        )
        self.assertEqual(response.status_code, 402, response.data)
        self.assertFalse(Membership.objects.filter(user=self.manager, organization=self.org).exists())

    def test_user_search_throttles_per_authenticated_database_user(self):
        url = reverse("hotel-team-users", kwargs={"organization_slug": self.org.slug})
        with patch.dict(ScopedRateThrottle.THROTTLE_RATES, {"team-user-search": "2/min"}):
            self.assertEqual(self.client.get(url, {"email": "man"}).status_code, 200)
            self.assertEqual(self.client.get(url, {"email": "man"}).status_code, 200)
            self.assertEqual(self.client.get(url, {"email": "man"}).status_code, 429)

    def test_inactive_actor_or_organization_cannot_mutate(self):
        self.owner_membership.is_active = False
        self.owner_membership.save(update_fields=["is_active"])
        response = self.client.post(
            self.url(), {"userId": self.manager.id, "role": "RECEPTION", "propertyIds": [self.property.id]}, format="json"
        )
        self.assertEqual(response.status_code, 404)
        self.owner_membership.is_active = True
        self.owner_membership.save(update_fields=["is_active"])
        self.org.is_active = False
        self.org.save(update_fields=["is_active"])
        self.assertEqual(self.client.get(self.url()).status_code, 404)

    def test_is_active_only_update_preserves_legacy_restricted_owner_scope(self):
        MembershipPropertyAccess.objects.create(membership=self.owner_membership, property=self.property)
        self.owner_membership.has_all_properties = False
        self.owner_membership.is_active = False
        self.owner_membership.save(update_fields=["has_all_properties", "is_active"])
        # A second full owner performs the status-only reactivation.
        other = ClerkUser.objects.create(clerk_id="other-owner", email="other@example.com")
        Membership.objects.create(user=other, organization=self.org, role=MembershipRole.OWNER, has_all_properties=True)
        self.auth(other)
        response = self.client.patch(reverse("hotel-team-member", kwargs={"organization_slug": self.org.slug, "membership_id": self.owner_membership.id}), {"isActive": True}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.owner_membership.refresh_from_db()
        self.assertFalse(self.owner_membership.has_all_properties)

    def test_restricted_owner_cannot_reactivate_broader_legacy_staff_scope(self):
        restricted = ClerkUser.objects.create(clerk_id="restricted-owner", email="restricted@example.com")
        restricted_membership = Membership.objects.create(user=restricted, organization=self.org, role=MembershipRole.OWNER, has_all_properties=False)
        MembershipPropertyAccess.objects.create(membership=restricted_membership, property=self.property)
        extra = Property.objects.create(organization=self.org, name="Extra", slug="extra")
        target = Membership.objects.create(user=self.manager, organization=self.org, role=MembershipRole.MANAGER, is_active=False, has_all_properties=False)
        MembershipPropertyAccess.objects.create(membership=target, property=extra)
        self.auth(restricted)
        response = self.client.patch(reverse("hotel-team-member", kwargs={"organization_slug": self.org.slug, "membership_id": target.id}), {"isActive": True}, format="json")
        self.assertEqual(response.status_code, 404, response.data)
        target.refresh_from_db()
        self.assertFalse(target.is_active)

    def test_restricted_owner_only_receives_manageable_property_options(self):
        extra = Property.objects.create(organization=self.org, name="Extra", slug="extra")
        MembershipPropertyAccess.objects.create(membership=self.owner_membership, property=self.property)
        self.owner_membership.has_all_properties = False
        self.owner_membership.save(update_fields=["has_all_properties"])
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual([item["id"] for item in response.data["properties"]], [self.property.id])
        self.assertNotEqual(extra.id, self.property.id)
