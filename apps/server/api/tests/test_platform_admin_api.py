from types import SimpleNamespace

from django.urls import reverse
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser,
    Membership,
    MembershipRole,
    Organization,
    PlatformAuditAction,
    PlatformAuditLog,
    PlatformRole,
    PlatformRoleAssignment,
    Property,
)


class PlatformAdminApiTestCase(APITestCase):
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
        self.staff = ClerkUser.objects.create(
            clerk_id="staff_1",
            email="staff@example.com",
            first_name="Front",
            last_name="Desk",
        )
        self.organization = Organization.objects.create(
            name="Tattvix Hotels",
            slug="tattvix-hotels",
        )
        self.property = Property.objects.create(
            organization=self.organization,
            name="Tattvix Jaipur",
            slug="jaipur",
        )
        self.owner_membership = Membership.objects.create(
            user=self.owner,
            organization=self.organization,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )
        self.authenticate(self.admin)

    def authenticate(self, user: ClerkUser):
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=user)
        )

    def detail_url(self):
        return reverse(
            "platform-organization-detail",
            kwargs={"organization_slug": self.organization.slug},
        )

    def members_url(self):
        return reverse(
            "platform-organization-members",
            kwargs={"organization_slug": self.organization.slug},
        )

    def member_url(self, membership_id: int):
        return reverse(
            "platform-organization-member-detail",
            kwargs={
                "organization_slug": self.organization.slug,
                "membership_id": membership_id,
            },
        )


class PlatformOrganizationReadTests(PlatformAdminApiTestCase):
    def test_super_admin_lists_organizations_with_counts(self):
        response = self.client.get(reverse("platform-organization-list"))

        self.assertEqual(response.status_code, 200)
        [organization] = response.data["organizations"]
        self.assertEqual(organization["slug"], "tattvix-hotels")
        self.assertEqual(organization["propertyCount"], 1)
        self.assertEqual(organization["memberCount"], 1)

    def test_super_admin_reads_organization_detail(self):
        response = self.client.get(self.detail_url())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["organization"]["slug"], "tattvix-hotels"
        )
        [property_] = response.data["properties"]
        self.assertEqual(property_["slug"], "jaipur")
        [member] = response.data["members"]
        self.assertEqual(member["role"], MembershipRole.OWNER)
        self.assertEqual(member["user"]["email"], self.owner.email)

    def test_hotel_owner_cannot_reach_any_platform_endpoint(self):
        self.authenticate(self.owner)
        for method, url, payload in [
            ("get", reverse("platform-organization-list"), None),
            ("get", self.detail_url(), None),
            (
                "post",
                reverse(
                    "platform-organization-properties",
                    kwargs={"organization_slug": self.organization.slug},
                ),
                {"name": "X", "slug": "x"},
            ),
            (
                "post",
                self.members_url(),
                {"email": self.staff.email, "role": "RECEPTION"},
            ),
            (
                "patch",
                self.member_url(self.owner_membership.id),
                {"role": "MANAGER"},
            ),
        ]:
            response = getattr(self.client, method)(url, payload, format="json")
            self.assertEqual(response.status_code, 403, url)


class PlatformPropertyCreateTests(PlatformAdminApiTestCase):
    def test_super_admin_creates_property_and_audit_row(self):
        response = self.client.post(
            reverse(
                "platform-organization-properties",
                kwargs={"organization_slug": self.organization.slug},
            ),
            {"name": "Tattvix Udaipur", "slug": "udaipur"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            Property.objects.filter(
                organization=self.organization, slug="udaipur"
            ).exists()
        )
        audit = PlatformAuditLog.objects.get(
            action=PlatformAuditAction.PROPERTY_CREATED
        )
        self.assertEqual(audit.actor, self.admin)
        self.assertEqual(audit.target, "udaipur")

    def test_duplicate_property_slug_is_rejected(self):
        response = self.client.post(
            reverse(
                "platform-organization-properties",
                kwargs={"organization_slug": self.organization.slug},
            ),
            {"name": "Duplicate", "slug": "jaipur"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "property_slug_exists")


class PlatformMemberTests(PlatformAdminApiTestCase):
    def test_member_add_role_change_and_deactivation_lifecycle(self):
        added = self.client.post(
            self.members_url(),
            {"email": self.staff.email, "role": "RECEPTION"},
            format="json",
        )
        self.assertEqual(added.status_code, 201)
        membership_id = added.data["id"]

        changed = self.client.patch(
            self.member_url(membership_id),
            {"role": "MANAGER"},
            format="json",
        )
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(changed.data["role"], MembershipRole.MANAGER)

        deactivated = self.client.patch(
            self.member_url(membership_id),
            {"isActive": False},
            format="json",
        )
        self.assertEqual(deactivated.status_code, 200)
        self.assertFalse(deactivated.data["isActive"])

        actions = list(
            PlatformAuditLog.objects.order_by("id").values_list(
                "action", flat=True
            )
        )
        self.assertEqual(
            actions,
            [
                PlatformAuditAction.MEMBER_ADDED,
                PlatformAuditAction.MEMBER_ROLE_CHANGED,
                PlatformAuditAction.MEMBER_DEACTIVATED,
            ],
        )

    def test_adding_an_unknown_email_fails_cleanly(self):
        response = self.client.post(
            self.members_url(),
            {"email": "ghost@example.com", "role": "RECEPTION"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "member_not_found")

    def test_duplicate_membership_is_rejected(self):
        response = self.client.post(
            self.members_url(),
            {"email": self.owner.email, "role": "MANAGER"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "member_exists")

    def test_last_active_owner_cannot_be_demoted_or_deactivated(self):
        for payload in [{"role": "MANAGER"}, {"isActive": False}]:
            response = self.client.patch(
                self.member_url(self.owner_membership.id),
                payload,
                format="json",
            )
            self.assertEqual(response.status_code, 400, payload)
            self.assertEqual(response.data["code"], "last_owner")

        self.owner_membership.refresh_from_db()
        self.assertEqual(self.owner_membership.role, MembershipRole.OWNER)
        self.assertTrue(self.owner_membership.is_active)

    def test_owner_can_be_demoted_once_another_active_owner_exists(self):
        Membership.objects.create(
            user=self.staff,
            organization=self.organization,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )

        response = self.client.patch(
            self.member_url(self.owner_membership.id),
            {"role": "MANAGER"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["role"], MembershipRole.MANAGER)

    def test_role_change_takes_effect_on_hotel_permissions_immediately(self):
        added = self.client.post(
            self.members_url(),
            {"email": self.staff.email, "role": "RECEPTION"},
            format="json",
        )
        membership_id = added.data["id"]
        rooms_url = reverse(
            "hotel-room-list",
            kwargs={
                "organization_slug": self.organization.slug,
                "property_slug": self.property.slug,
            },
        )
        room_payload = {"number": "101", "floor": "1", "roomType": "Deluxe"}

        self.authenticate(self.staff)
        # Hotel access hides resources from under-permissioned users (404, not 403).
        denied = self.client.post(rooms_url, room_payload, format="json")
        self.assertEqual(denied.status_code, 404)

        self.authenticate(self.admin)
        self.client.patch(
            self.member_url(membership_id),
            {"role": "MANAGER"},
            format="json",
        )

        self.authenticate(self.staff)
        allowed = self.client.post(rooms_url, room_payload, format="json")
        self.assertEqual(allowed.status_code, 201)
