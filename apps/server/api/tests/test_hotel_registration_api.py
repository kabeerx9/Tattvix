from django.utils.text import slugify
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from types import SimpleNamespace
from unittest.mock import patch

from django.db import IntegrityError, close_old_connections, connection, transaction
from django.test import TransactionTestCase
from rest_framework.test import APITestCase

from api.hotel_registration import (
    HotelRegistrationConflict,
    review_request,
    submit_request,
)
from api.models import (
    ClerkUser,
    HotelRegistrationRequest,
    Membership,
    Organization,
    PlatformRoleAssignment,
    PlatformAuditLog,
    Property,
)


class HotelRegistrationApiTests(APITestCase):
    def setUp(self):
        self.applicant = ClerkUser.objects.create(
            clerk_id="applicant", email="owner@example.com"
        )
        self.other = ClerkUser.objects.create(
            clerk_id="other", email="other@example.com"
        )
        self.admin = ClerkUser.objects.create(clerk_id="admin")
        PlatformRoleAssignment.objects.create(user=self.admin)
        self.payload = {
            "hotelName": "  Lake Hotel  ",
            "address": "  10 Lake Road  ",
            "contactPhone": "+91 98765-43210",
        }
        self.sign_in(self.applicant)

    def sign_in(self, user):
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=user)
        )

    def submit(self, **overrides):
        return self.client.post(
            "/api/guest/hotel-requests/", self.payload | overrides, format="json"
        )

    def review(self, request_id, decision="APPROVE", **extra):
        self.sign_in(self.admin)
        return self.client.post(
            f"/api/platform/hotel-requests/{request_id}/review/",
            {"decision": decision, **extra},
            format="json",
        )

    def test_submission_is_trimmed_bound_to_applicant_and_does_not_grant_access(self):
        response = self.submit()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["hotelName"], "Lake Hotel")
        self.assertEqual(response.data["address"], "10 Lake Road")
        self.assertEqual(response.data["status"], "PENDING")
        self.assertIsNone(response.data["organization"])
        self.assertIsNone(response.data["reviewedAt"])
        self.assertFalse(Membership.objects.exists())
        self.assertFalse(Organization.objects.exists())
        self.assertEqual(self.client.get("/api/me/").data["memberships"], [])
        self.assertEqual(
            self.client.get(
                "/api/hotel/lake-hotel/main/rooms/"
            ).status_code,
            404,
        )
        self.assertEqual(
            len(self.client.get("/api/guest/hotel-requests/").data["requests"]), 1
        )
        self.sign_in(self.other)
        self.assertEqual(
            self.client.get("/api/guest/hotel-requests/").data, {"requests": []}
        )

    def test_authentication_and_admin_authorization(self):
        self.assertEqual(
            self.client.get("/api/platform/hotel-requests/").status_code, 403
        )
        self.assertEqual(
            self.client.post(
                "/api/platform/hotel-requests/1/review/", {"decision": "APPROVE"}
            ).status_code,
            403,
        )
        self.client.force_authenticate(user=None)
        self.assertIn(self.submit().status_code, [401, 403])
        self.assertIn(
            self.client.get("/api/guest/hotel-requests/").status_code, [401, 403]
        )

    def test_forbidden_fields_and_invalid_input_are_rejected(self):
        for invalid in [
            {"ownerEmail": self.other.email},
            {"applicant": self.other.id},
            {"status": "APPROVED"},
            {"hotelName": " "},
            {"hotelName": "x" * 256},
            {"address": " "},
            {"address": "x" * 1001},
            {"contactPhone": "abc1234567"},
            {"contactPhone": "123"},
            {"contactPhone": "1" * 21},
            {"contactPhone": "12+3456789"},
        ]:
            with self.subTest(invalid=invalid):
                self.assertEqual(self.submit(**invalid).status_code, 400)

    def test_one_pending_request_and_admin_queue(self):
        first = self.submit()
        self.assertEqual(first.status_code, 201)
        self.assertEqual(self.submit().status_code, 409)
        self.sign_in(self.admin)
        response = self.client.get("/api/platform/hotel-requests/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data["requests"][0]["applicant"]["id"], self.applicant.id
        )
        self.assertEqual(
            self.client.get("/api/platform/hotel-requests/?status=INVALID").status_code,
            400,
        )

    def test_approval_grants_original_applicant_owner_access_and_is_idempotent(self):
        submitted = self.submit()
        self.assertEqual(submitted.status_code, 201)
        response = self.review(submitted.data["id"])
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "APPROVED")
        member = Membership.objects.get()
        self.assertEqual(member.user_id, self.applicant.id)
        self.assertEqual(member.role, "OWNER")
        self.assertTrue(member.has_all_properties)
        self.assertTrue(member.is_active)
        recorded = HotelRegistrationRequest.objects.get(pk=submitted.data["id"])
        self.assertEqual(recorded.reviewer_id, self.admin.id)
        self.assertIsNotNone(recorded.reviewed_at)
        second_admin = ClerkUser.objects.create(clerk_id="second-admin")
        PlatformRoleAssignment.objects.create(user=second_admin)
        self.admin = second_admin
        retry = self.review(submitted.data["id"])
        recorded.refresh_from_db()
        self.assertNotEqual(recorded.reviewer_id, second_admin.id)
        self.assertEqual(retry.data, response.data)
        self.assertEqual(Organization.objects.count(), 1)
        self.assertEqual(Property.objects.count(), 1)
        self.assertEqual(
            self.review(
                submitted.data["id"], "REJECT", rejectionReason="No"
            ).status_code,
            409,
        )
        self.sign_in(self.applicant)
        me = self.client.get("/api/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(
            me.data["memberships"][0]["organization"]["slug"],
            response.data["organization"]["slug"],
        )
        self.assertEqual(
            self.client.get(
                f"/api/hotel/{response.data['organization']['slug']}/main/rooms/"
            ).status_code,
            200,
        )
        self.assertEqual(self.submit().status_code, 201)

    def test_rejection_requires_reason_and_allows_reapplication(self):
        submitted = self.submit()
        self.assertEqual(submitted.status_code, 201)
        for extra in [{}, {"rejectionReason": " "}, {"rejectionReason": "x" * 1001}]:
            self.assertEqual(
                self.review(submitted.data["id"], "REJECT", **extra).status_code, 400
            )
        response = self.review(
            submitted.data["id"], "REJECT", rejectionReason="  Verify address  "
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["rejectionReason"], "Verify address")
        self.assertFalse(Membership.objects.exists())
        self.assertEqual(self.review(submitted.data["id"]).status_code, 409)
        self.assertEqual(
            self.review(submitted.data["id"], "REJECT", rejectionReason="Changed").data,
            response.data,
        )
        self.assertEqual(
            len(self.client.get("/api/platform/hotel-requests/").data["requests"]), 0
        )
        self.assertEqual(
            len(
                self.client.get("/api/platform/hotel-requests/?status=REJECTED").data[
                    "requests"
                ]
            ),
            1,
        )
        self.sign_in(self.applicant)
        self.assertEqual(self.submit().status_code, 201)

    def test_approval_audits_provisioning_once_with_reviewer_actor(self):
        submitted = self.submit()
        self.assertEqual(submitted.status_code, 201)
        approved = self.review(submitted.data["id"])
        self.assertEqual(approved.status_code, 200)
        organization = Organization.objects.get(
            slug=approved.data["organization"]["slug"]
        )
        self.assertCountEqual(
            list(
                PlatformAuditLog.objects.values_list(
                    "action", "target", "actor_id", "organization_id"
                )
            ),
            [
                ("PROPERTY_CREATED", "main", self.admin.id, organization.id),
                ("MEMBER_ADDED", "owner@example.com", self.admin.id, organization.id),
            ],
        )
        self.assertEqual(self.review(submitted.data["id"]).status_code, 200)
        self.assertEqual(PlatformAuditLog.objects.count(), 2)

    def test_audit_failure_rolls_back_approval_and_owner_access(self):
        submitted = self.submit()
        self.assertEqual(submitted.status_code, 201)
        original_create = PlatformAuditLog.objects.create

        def fail_second_event(**fields):
            if fields["action"] == "MEMBER_ADDED":
                raise IntegrityError("audit write failed")
            return original_create(**fields)

        with patch(
            "api.models.PlatformAuditLog.objects.create", side_effect=fail_second_event
        ):
            response = self.review(submitted.data["id"])
        self.assertEqual(response.status_code, 409)
        self.assertFalse(Organization.objects.exists())
        self.assertFalse(Property.objects.exists())
        self.assertFalse(Membership.objects.exists())
        self.assertFalse(PlatformAuditLog.objects.exists())
        item = HotelRegistrationRequest.objects.get(pk=submitted.data["id"])
        self.assertEqual(item.status, "PENDING")
        self.assertIsNone(item.reviewer_id)
        self.assertIsNone(item.reviewed_at)

    def test_membership_failure_rolls_back_approval(self):
        submitted = self.submit()
        self.assertEqual(submitted.status_code, 201)
        with patch(
            "api.hotel_registration.Membership.objects.create",
            side_effect=IntegrityError("failed"),
        ):
            response = self.review(submitted.data["id"])
        self.assertEqual(response.status_code, 409)
        self.assertFalse(Organization.objects.exists())
        self.assertFalse(Property.objects.exists())
        self.sign_in(self.applicant)
        self.assertEqual(
            self.client.get("/api/guest/hotel-requests/").data["requests"][0]["status"],
            "PENDING",
        )

    def test_long_and_non_ascii_names_produce_valid_slugs(self):
        for name in ["x" * 255, "होटल"]:
            self.sign_in(self.applicant)
            submitted = self.submit(hotelName=name)
            self.assertEqual(submitted.status_code, 201)
            approved = self.review(submitted.data["id"])
            self.assertEqual(approved.status_code, 200)
            self.assertLessEqual(len(approved.data["organization"]["slug"]), 255)
            self.assertRegex(approved.data["organization"]["slug"], r"^[a-z0-9-]+$")


