from datetime import timedelta
from types import SimpleNamespace
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from api.models import (
    ClerkUser,
    Organization,
    Membership,
    MembershipRole,
    HotelRegistrationRequest,
    Subscription,
)


class ReferralFixtures:
    def setUp(self):
        self.owner = ClerkUser.objects.create(clerk_id="ref-owner")
        self.other_owner = ClerkUser.objects.create(clerk_id="ref-other")
        self.guest = ClerkUser.objects.create(clerk_id="ref-guest")
        self.org = Organization.objects.create(name="Referrals", slug="referrals")
        self.membership = Membership.objects.create(
            user=self.owner,
            organization=self.org,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )
        Membership.objects.create(
            user=self.other_owner,
            organization=self.org,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )
        self.auth(self.owner)

    def auth(self, user):
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=user)
        )

    def url(self):
        return reverse("account-referrals")

    def code(self):
        response = self.client.post(self.url(), {}, format="json")
        self.assertIn(response.status_code, [200, 201])
        return response.data["code"]

    def register(self, code=None):
        body = {
            "hotelName": "Referred Hotel",
            "address": "Test Road",
            "contactPhone": "+919999999999",
        }
        if code is not None:
            body["referralCode"] = code
        return self.client.post(reverse("guest-hotel-requests"), body, format="json")


class ReferralApiTests(ReferralFixtures, APITestCase):
    def test_read_does_not_create_and_repeated_creation_returns_same_code(self):
        from api.models import HotelReferralCode

        self.assertIsNone(self.client.get(self.url()).data["code"])
        self.assertFalse(HotelReferralCode.objects.exists())
        first = self.code()
        self.assertEqual(len(first), 12)
        self.assertEqual(self.code(), first)
        self.assertEqual(HotelReferralCode.objects.count(), 1)

    def test_only_active_owners_can_create_or_track(self):
        self.auth(self.guest)
        self.assertEqual(self.client.get(self.url()).status_code, 404)
        self.assertEqual(
            self.client.post(self.url(), {}, format="json").status_code, 404
        )
        self.auth(self.owner)
        self.membership.role = MembershipRole.MANAGER
        self.membership.save()
        self.assertEqual(self.client.get(self.url()).status_code, 404)
        self.client.force_authenticate(user=None)
        self.assertIn(self.client.get(self.url()).status_code, [401, 403])

    def test_attribution_is_attached_to_registration_and_statuses_follow_review(self):
        code = self.code()
        self.auth(self.guest)
        response = self.register(code.lower())
        self.assertEqual(response.status_code, 201)
        item = HotelRegistrationRequest.objects.get(pk=response.data["id"])
        self.assertEqual(item.referral.code, code)
        # Existing request DTO remains unchanged for earlier callers.
        self.assertNotIn("referralCode", response.data)
        self.auth(self.owner)
        pending = self.client.get(self.url()).data
        self.assertEqual(
            pending["summary"], {"total": 1, "pending": 1, "approved": 0, "rejected": 0}
        )
        from api.hotel_registration import review_request

        review_request(request_id=item.id, reviewer=self.owner, decision="APPROVE")
        self.assertEqual(self.client.get(self.url()).data["summary"]["approved"], 1)
        self.auth(self.other_owner)
        self.assertEqual(self.client.get(self.url()).data["summary"]["total"], 0)

    def test_self_invalid_or_inactive_owner_codes_do_not_create_requests(self):
        code = self.code()
        self.assertEqual(self.register(code).status_code, 400)
        self.auth(self.guest)
        for bad in ["UNKNOWNABCDE2", "bad!", code + "X"]:
            self.assertEqual(self.register(bad).status_code, 400)
        self.membership.is_active = False
        self.membership.save()
        self.assertEqual(self.register(code).status_code, 400)
        self.assertFalse(HotelRegistrationRequest.objects.exists())

    def test_optional_code_preserves_existing_registration_flow(self):
        self.auth(self.guest)
        response = self.register()
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(
            HotelRegistrationRequest.objects.get(pk=response.data["id"]).referral_id
        )

    def test_pending_duplicate_cannot_change_referral(self):
        first = self.code()
        self.auth(self.other_owner)
        second = self.code()
        self.auth(self.guest)
        self.assertEqual(self.register(first).status_code, 201)
        self.assertEqual(self.register(second).status_code, 409)
        self.assertEqual(HotelRegistrationRequest.objects.get().referral.code, first)

    def test_tracker_returns_only_hotel_name_status_and_dates(self):
        code = self.code()
        self.auth(self.guest)
        self.register(code)
        self.auth(self.owner)
        entry = self.client.get(self.url()).data["registrations"][0]
        self.assertEqual(
            set(entry), {"id", "hotelName", "status", "submittedAt", "reviewedAt"}
        )
        self.assertNotIn("address", entry)
        self.assertNotIn("contactPhone", entry)

    def test_referrals_work_after_subscription_expiry(self):
        Subscription.objects.filter(organization=self.org).update(
            trial_ends_at=timezone.now() - timedelta(days=1), paid_until=None
        )
        self.assertEqual(len(self.code()), 12)

    def test_cursor_tracking_keeps_rejected_requests_and_is_bounded(self):
        code = self.code()
        from api.models import HotelReferralCode

        referral = HotelReferralCode.objects.get(code=code)
        for i in range(26):
            HotelRegistrationRequest.objects.create(
                applicant=self.guest,
                hotel_name=f"Hotel {i}",
                address="Private address",
                contact_phone="9999999999",
                status="REJECTED",
                reviewer=self.owner,
                reviewed_at=timezone.now(),
                rejection_reason="Private reason",
                referral=referral,
            )
        first = self.client.get(self.url()).data
        self.assertEqual(len(first["registrations"]), 25)
        second = self.client.get(
            self.url() + "?before=" + str(first["nextCursor"])
        ).data
        self.assertEqual(len(second["registrations"]), 1)
        self.assertIsNone(second["nextCursor"])
        self.assertEqual(first["summary"]["rejected"], 26)

    def test_invalid_code_returns_actionable_error_and_strict_inputs(self):
        self.auth(self.guest)
        response = self.register("BAD")
        self.assertEqual(response.data["code"], "invalid_referral")
        self.assertIn("error", response.data)
        self.auth(self.owner)
        self.assertEqual(
            self.client.post(
                self.url(), {"ownerId": self.other_owner.id}, format="json"
            ).status_code,
            400,
        )
        for cursor in ["0", "-1", "abc", "9007199254740992"]:
            self.assertEqual(
                self.client.get(self.url() + "?before=" + cursor).status_code, 400
            )

    def test_rejected_request_keeps_attribution_when_applicant_reapplies(self):
        first = self.code()
        self.auth(self.other_owner)
        second = self.code()
        self.auth(self.guest)
        response = self.register(first)
        from api.hotel_registration import review_request

        review_request(
            request_id=response.data["id"],
            reviewer=self.owner,
            decision="REJECT",
            rejection_reason="Try again",
        )
        self.assertEqual(self.register(second).status_code, 201)
        old = HotelRegistrationRequest.objects.get(pk=response.data["id"])
        self.assertEqual(old.referral.code, first)
        self.auth(self.owner)
        self.assertEqual(
            self.client.get(self.url()).data["summary"],
            {"total": 1, "pending": 0, "approved": 0, "rejected": 1},
        )

    def test_random_code_collision_retries_without_changing_existing_code(self):
        from unittest.mock import patch
        from api.models import HotelReferralCode

        HotelReferralCode.objects.create(owner=self.other_owner, code="AAAAAAAAAAAA")
        with patch(
            "api.referrals.secrets.choice", side_effect=list("AAAAAAAAAAAABBBBBBBBBBBB")
        ):
            self.assertEqual(self.code(), "BBBBBBBBBBBB")
        self.assertEqual(
            HotelReferralCode.objects.get(owner=self.other_owner).code, "AAAAAAAAAAAA"
        )


