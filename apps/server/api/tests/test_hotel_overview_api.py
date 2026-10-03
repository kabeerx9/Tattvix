from datetime import date, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser, HotelQrToken, Membership, MembershipPropertyAccess,
    MembershipRole, OperationalStayStatus, Organization, Property,
    Room, Stay, StayCharge, StayStatus,
)


class HotelOverviewApiTests(APITestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Overview", slug="overview")
        self.property = Property.objects.create(
            organization=self.organization, name="Jaipur", slug="jaipur"
        )
        self.other_property = Property.objects.create(
            organization=self.organization, name="Udaipur", slug="udaipur"
        )
        self.owner = self._user("owner")
        self.manager = self._user("manager")
        self.reception = self._user("reception")
        for user, role in [(self.owner, MembershipRole.OWNER),
                           (self.manager, MembershipRole.MANAGER),
                           (self.reception, MembershipRole.RECEPTION)]:
            membership = Membership.objects.create(
                user=user, organization=self.organization, role=role,
                has_all_properties=user != self.reception,
            )
            if user == self.reception:
                MembershipPropertyAccess.objects.create(
                    membership=membership, property=self.property
                )
        self.room = Room.objects.create(property=self.property, number="101")
        Room.objects.create(property=self.property, number="102", is_active=False)
        Room.objects.create(property=self.other_property, number="201")
        self.qr = HotelQrToken.objects.create(
            property=self.property, token_digest="e" * 64, token_hint="overview",
            created_by=self.owner, expires_at=timezone.now() + timedelta(days=30),
        )
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=self.owner)
        )

    def _user(self, name):
        return ClerkUser.objects.create(clerk_id=f"overview_{name}", email=f"{name}@example.com")

    def _at(self, day):
        return timezone.make_aware(datetime(2026, 10, day, 14))

    def _stay(self, checkout=None):
        return Stay.objects.create(
            property=self.property, guest=self._user("guest"), qr_token=self.qr,
            status=StayStatus.SUBMITTED,
            operational_status=(OperationalStayStatus.CHECKED_OUT if checkout
                                else OperationalStayStatus.CHECKED_IN),
            room=self.room, checked_in_at=self._at(1),
            checked_out_at=self._at(checkout) if checkout else None,
        )

    def _get(self, params=None, property_=None):
        target = property_ or self.property
        with patch("django.utils.timezone.localdate", return_value=date(2026, 10, 3)):
            return self.client.get(reverse("hotel-overview-summary", args=[
                target.organization.slug, target.slug,
            ]), params or {})

    def test_reception_sees_occupancy_without_revenue(self):
        self.client.force_authenticate(user=SimpleNamespace(
            is_authenticated=True, db_user=self.reception,
        ))
        response = self._get()
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["revenue"])
        self.assertEqual(len(response.data["occupancy"]), 7)
        self.assertEqual(response.data["activeRooms"], 1)
        self.assertEqual(self._get(property_=self.other_property).status_code, 404)

    def test_owner_sees_revenue(self):
        response = self._get()
        self.assertEqual(reverse("hotel-overview-summary", args=[
            self.organization.slug, self.property.slug,
        ]), "/api/hotel/overview/jaipur/overview/")
        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data["revenue"], dict)
        self.assertEqual(len(response.data["revenue"]["byDay"]), 7)
        self.assertEqual(response.data["dateFrom"], "2026-09-27")
        self.assertEqual(response.data["dateTo"], "2026-10-03")
        self.assertEqual(response.data["revenue"]["totalMinor"], 0)

    def test_manager_sees_revenue(self):
        self.client.force_authenticate(user=SimpleNamespace(
            is_authenticated=True, db_user=self.manager,
        ))
        self.assertIsInstance(self._get().data["revenue"], dict)

    def test_other_property_is_404(self):
        organization = Organization.objects.create(name="Other", slug="other")
        property_ = Property.objects.create(organization=organization, name="Other", slug="other")
        self.assertEqual(self._get(property_=property_).status_code, 404)

    def test_occupancy_excludes_checkout_day(self):
        self._stay(checkout=3)
        response = self._get({"days": 3})
        self.assertEqual(response.data["occupancy"], [
            {"date": "2026-10-01", "occupiedRooms": 1},
            {"date": "2026-10-02", "occupiedRooms": 1},
            {"date": "2026-10-03", "occupiedRooms": 0},
        ])

    def test_revenue_excludes_voided_and_spreads_room_nights(self):
        stay = self._stay()
        StayCharge.objects.create(
            stay=stay, kind=StayCharge.Kind.ROOM, description="Room", quantity=2,
            unit_price_minor=350000, created_by=self.owner,
        )
        extra = StayCharge.objects.create(
            stay=stay, kind=StayCharge.Kind.EXTRA, description="Breakfast", quantity=2,
            unit_price_minor=15000, created_by=self.owner,
        )
        voided = StayCharge.objects.create(
            stay=stay, kind=StayCharge.Kind.EXTRA, description="Voided", quantity=1,
            unit_price_minor=99999, created_by=self.owner,
            voided_at=self._at(2), voided_by=self.owner, void_reason="Mistake",
        )
        StayCharge.objects.filter(id__in=[extra.id, voided.id]).update(created_at=self._at(2))
        self.assertEqual(self._get({"days": 3}).data["revenue"], {
            "totalMinor": 730000,
            "byDay": [
                {"date": "2026-10-01", "amountMinor": 350000},
                {"date": "2026-10-02", "amountMinor": 380000},
                {"date": "2026-10-03", "amountMinor": 0},
            ],
        })

    def test_days_parameter_is_validated(self):
        for days in ["0", "32", "tomorrow", "1.5"]:
            self.assertEqual(self._get({"days": days}).status_code, 400)
        self.assertEqual(len(self._get().data["occupancy"]), 7)
        self.assertEqual(len(self._get({"days": 1}).data["occupancy"]), 1)
        self.assertEqual(len(self._get({"days": 31}).data["occupancy"]), 31)

    def test_unauthenticated_access_is_denied(self):
        self.client.force_authenticate(user=None)
        self.assertIn(self._get().status_code, [401, 403])

    def test_dates_use_local_midnight(self):
        stay = self._stay()
        # 18:45 UTC on the 1st is 00:15 on the 2nd in the server's India zone.
        from datetime import timezone as datetime_timezone
        Stay.objects.filter(id=stay.id).update(
            checked_in_at=datetime(2026, 10, 1, 18, 45, tzinfo=datetime_timezone.utc)
        )
        with timezone.override("Asia/Kolkata"):
            self.assertEqual(self._get({"days": 3}).data["occupancy"], [
                {"date": "2026-10-01", "occupiedRooms": 0},
                {"date": "2026-10-02", "occupiedRooms": 1},
                {"date": "2026-10-03", "occupiedRooms": 1},
            ])
