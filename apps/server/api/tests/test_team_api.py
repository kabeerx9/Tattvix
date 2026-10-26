from types import SimpleNamespace

from django.urls import reverse
from rest_framework.test import APITestCase

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