class HotelRegistrationConcurrencyTests(TransactionTestCase):
    def setUp(self):
        self.applicant = ClerkUser.objects.create(clerk_id="concurrent-applicant")
        self.admin = ClerkUser.objects.create(clerk_id="concurrent-admin")
        self.fields = {
            "hotel_name": "Concurrent Hotel",
            "address": "1 Main Road",
            "contact_phone": "1234567890",
        }

    def race(self, work):
        if connection.vendor != "postgresql":
            self.skipTest("Row-lock concurrency requires PostgreSQL")
        barrier = Barrier(2)

        def run():
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                return work()
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(run) for _ in range(2)]
            return [future.result(timeout=20) for future in futures]

    def test_concurrent_submissions_create_only_one_pending_request(self):
        def submit():
            try:
                submit_request(applicant=self.applicant, **self.fields)
                return "created"
            except HotelRegistrationConflict:
                return "conflict"

        self.assertCountEqual(self.race(submit), ["created", "conflict"])
        self.assertEqual(HotelRegistrationRequest.objects.count(), 1)

    def test_concurrent_approvals_create_one_organization_and_membership(self):
        item = submit_request(applicant=self.applicant, **self.fields)
        results = self.race(
            lambda: (
                review_request(
                    request_id=item.id, reviewer=self.admin, decision="APPROVE"
                ).organization_id
            )
        )
        self.assertEqual(results[0], results[1])
        self.assertEqual(Organization.objects.count(), 1)
        self.assertEqual(Property.objects.count(), 1)
        self.assertEqual(Membership.objects.count(), 1)

    def test_database_rejects_incomplete_approval_and_duplicate_pending(self):
        item = submit_request(applicant=self.applicant, **self.fields)
        with self.assertRaises(IntegrityError), transaction.atomic():
            HotelRegistrationRequest.objects.filter(pk=item.id).update(
                status="APPROVED"
            )
        with self.assertRaises(IntegrityError), transaction.atomic():
            HotelRegistrationRequest.objects.create(
                applicant=self.applicant, **self.fields
            )

    def test_existing_manual_slug_does_not_block_approval(self):
        item = submit_request(applicant=self.applicant, **self.fields)
        Organization.objects.create(name="Manual", slug=slugify(self.fields["hotel_name"]))
        approved = review_request(
            request_id=item.id, reviewer=self.admin, decision="APPROVE"
        )
        self.assertEqual(
            approved.organization.slug, f"{slugify(self.fields['hotel_name'])}-2"
        )

    def test_approval_uses_a_clean_hotel_slug_and_main_property(self):
        item = submit_request(applicant=self.applicant, **self.fields)
        approved = review_request(
            request_id=item.id, reviewer=self.admin, decision="APPROVE"
        )
        self.assertEqual(approved.organization.slug, slugify(self.fields["hotel_name"]))
        self.assertEqual(approved.property.slug, "main")
