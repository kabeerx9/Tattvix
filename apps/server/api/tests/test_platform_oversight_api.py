import json
from datetime import timedelta
from types import SimpleNamespace

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser,
    HotelQrToken,
    IdentityAccessAction,
    IdentityAccessAudit,
    IdentityDocumentImageSide,
    Membership,
    MembershipRole,
    OperationalStayStatus,
    Organization,
    PlatformAuditAction,
    PlatformAuditLog,
    PlatformRole,
    PlatformRoleAssignment,
    Property,
    SharedIdentityDocumentImage,
    SharedIdentitySnapshot,
    Stay,
    StayStatus,
)

SECRET_DOCUMENT_NUMBER = "P9988776Z"
SECRET_OBJECT_KEY = "private/identity-documents/super-secret-front.jpg"


class PlatformOversightApiTestCase(APITestCase):
    def setUp(self):
        self.admin = ClerkUser.objects.create(
            clerk_id="oversight_admin",
            email="admin@example.com",
        )
        PlatformRoleAssignment.objects.create(
            user=self.admin,
            role=PlatformRole.SUPER_ADMIN,
        )

        self.org1 = Organization.objects.create(
            name="Tattvix Hotels",
            slug="tattvix-hotels",
        )
        self.property1 = Property.objects.create(
            organization=self.org1,
            name="Tattvix Jaipur",
            slug="jaipur",
        )
        self.org2 = Organization.objects.create(
            name="Other Hospitality",
            slug="other-hospitality",
        )
        self.property2 = Property.objects.create(
            organization=self.org2,
            name="Other Goa",
            slug="goa",
        )

        self.owner1 = ClerkUser.objects.create(
            clerk_id="owner_1",
            email="owner1@example.com",
        )
        Membership.objects.create(
            user=self.owner1,
            organization=self.org1,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )
        self.reception1 = ClerkUser.objects.create(
            clerk_id="reception_1",
            email="reception1@example.com",
        )
        self.guest = ClerkUser.objects.create(
            clerk_id="guest_1",
            email="guest@example.com",
        )

        self.token1 = HotelQrToken.objects.create(
            property=self.property1,
            token_digest="a" * 64,
            token_hint="jaipurtok",
            created_by=self.owner1,
            expires_at=timezone.now() + timedelta(days=30),
        )
        self.token2 = HotelQrToken.objects.create(
            property=self.property2,
            token_digest="b" * 64,
            token_hint="goatoken",
            created_by=self.owner1,
            expires_at=timezone.now() + timedelta(days=30),
        )

        now = timezone.now()

        # property1: 1 draft (excluded), 2 pending, 1 checked-in, 1 checked-out
        self._make_stay(self.property1, self.token1, StayStatus.DRAFT)
        self.pending_stay_1 = self._make_stay(
            self.property1, self.token1, StayStatus.SUBMITTED
        )
        self._make_stay(self.property1, self.token1, StayStatus.SUBMITTED)
        self.checked_in_stay = self._make_stay(
            self.property1,
            self.token1,
            StayStatus.SUBMITTED,
            operational_status=OperationalStayStatus.CHECKED_IN,
            checked_in_at=now,
        )
        self.checked_out_stay = self._make_stay(
            self.property1,
            self.token1,
            StayStatus.CLOSED,
            operational_status=OperationalStayStatus.CHECKED_OUT,
            checked_in_at=now - timedelta(days=1),
            checked_out_at=now,
        )

        # property2: 1 pending, 2 checked-out
        self._make_stay(self.property2, self.token2, StayStatus.SUBMITTED)
        self._make_stay(
            self.property2,
            self.token2,
            StayStatus.CLOSED,
            operational_status=OperationalStayStatus.CHECKED_OUT,
            checked_in_at=now - timedelta(days=2),
            checked_out_at=now - timedelta(days=1),
        )
        self._make_stay(
            self.property2,
            self.token2,
            StayStatus.CLOSED,
            operational_status=OperationalStayStatus.CHECKED_OUT,
            checked_in_at=now - timedelta(days=2),
            checked_out_at=now - timedelta(days=1),
        )

        # Identity snapshot + document image with secret values, attached to
        # the checked-in stay — this is what the privacy test checks never
        # leaks through the oversight endpoints.
        snapshot = SharedIdentitySnapshot.objects.create(
            stay=self.checked_in_stay,
            guest_data={"legalFirstName": "Kabeer", "legalLastName": "Joshi"},
            companion_data=[],
            document_data={
                "documentType": "PASSPORT",
                "documentNumber": SECRET_DOCUMENT_NUMBER,
            },
        )
        SharedIdentityDocumentImage.objects.create(
            snapshot=snapshot,
            side=IdentityDocumentImageSide.FRONT,
            object_key=SECRET_OBJECT_KEY,
            content_type="image/jpeg",
            content_length=123456,
        )

        # Identity access audit trail (stay-scoped).
        self.identity_audit_view = IdentityAccessAudit.objects.create(
            stay=self.checked_in_stay,
            actor=self.reception1,
            action=IdentityAccessAction.DETAILS_VIEWED,
        )
        self.identity_audit_doc = IdentityAccessAudit.objects.create(
            stay=self.checked_in_stay,
            actor=self.reception1,
            action=IdentityAccessAction.DOCUMENT_VIEWED,
            image_side=IdentityDocumentImageSide.FRONT,
        )

        # Platform admin audit trail (organization-scoped).
        self.platform_audit_property = PlatformAuditLog.objects.create(
            actor=self.admin,
            organization=self.org1,
            action=PlatformAuditAction.PROPERTY_CREATED,
            target=self.property1.slug,
        )
        self.platform_audit_member = PlatformAuditLog.objects.create(
            actor=self.admin,
            organization=self.org2,
            action=PlatformAuditAction.MEMBER_ADDED,
            target=self.owner1.email,
        )

    def _make_stay(
        self,
        property_,
        token,
        status,
        operational_status=OperationalStayStatus.PENDING_CHECK_IN,
        checked_in_at=None,
        checked_out_at=None,
    ):
        return Stay.objects.create(
            property=property_,
            guest=self.guest,
            qr_token=token,
            status=status,
            operational_status=operational_status,
            submitted_at=timezone.now() if status != StayStatus.DRAFT else None,
            checked_in_at=checked_in_at,
            checked_out_at=checked_out_at,
        )

    def authenticate(self, user: ClerkUser):
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=user)
        )

    def stays_url(self):
        return reverse("platform-oversight-stays")

    def audit_url(self):
        return reverse("platform-oversight-audit")