from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from django.db import close_old_connections, connection
from rest_framework.test import APITransactionTestCase


class ReferralConcurrencyTests(ReferralFixtures, APITransactionTestCase):
    def race(self, work):
        if connection.vendor != "postgresql":
            self.skipTest("Concurrent unique constraints require PostgreSQL")
        gate = Barrier(2)

        def run(index):
            close_old_connections()
            try:
                gate.wait(timeout=10)
                return work(index)
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(run, i) for i in range(2)]
            return [future.result(timeout=20) for future in futures]

    def test_concurrent_creation_returns_one_stable_code(self):
        from api.referrals import create_referral_code
        from api.models import HotelReferralCode

        codes = self.race(lambda _: create_referral_code(self.owner)[0].code)
        self.assertEqual(codes[0], codes[1])
        self.assertEqual(HotelReferralCode.objects.count(), 1)

    def test_competing_referrals_cannot_overwrite_winning_pending_request(self):
        from api.referrals import create_referral_code
        from api.hotel_registration import submit_request, HotelRegistrationConflict

        codes = [
            create_referral_code(owner)[0].code
            for owner in [self.owner, self.other_owner]
        ]

        def submit(index):
            try:
                row = submit_request(
                    applicant=self.guest,
                    referral_code=codes[index],
                    hotel_name="Race Hotel",
                    address="Road",
                    contact_phone="9999999999",
                )
                return ("created", row.referral.code)
            except HotelRegistrationConflict:
                return ("conflict", None)

        results = self.race(submit)
        self.assertCountEqual([r[0] for r in results], ["created", "conflict"])
        winning_code = next(r[1] for r in results if r[0] == "created")
        self.assertEqual(
            HotelRegistrationRequest.objects.get().referral.code, winning_code
        )
