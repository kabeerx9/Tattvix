from datetime import timedelta
from types import SimpleNamespace

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser,
    HotelQrToken,
    Membership,
    MembershipRole,
    OperationalStayStatus,
    Organization,
    PlatformRole,
    PlatformRoleAssignment,
    Property,
    Room,
    RoomStatus,
    SharedIdentitySnapshot,
    Stay,
    StayStatus,
    Subscription,
    SubscriptionEvent,
    SubscriptionEventKind,
)
from api.subscriptions import is_entitled


def _auth(client, user):
    client.force_authenticate(user=SimpleNamespace(is_authenticated=True, db_user=user))


class TrialStartTests(APITestCase):
    def setUp(self):
        self.admin = ClerkUser.objects.create(clerk_id="admin", email="admin@example.com")
        PlatformRoleAssignment.objects.create(user=self.admin, role=PlatformRole.SUPER_ADMIN)
        self.owner = ClerkUser.objects.create(clerk_id="owner", email="owner@example.com")

    @override_settings(SUBSCRIPTION_TRIAL_DAYS=45)
    def test_admin_onboarding_starts_a_45_day_trial_in_the_same_transaction(self):
        _auth(self.client, self.admin)
        before = timezone.now()
        response = self.client.post(
            reverse("platform-organization-list"),
            {
                "organization": {"name": "Sunrise", "slug": "sunrise"},
                "property": {"name": "Sunrise Jaipur", "slug": "jaipur"},
                "ownerEmail": self.owner.email,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        subscription = Subscription.objects.get(organization__slug="sunrise")
        self.assertAlmostEqual(
            subscription.trial_ends_at,
            before + timedelta(days=45),
            delta=timedelta(minutes=1),
        )
        self.assertIsNone(subscription.paid_until)
        self.assertTrue(is_entitled(subscription))
        event = subscription.events.get()
        self.assertEqual(event.kind, SubscriptionEventKind.TRIAL_STARTED)
        self.assertIsNone(event.actor)

    @override_settings(SUBSCRIPTION_TRIAL_DAYS=45)
    def test_self_serve_approval_starts_a_trial(self):
        applicant = ClerkUser.objects.create(clerk_id="applicant", email="a@example.com")
        _auth(self.client, applicant)
        submit = self.client.post(
            reverse("guest-hotel-requests"),
            {
                "hotelName": "Lakeview",
                "address": "Udaipur",
                "contactPhone": "+919876543210",
            },
            format="json",
        )
        self.assertEqual(submit.status_code, 201, submit.data)
        _auth(self.client, self.admin)
        review = self.client.post(
            reverse("platform-hotel-request-review", args=[submit.data["id"]]),
            {"decision": "APPROVE"},
            format="json",
        )
        self.assertEqual(review.status_code, 200, review.data)
        subscription = Subscription.objects.get(organization__slug="lakeview")
        self.assertTrue(is_entitled(subscription))

    def test_me_exposes_subscription_per_membership(self):
        organization = Organization.objects.create(name="Sunrise", slug="sunrise")
        Membership.objects.create(
            user=self.owner, organization=organization,
            role=MembershipRole.OWNER, has_all_properties=True,
        )
        _auth(self.client, self.owner)
        response = self.client.get(reverse("me"))
        subscription = response.data["memberships"][0]["subscription"]
        self.assertEqual(subscription["status"], "TRIALING")
        self.assertTrue(subscription["entitled"])
        self.assertIsNone(subscription["paidUntil"])
        self.assertGreaterEqual(subscription["daysLeft"], 44)
        self.assertLessEqual(subscription["daysLeft"], 45)

    def test_me_fails_closed_when_the_subscription_row_is_missing(self):
        organization = Organization.objects.create(name="Legacy", slug="legacy")
        organization.subscription.delete()
        Membership.objects.create(
            user=self.owner, organization=organization,
            role=MembershipRole.OWNER, has_all_properties=True,
        )
        _auth(self.client, self.owner)
        response = self.client.get(reverse("me"))
        subscription = response.data["memberships"][0]["subscription"]
        self.assertEqual(subscription["status"], "MISSING")
        self.assertFalse(subscription["entitled"])
        self.assertEqual(subscription["daysLeft"], 0)


class ExpiredSubscriptionGateTests(APITestCase):
    """Day 46: a guest is still asleep in room 101."""

    def setUp(self):
        self.organization = Organization.objects.create(name="Sunrise", slug="sunrise")
        self.subscription = self.organization.subscription
        self.subscription.trial_ends_at = timezone.now() - timedelta(days=1)
        self.subscription.save()
        self.property = Property.objects.create(
            organization=self.organization, name="Sunrise Jaipur", slug="jaipur"
        )
        self.owner = ClerkUser.objects.create(clerk_id="owner", email="owner@example.com")
        Membership.objects.create(
            user=self.owner, organization=self.organization,
            role=MembershipRole.OWNER, has_all_properties=True,
        )
        self.guest = ClerkUser.objects.create(clerk_id="guest", email="guest@example.com")
        self.qr_token = HotelQrToken.objects.create(
            property=self.property, token_digest="a" * 64, token_hint="sunrise",
            created_by=self.owner, expires_at=timezone.now() + timedelta(days=30),
        )
        self.room = Room.objects.create(
            property=self.property, number="101", floor="1", room_type="Deluxe",
            nightly_rate_minor=200000, status=RoomStatus.OCCUPIED,
        )
        self.in_house = Stay.objects.create(
            property=self.property, guest=self.guest, qr_token=self.qr_token,
            room=self.room, status=StayStatus.SUBMITTED,
            operational_status=OperationalStayStatus.CHECKED_IN,
            submitted_at=timezone.now() - timedelta(days=2),
            checked_in_at=timezone.now() - timedelta(days=2),
            hotel_access_expires_at=timezone.now() + timedelta(days=30),
        )
        SharedIdentitySnapshot.objects.create(
            stay=self.in_house, guest_data={"legalFirstName": "A", "legalLastName": "B"},
            companion_data=[], document_data={"documentType": "AADHAAR"},
        )
        self.arriving = Stay.objects.create(
            property=self.property, guest=self.guest, qr_token=self.qr_token,
            status=StayStatus.SUBMITTED, submitted_at=timezone.now(),
            hotel_access_expires_at=timezone.now() + timedelta(days=30),
        )
        SharedIdentitySnapshot.objects.create(
            stay=self.arriving, guest_data={"legalFirstName": "C", "legalLastName": "D"},
            companion_data=[], document_data={"documentType": "AADHAAR"},
        )
        self.spare_room = Room.objects.create(
            property=self.property, number="102", floor="1", room_type="Deluxe",
            nightly_rate_minor=200000,
        )
        _auth(self.client, self.owner)

    def hotel_url(self, name, *extra):
        return reverse(name, args=[self.organization.slug, self.property.slug, *extra])

    def assert_payment_required(self, response):
        self.assertEqual(response.status_code, 402, response.data)
        self.assertEqual(response.data["code"], "subscription_expired")
        self.assertIsNotNone(response.data["trialEndsAt"])
        self.assertIsNone(response.data["paidUntil"])

    def test_check_in_is_refused(self):
        response = self.client.post(
            self.hotel_url("hotel-stay-check-in", self.arriving.public_id),
            {"roomId": self.spare_room.id, "nights": 1},
            format="json",
        )
        self.assert_payment_required(response)
        self.arriving.refresh_from_db()
        self.assertEqual(self.arriving.operational_status, OperationalStayStatus.PENDING_CHECK_IN)

    def test_room_and_property_edits_are_refused(self):
        self.assert_payment_required(
            self.client.post(
                self.hotel_url("hotel-room-list"),
                {"number": "201", "floor": "2", "roomType": "Suite"},
                format="json",
            )
        )
        self.assert_payment_required(
            self.client.patch(
                self.hotel_url("hotel-property-details"),
                {"description": "Renovated"},
                format="json",
            )
        )
        self.assert_payment_required(
            self.client.post(
                self.hotel_url("hotel-stay-bill", self.in_house.public_id),
                {
                    "requestId": "11111111-1111-1111-1111-111111111111",
                    "description": "Laundry", "quantity": 1, "unitPriceMinor": 100,
                },
                format="json",
            )
        )

    def test_analytics_are_refused_but_the_register_stays_readable(self):
        self.assert_payment_required(self.client.get(self.hotel_url("hotel-report-occupancy")))
        self.assert_payment_required(
            self.client.get(self.hotel_url("hotel-report-status-counts"))
        )
        self.assertEqual(self.client.get(self.hotel_url("hotel-report-register")).status_code, 200)
        self.assertEqual(self.client.get(self.hotel_url("hotel-report-in-house")).status_code, 200)

    def test_reads_of_the_hotels_own_records_stay_open(self):
        for name in ("hotel-stay-list", "hotel-room-list", "hotel-property-details", "hotel-overview-summary"):
            with self.subTest(name=name):
                self.assertEqual(self.client.get(self.hotel_url(name)).status_code, 200)
        self.assertEqual(
            self.client.get(self.hotel_url("hotel-stay-bill", self.in_house.public_id)).status_code,
            200,
        )

    def test_checkout_still_works_so_no_guest_is_stranded(self):
        response = self.client.post(
            self.hotel_url("hotel-stay-checkout", self.in_house.public_id), {}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.in_house.refresh_from_db()
        self.assertEqual(self.in_house.operational_status, OperationalStayStatus.CHECKED_OUT)

    def test_guest_routes_never_see_the_hotels_subscription(self):
        _auth(self.client, self.guest)
        self.assertEqual(
            self.client.get(reverse("guest-stay-detail", args=[self.in_house.public_id])).status_code,
            200,
        )
        self.assertEqual(
            self.client.get(reverse("guest-stay-bill", args=[self.in_house.public_id])).status_code,
            200,
        )
        self.assertEqual(self.client.get(reverse("me")).status_code, 200)

    def test_platform_admin_routes_are_not_gated(self):
        admin = ClerkUser.objects.create(clerk_id="admin", email="admin@example.com")
        PlatformRoleAssignment.objects.create(user=admin, role=PlatformRole.SUPER_ADMIN)
        _auth(self.client, admin)
        detail = self.client.get(
            reverse("platform-organization-detail", args=[self.organization.slug])
        )
        self.assertEqual(detail.status_code, 200)
        self.assertEqual(detail.data["subscription"]["status"], "EXPIRED")
        self.assertEqual(detail.data["pricing"]["monthlyTotalMinor"], 50000)
        portfolio = self.client.get(reverse("platform-portfolio"))
        self.assertEqual(
            portfolio.data["properties"][0]["organization"]["subscription"]["status"], "EXPIRED"
        )

    def test_missing_subscription_row_fails_closed(self):
        self.subscription.delete()
        response = self.client.post(
            self.hotel_url("hotel-stay-check-in", self.arriving.public_id),
            {"roomId": self.spare_room.id, "nights": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 402)
        self.assertIsNone(response.data["trialEndsAt"])

    def test_paid_until_in_the_future_re_entitles(self):
        self.subscription.paid_until = timezone.now() + timedelta(days=30)
        self.subscription.save()
        response = self.client.post(
            self.hotel_url("hotel-stay-check-in", self.arriving.public_id),
            {"roomId": self.spare_room.id, "nights": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)


class ExtendTrialTests(APITestCase):
    def setUp(self):
        self.admin = ClerkUser.objects.create(clerk_id="admin", email="admin@example.com")
        PlatformRoleAssignment.objects.create(user=self.admin, role=PlatformRole.SUPER_ADMIN)
        self.owner = ClerkUser.objects.create(clerk_id="owner", email="owner@example.com")
        self.organization = Organization.objects.create(name="Sunrise", slug="sunrise")
        self.subscription = self.organization.subscription
        Membership.objects.create(
            user=self.owner, organization=self.organization,
            role=MembershipRole.OWNER, has_all_properties=True,
        )
        self.url = reverse("platform-organization-extend-trial", args=[self.organization.slug])

    def test_extend_sets_the_target_date_and_records_who_and_why(self):
        _auth(self.client, self.admin)
        target = self.subscription.trial_ends_at + timedelta(days=14)
        response = self.client.post(
            self.url, {"trialEndsAt": target.isoformat(), "note": "Onboarding took a week"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.trial_ends_at, target)
        event = self.subscription.events.filter(kind=SubscriptionEventKind.TRIAL_EXTENDED).get()
        self.assertEqual(event.actor, self.admin)
        self.assertEqual(event.note, "Onboarding took a week")
        self.assertEqual(event.new_trial_ends_at, target)
        self.assertEqual(response.data["events"][0]["kind"], "TRIAL_EXTENDED")
        self.assertEqual(response.data["events"][0]["actorEmail"], self.admin.email)

    def test_replaying_the_same_target_is_a_no_op(self):
        _auth(self.client, self.admin)
        target = self.subscription.trial_ends_at + timedelta(days=14)
        for _ in range(2):
            response = self.client.post(
                self.url, {"trialEndsAt": target.isoformat()}, format="json"
            )
            self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(
            SubscriptionEvent.objects.filter(kind=SubscriptionEventKind.TRIAL_EXTENDED).count(),
            1,
        )

    def test_extend_cannot_shorten_or_target_the_past(self):
        _auth(self.client, self.admin)
        earlier = self.subscription.trial_ends_at - timedelta(days=1)
        response = self.client.post(self.url, {"trialEndsAt": earlier.isoformat()}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "trial_end_shortened")
        past = timezone.now() - timedelta(days=1)
        response = self.client.post(self.url, {"trialEndsAt": past.isoformat()}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["code"], "trial_end_in_past")
        self.subscription.refresh_from_db()
        self.assertFalse(self.subscription.events.filter(kind=SubscriptionEventKind.TRIAL_EXTENDED).exists())

    def test_extending_an_expired_trial_re_entitles_the_hotel(self):
        Subscription.objects.filter(pk=self.subscription.pk).update(
            trial_ends_at=timezone.now() - timedelta(days=1)
        )
        _auth(self.client, self.admin)
        target = timezone.now() + timedelta(days=14)
        response = self.client.post(self.url, {"trialEndsAt": target.isoformat()}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data["entitled"])
        self.assertEqual(response.data["status"], "TRIALING")

    def test_hotel_owner_cannot_extend_their_own_trial(self):
        _auth(self.client, self.owner)
        target = self.subscription.trial_ends_at + timedelta(days=14)
        response = self.client.post(self.url, {"trialEndsAt": target.isoformat()}, format="json")
        self.assertEqual(response.status_code, 403)
        self.subscription.refresh_from_db()
        self.assertNotEqual(self.subscription.trial_ends_at, target)

    def test_unknown_fields_and_missing_date_are_rejected(self):
        _auth(self.client, self.admin)
        self.assertEqual(self.client.post(self.url, {}, format="json").status_code, 400)
        self.assertEqual(
            self.client.post(self.url, {"trialEndsAt": "not-a-date"}, format="json").status_code,
            400,
        )