class PlatformOversightRbacTests(PlatformOversightApiTestCase):
    def test_hotel_owner_gets_403_on_both_endpoints(self):
        self.authenticate(self.owner1)

        stays_response = self.client.get(self.stays_url())
        audit_response = self.client.get(self.audit_url())

        self.assertEqual(stays_response.status_code, 403)
        self.assertEqual(audit_response.status_code, 403)

    def test_unauthenticated_request_is_rejected(self):
        stays_response = self.client.get(self.stays_url())

        self.assertIn(stays_response.status_code, (401, 403))


class PlatformOversightStaysTests(PlatformOversightApiTestCase):
    def test_aggregate_status_counts_per_property_exclude_drafts(self):
        self.authenticate(self.admin)

        response = self.client.get(self.stays_url())

        self.assertEqual(response.status_code, 200)
        by_slug = {
            row["organizationSlug"] + "/" + row["propertyName"]: row
            for row in response.data["properties"]
        }
        jaipur = by_slug["tattvix-hotels/Tattvix Jaipur"]
        self.assertEqual(
            jaipur["statusCounts"],
            {"pendingCheckIn": 2, "checkedIn": 1, "checkedOut": 1},
        )
        self.assertEqual(jaipur["totalStays"], 4)  # draft stay excluded

        goa = by_slug["other-hospitality/Other Goa"]
        self.assertEqual(
            goa["statusCounts"],
            {"pendingCheckIn": 1, "checkedIn": 0, "checkedOut": 2},
        )
        self.assertEqual(goa["totalStays"], 3)

    def test_response_carries_no_identity_or_document_fields(self):
        self.authenticate(self.admin)

        response = self.client.get(self.stays_url())
        raw = json.dumps(response.data)

        for leaked in (
            SECRET_DOCUMENT_NUMBER,
            SECRET_OBJECT_KEY,
            "documentNumber",
            "objectKey",
            "guestName",
            "images",
        ):
            self.assertNotIn(leaked, raw)


class PlatformOversightAuditTests(PlatformOversightApiTestCase):
    def test_feed_merges_both_audit_kinds(self):
        self.authenticate(self.admin)

        response = self.client.get(self.audit_url())

        self.assertEqual(response.status_code, 200)
        kinds = {entry["kind"] for entry in response.data["entries"]}
        self.assertEqual(kinds, {"IDENTITY_ACCESS", "PLATFORM"})
        self.assertEqual(len(response.data["entries"]), 4)

        by_id = {entry["id"]: entry for entry in response.data["entries"]}
        identity_entry = by_id[f"identity-{self.identity_audit_doc.id}"]
        self.assertEqual(identity_entry["action"], "DOCUMENT_VIEWED")
        self.assertEqual(identity_entry["actorEmail"], self.reception1.email)
        self.assertEqual(identity_entry["organizationSlug"], "tattvix-hotels")
        self.assertEqual(identity_entry["propertyName"], "Tattvix Jaipur")
        self.assertEqual(identity_entry["stayId"], str(self.checked_in_stay.public_id))

        platform_entry = by_id[f"platform-{self.platform_audit_member.id}"]
        self.assertEqual(platform_entry["action"], "MEMBER_ADDED")
        self.assertEqual(platform_entry["organizationSlug"], "other-hospitality")
        self.assertEqual(platform_entry["target"], self.owner1.email)

    def test_feed_is_ordered_newest_first(self):
        self.authenticate(self.admin)

        response = self.client.get(self.audit_url())

        timestamps = [entry["at"] for entry in response.data["entries"]]
        self.assertEqual(timestamps, sorted(timestamps, reverse=True))

    def test_filter_by_organization_slug(self):
        self.authenticate(self.admin)

        response = self.client.get(
            self.audit_url(), {"organizationSlug": "tattvix-hotels"}
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            all(
                entry["organizationSlug"] == "tattvix-hotels"
                for entry in response.data["entries"]
            )
        )
        self.assertEqual(len(response.data["entries"]), 3)

    def test_filter_by_action(self):
        self.authenticate(self.admin)

        response = self.client.get(
            self.audit_url(), {"action": "DOCUMENT_VIEWED"}
        )

        self.assertEqual(response.status_code, 200)
        [entry] = response.data["entries"]
        self.assertEqual(entry["kind"], "IDENTITY_ACCESS")
        self.assertEqual(entry["action"], "DOCUMENT_VIEWED")

    def test_limit_is_honored(self):
        self.authenticate(self.admin)

        response = self.client.get(self.audit_url(), {"limit": 2})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["entries"]), 2)

    def test_response_carries_no_identity_or_document_fields(self):
        self.authenticate(self.admin)

        response = self.client.get(self.audit_url())
        raw = json.dumps(response.data)

        for leaked in (
            SECRET_DOCUMENT_NUMBER,
            SECRET_OBJECT_KEY,
            "documentNumber",
            "objectKey",
            "guestData",
            "images",
        ):
            self.assertNotIn(leaked, raw)
