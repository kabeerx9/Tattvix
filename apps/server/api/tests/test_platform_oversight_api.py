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


class PlatformOversightWeeklyCheckInsTestCase(APITestCase):
    """Own fixtures: precise checked_in_at values across 2 properties x 3
    weeks, kept separate from PlatformOversightApiTestCase's stay fixtures
    so week-bucket assertions aren't polluted by unrelated stays."""

    def setUp(self):
        self.admin = ClerkUser.objects.create(
            clerk_id="weekly_admin",
            email="weekly-admin@example.com",
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
            clerk_id="weekly_owner",
            email="weekly-owner@example.com",
        )
        Membership.objects.create(
            user=self.owner1,
            organization=self.org1,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )
        self.guest = ClerkUser.objects.create(
            clerk_id="weekly_guest",
            email="weekly-guest@example.com",
        )

        self.token1 = HotelQrToken.objects.create(
            property=self.property1,
            token_digest="c" * 64,
            token_hint="jaipurtok2",
            created_by=self.owner1,
            expires_at=timezone.now() + timedelta(days=30),
        )
        self.token2 = HotelQrToken.objects.create(
            property=self.property2,
            token_digest="d" * 64,
            token_hint="goatoken2",
            created_by=self.owner1,
            expires_at=timezone.now() + timedelta(days=30),
        )

        now = timezone.now()
        # Anchor to a Tuesday well inside "this" week so week-math is stable
        # regardless of which day the suite runs on.
        this_tuesday = now - timedelta(days=now.weekday()) + timedelta(days=1)
        self.week0 = this_tuesday
        self.week1 = this_tuesday - timedelta(weeks=1)
        self.week2 = this_tuesday - timedelta(weeks=2)
        self.week5 = this_tuesday - timedelta(weeks=5)

        # property1: 2 check-ins in week0, 1 in week1, 1 far back in week5.
        self._make_checked_in_stay(self.property1, self.token1, self.week0)
        self._make_checked_in_stay(self.property1, self.token1, self.week0)
        self._make_checked_in_stay(self.property1, self.token1, self.week1)
        self._make_checked_in_stay(self.property1, self.token1, self.week5)

        # property2: 1 check-in in week1, 3 in week2.
        self._make_checked_in_stay(self.property2, self.token2, self.week1)
        self._make_checked_in_stay(self.property2, self.token2, self.week2)
        self._make_checked_in_stay(self.property2, self.token2, self.week2)
        self._make_checked_in_stay(self.property2, self.token2, self.week2)

        # A stay with no checked_in_at (never checked in) must never
        # contribute to any week's count.
        Stay.objects.create(
            property=self.property1,
            guest=self.guest,
            qr_token=self.token1,
            status=StayStatus.SUBMITTED,
            operational_status=OperationalStayStatus.PENDING_CHECK_IN,
            submitted_at=now,
        )

    def _make_checked_in_stay(self, property_, token, checked_in_at):
        return Stay.objects.create(
            property=property_,
            guest=self.guest,
            qr_token=token,
            status=StayStatus.SUBMITTED,
            operational_status=OperationalStayStatus.CHECKED_IN,
            submitted_at=checked_in_at,
            checked_in_at=checked_in_at,
        )

    def authenticate(self, user: ClerkUser):
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=user)
        )

    def weekly_url(self):
        return reverse("platform-oversight-weekly-check-ins")


class PlatformOversightWeeklyCheckInsRbacTests(PlatformOversightWeeklyCheckInsTestCase):
    def test_hotel_owner_gets_403(self):
        self.authenticate(self.owner1)

        response = self.client.get(self.weekly_url())

        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_request_is_rejected(self):
        response = self.client.get(self.weekly_url())

        self.assertIn(response.status_code, (401, 403))


class PlatformOversightWeeklyCheckInsAggregationTests(
    PlatformOversightWeeklyCheckInsTestCase
):
    def test_aggregates_check_ins_per_property_per_week(self):
        self.authenticate(self.admin)

        response = self.client.get(self.weekly_url(), {"weeks": 4})

        self.assertEqual(response.status_code, 200)
        by_key = {
            (row["organizationSlug"], row["propertyId"], row["weekStart"]): row[
                "checkIns"
            ]
            for row in response.data["rows"]
        }

        self.assertEqual(
            by_key[("tattvix-hotels", self.property1.id, self._monday(self.week0))],
            2,
        )
        self.assertEqual(
            by_key[("tattvix-hotels", self.property1.id, self._monday(self.week1))],
            1,
        )
        self.assertEqual(
            by_key[("other-hospitality", self.property2.id, self._monday(self.week1))],
            1,
        )
        self.assertEqual(
            by_key[("other-hospitality", self.property2.id, self._monday(self.week2))],
            3,
        )
        # week5 falls outside the weeks=4 lookback window.
        self.assertNotIn(
            ("tattvix-hotels", self.property1.id, self._monday(self.week5)),
            by_key,
        )

    def test_weeks_param_bounds_the_lookback_window(self):
        self.authenticate(self.admin)

        narrow = self.client.get(self.weekly_url(), {"weeks": 1})
        self.assertEqual(narrow.status_code, 200)
        narrow_weeks = {row["weekStart"] for row in narrow.data["rows"]}
        self.assertNotIn(self._monday(self.week5), narrow_weeks)
        self.assertNotIn(self._monday(self.week2), narrow_weeks)

        wide = self.client.get(self.weekly_url(), {"weeks": 6})
        self.assertEqual(wide.status_code, 200)
        wide_weeks = {row["weekStart"] for row in wide.data["rows"]}
        self.assertIn(self._monday(self.week5), wide_weeks)

    def test_weeks_param_is_bounded_to_26(self):
        self.authenticate(self.admin)

        response = self.client.get(self.weekly_url(), {"weeks": 27})

        self.assertEqual(response.status_code, 400)

    def test_response_carries_no_identity_fields(self):
        self.authenticate(self.admin)

        response = self.client.get(self.weekly_url(), {"weeks": 8})
        raw = json.dumps(response.data)

        for leaked in (
            self.guest.email,
            "guest",
            "documentNumber",
            "objectKey",
        ):
            self.assertNotIn(leaked, raw)

    def _monday(self, dt):
        monday = dt - timedelta(days=dt.weekday())
        return monday.date().isoformat()
