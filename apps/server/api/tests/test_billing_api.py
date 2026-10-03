from uuid import uuid4

from rest_framework.test import APITestCase
from django.utils import timezone
from api.models import ConsentGrant
from api.tests import test_hotel_operations_api as fixtures


class BillingApiTests(APITestCase):
    authenticate = fixtures.HotelOperationsApiTests.authenticate

    def setUp(self):
        fixtures.HotelOperationsApiTests.setUp(self)
        ConsentGrant.objects.create(
            stay=self.stay,
            granted_by=self.guest,
            consent_version="v1",
            granted_at=timezone.now(),
        )
        self.authenticate(self.owner)
        self.base = f"/api/hotel/{self.organization.slug}/{self.property.slug}"
        self.bill_url = f"{self.base}/stays/{self.stay.public_id}/bill/"
        self.check_in_url = f"{self.base}/stays/{self.stay.public_id}/check-in/"
        self.extra = {
            "requestId": str(uuid4()),
            "description": "Breakfast",
            "quantity": 2,
            "unitPriceMinor": 45000,
        }

    def configure_and_check_in(self, rate=200000, nights=3):
        response = self.client.patch(
            f"{self.base}/rooms/{self.room.id}/rate/",
            {"nightlyRateMinor": rate},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        response = self.client.post(
            self.check_in_url, {"roomId": self.room.id, "nights": nights}, format="json"
        )
        self.assertEqual(response.status_code, 200)

    def test_room_price_is_snapshotted_and_confirmation_replay_is_exact(self):
        self.configure_and_check_in()
        self.client.patch(
            f"{self.base}/rooms/{self.room.id}/rate/",
            {"nightlyRateMinor": 900000},
            format="json",
        )
        response = self.client.get(self.bill_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totalMinor"], 600000)
        self.assertEqual(response.data["nightlyRateMinor"], 200000)
        self.assertEqual(response.data["roomNights"], 3)
        self.assertEqual(len(response.data["items"]), 1)
        same = self.client.post(
            self.check_in_url, {"roomId": self.room.id, "nights": 3}, format="json"
        )
        changed = self.client.post(
            self.check_in_url, {"roomId": self.room.id, "nights": 4}, format="json"
        )
        self.assertEqual(same.status_code, 200)
        self.assertEqual(changed.status_code, 409)

    def test_missing_rate_blocks_check_in_but_zero_is_valid(self):
        self.client.patch(
            f"{self.base}/rooms/{self.room.id}/rate/",
            {"nightlyRateMinor": None},
            format="json",
        )
        response = self.client.post(
            self.check_in_url, {"roomId": self.room.id}, format="json"
        )
        self.assertEqual(response.status_code, 409)
        self.configure_and_check_in(rate=0)
        self.assertEqual(self.client.get(self.bill_url).data["totalMinor"], 0)

    def test_extra_idempotency_void_and_checkout_finality(self):
        self.configure_and_check_in()
        response = self.client.post(self.bill_url, self.extra, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["totalMinor"], 690000)
        self.assertEqual(
            self.client.post(self.bill_url, self.extra, format="json").data,
            response.data,
        )
        conflict = self.client.post(
            self.bill_url, {**self.extra, "quantity": 3}, format="json"
        )
        self.assertEqual(conflict.status_code, 409)
        room_item, extra_item = response.data["items"]
        self.assertEqual(
            self.client.post(
                f"{self.bill_url}{room_item['id']}/void/",
                {"reason": "Wrong"},
                format="json",
            ).status_code,
            409,
        )
        voided = self.client.post(
            f"{self.bill_url}{extra_item['id']}/void/",
            {"reason": "Cancelled breakfast"},
            format="json",
        )
        self.assertEqual(voided.status_code, 200)
        self.assertEqual(voided.data["totalMinor"], 600000)
        self.assertEqual(voided.data["items"][1]["voidReason"], "Cancelled breakfast")
        self.client.post(
            f"{self.base}/stays/{self.stay.public_id}/checkout/", format="json"
        )
        self.assertTrue(self.client.get(self.bill_url).data["isFinal"])
        self.assertEqual(
            self.client.post(
                self.bill_url, {**self.extra, "requestId": str(uuid4())}, format="json"
            ).status_code,
            409,
        )
        self.assertEqual(
            self.client.post(
                f"{self.bill_url}{extra_item['id']}/void/",
                {"reason": "Changed"},
                format="json",
            ).status_code,
            409,
        )

    def test_guest_ownership_survives_consent_revocation(self):
        self.configure_and_check_in()
        self.authenticate(self.guest)
        self.client.post(
            f"/api/guest/stays/{self.stay.public_id}/revoke/", format="json"
        )
        response = self.client.get(f"/api/guest/stays/{self.stay.public_id}/")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("identity", response.data)
        self.assertEqual(response.data["room"]["number"], "101")
        self.assertEqual(
            self.client.get(
                f"/api/guest/stays/{self.stay.public_id}/bill/"
            ).status_code,
            200,
        )
        self.authenticate(self.owner)
        self.assertEqual(
            self.client.get(
                f"/api/guest/stays/{self.stay.public_id}/bill/"
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.get(f"/api/guest/stays/{self.stay.public_id}/").status_code, 404
        )

    def test_permissions_and_strict_charge_validation(self):
        self.authenticate(self.reception)
        self.assertEqual(
            self.client.patch(
                f"{self.base}/rooms/{self.room.id}/rate/",
                {"nightlyRateMinor": 100},
                format="json",
            ).status_code,
            404,
        )
        self.authenticate(self.owner)
        self.configure_and_check_in()
        for change in (
            {"quantity": 0},
            {"quantity": 1.5},
            {"unitPriceMinor": -1},
            {"unitPriceMinor": 100000001},
            {"currency": "USD"},
            {"description": " "},
            {"requestId": "invalid"},
        ):
            with self.subTest(change=change):
                self.assertEqual(
                    self.client.post(
                        self.bill_url, {**self.extra, **change}, format="json"
                    ).status_code,
                    400,
                )
        self.authenticate(self.guest)
        self.assertEqual(self.client.get(self.bill_url).status_code, 404)
        self.assertEqual(
            self.client.post(self.bill_url, self.extra, format="json").status_code, 404
        )

    def test_property_details_are_public_without_room_inventory(self):
        details = {
            "address": "Jaipur",
            "contactPhone": "+91 9876543210",
            "description": "A quiet hotel",
            "amenities": ["Wi-Fi"],
            "checkInTime": "14:00",
            "checkOutTime": "11:00",
        }
        response = self.client.patch(f"{self.base}/details/", details, format="json")
        self.assertEqual(response.status_code, 200)
        self.configure_and_check_in()
        self.authenticate(self.guest)
        payload = self.client.get(f"/api/guest/stays/{self.stay.public_id}/").data[
            "property"
        ]["details"]
        self.assertEqual(payload["address"], "Jaipur")
        self.assertEqual(payload["nightlyRateFromMinor"], 200000)
        self.assertEqual(payload["nightlyRateToMinor"], 200000)
        self.assertNotIn("rooms", payload)
        self.authenticate(self.reception)
        self.assertEqual(self.client.get(f"{self.base}/details/").status_code, 200)
        self.assertEqual(
            self.client.patch(
                f"{self.base}/details/", details, format="json"
            ).status_code,
            404,
        )

    def test_maximum_safe_total_is_enforced_without_partial_write(self):
        from api.models import StayCharge

        self.configure_and_check_in(rate=0, nights=1)
        StayCharge.objects.bulk_create(
            [
                StayCharge(
                    stay=self.stay,
                    kind="EXTRA",
                    description="Large group invoice",
                    quantity=9999,
                    unit_price_minor=100000000,
                    created_by=self.owner,
                )
                for _ in range(9008)
            ]
        )
        before = self.stay.charges.count()
        response = self.client.post(
            self.bill_url,
            {**self.extra, "quantity": 9999, "unitPriceMinor": 100000000},
            format="json",
        )
        self.assertEqual(response.status_code, 409)
        self.assertEqual(self.stay.charges.count(), before)

    def test_unconfigured_legacy_stay_has_empty_bill(self):
        from api.models import OperationalStayStatus

        self.stay.operational_status = OperationalStayStatus.CHECKED_IN
        self.stay.room = self.room
        self.stay.save()
        bill = self.client.get(self.bill_url)
        self.assertEqual(bill.status_code, 200)
        self.assertEqual(bill.data["items"], [])
        self.assertIsNone(bill.data["roomNights"])
        self.assertIsNone(bill.data["nightlyRateMinor"])

    def test_public_rate_range_includes_occupied_but_excludes_inactive_rooms(self):
        from api.models import Room
        from api.check_in import build_check_in_context

        self.configure_and_check_in()
        Room.objects.create(
            property=self.property, number="102", nightly_rate_minor=100000
        )
        Room.objects.create(
            property=self.property, number="103", nightly_rate_minor=1, is_active=False
        )
        Room.objects.create(property=self.property, number="104")
        details = build_check_in_context(qr_token=self.qr_token, guest=None)[
            "property"
        ]["details"]
        self.assertEqual(
            (details["nightlyRateFromMinor"], details["nightlyRateToMinor"]),
            (100000, 200000),
        )
        self.assertEqual(
            set(details),
            {
                "address",
                "contactPhone",
                "description",
                "amenities",
                "checkInTime",
                "checkOutTime",
                "currency",
                "nightlyRateFromMinor",
                "nightlyRateToMinor",
            },
        )

    def test_cross_property_and_guest_cannot_mutate_or_read_hotel_bill(self):
        from api.models import Property, Membership

        other = Property.objects.create(
            organization=self.organization, name="Other", slug="other"
        )
        Membership.objects.filter(user=self.owner).update(has_all_properties=False)
        self.assertEqual(self.client.get(self.bill_url).status_code, 404)
        Membership.objects.filter(user=self.owner).update(has_all_properties=True)
        other_url = self.bill_url.replace(self.property.slug, other.slug)
        self.assertEqual(self.client.get(other_url).status_code, 404)
        self.assertEqual(
            self.client.post(other_url, self.extra, format="json").status_code, 404
        )

    def test_void_requires_reason_and_preserves_author_audit(self):
        from api.models import StayCharge

        self.configure_and_check_in()
        self.authenticate(self.reception)
        response = self.client.post(self.bill_url, self.extra, format="json")
        item = response.data["items"][1]
        endpoint = f"{self.bill_url}{item['id']}/void/"
        for body in (
            {},
            {"reason": " "},
            {"reason": "x" * 501},
            {"reason": "Wrong", "quantity": 0},
        ):
            self.assertEqual(
                self.client.post(endpoint, body, format="json").status_code, 400
            )
        self.authenticate(self.owner)
        self.assertEqual(
            self.client.post(
                endpoint, {"reason": "Cancelled"}, format="json"
            ).status_code,
            200,
        )
        charge = StayCharge.objects.get(public_id=item["id"])
        self.assertEqual(charge.created_by, self.reception)
        self.assertEqual(charge.voided_by, self.owner)
        self.assertIsNotNone(charge.voided_at)
        original_voided_at = charge.voided_at
        self.client.post(endpoint, {"reason": "Cancelled"}, format="json")
        charge.refresh_from_db()
        self.assertEqual(charge.voided_at, original_voided_at)

    def test_checkin_charge_failure_rolls_back_room_and_stay(self):
        from unittest.mock import patch
        from django.db import IntegrityError
        from api.models import StayCharge, RoomStatus, OperationalStayStatus

        with patch.object(
            StayCharge.objects,
            "create",
            side_effect=IntegrityError("charge write failed"),
        ):
            response = self.client.post(
                self.check_in_url, {"roomId": self.room.id, "nights": 2}, format="json"
            )
        self.assertEqual(response.status_code, 409)
        self.room.refresh_from_db()
        self.stay.refresh_from_db()
        self.assertEqual(self.room.status, RoomStatus.VACANT)
        self.assertEqual(
            self.stay.operational_status, OperationalStayStatus.PENDING_CHECK_IN
        )
        self.assertIsNone(self.stay.nightly_rate_minor)
        self.assertEqual(self.stay.charges.count(), 0)

    def test_details_and_rate_validate_ranges_unknown_fields_and_phone(self):
        for data in (
            {"checkInTime": "24:00"},
            {"checkOutTime": "9:00"},
            {"contactPhone": "abc"},
            {"amenities": ["x"] * 31},
            {"currency": "USD"},
            {"address": "x" * 1001},
        ):
            self.assertEqual(
                self.client.patch(
                    f"{self.base}/details/", data, format="json"
                ).status_code,
                400,
            )
        for data in (
            {"nightlyRateMinor": -1},
            {"nightlyRateMinor": 100000001},
            {"nightlyRateMinor": 2.5},
            {"nightlyRateMinor": 10, "roomType": "Suite"},
        ):
            self.assertEqual(
                self.client.patch(
                    f"{self.base}/rooms/{self.room.id}/rate/", data, format="json"
                ).status_code,
                400,
            )
        for nights in (0, 366, 1.5):
            self.assertEqual(
                self.client.post(
                    self.check_in_url,
                    {"roomId": self.room.id, "nights": nights},
                    format="json",
                ).status_code,
                400,
            )

    def test_bill_read_refreshes_snapshot_after_concurrent_check_in(self):
        from unittest.mock import patch
        from django.shortcuts import get_object_or_404
        from api.models import Stay
        from api.hotel_operations import confirm_hotel_check_in

        def check_in_after_lookup(*args, **kwargs):
            result = get_object_or_404(*args, **kwargs)
            if isinstance(result, Stay):
                confirm_hotel_check_in(
                    property_=self.property,
                    stay=self.stay,
                    room_id=self.room.pk,
                    actor=self.owner,
                    nights=2,
                )
            return result

        with patch(
            "api.billing_views.get_object_or_404", side_effect=check_in_after_lookup
        ):
            response = self.client.get(self.bill_url)
        self.assertEqual(response.data["roomNights"], 2)
        self.assertEqual(response.data["totalMinor"], 400000)
