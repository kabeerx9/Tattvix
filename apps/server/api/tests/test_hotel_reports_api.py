from datetime import timedelta
from types import SimpleNamespace

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser,
    HotelQrToken,
    Membership,
    MembershipRole,
    OperationalStayStatus,
    Organization,
    Property,
    Room,
    RoomStatus,
    SharedIdentitySnapshot,
    Stay,
    StayStatus,
)

DOCUMENT_NUMBER_GUEST_ONE = "111122223333"
DOCUMENT_NUMBER_GUEST_TWO = "444455556666"


class HotelReportsApiTests(APITestCase):
    def setUp(self):
        self.organization = Organization.objects.create(
            name="Tattvix Hotels",
            slug="tattvix-hotels-reports",
        )
        self.property = Property.objects.create(
            organization=self.organization,
            name="Tattvix Jaipur",
            slug="jaipur-reports",
        )
        self.other_property = Property.objects.create(
            organization=self.organization,
            name="Tattvix Udaipur",
            slug="udaipur-reports",
        )

        self.owner = ClerkUser.objects.create(
            clerk_id="reports_owner", email="owner@example.com"
        )
        Membership.objects.create(
            user=self.owner,
            organization=self.organization,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )
        self.manager = ClerkUser.objects.create(
            clerk_id="reports_manager", email="manager@example.com"
        )
        Membership.objects.create(
            user=self.manager,
            organization=self.organization,
            role=MembershipRole.MANAGER,
            has_all_properties=True,
        )
        self.reception = ClerkUser.objects.create(
            clerk_id="reports_reception", email="reception@example.com"
        )
        Membership.objects.create(
            user=self.reception,
            organization=self.organization,
            role=MembershipRole.RECEPTION,
            has_all_properties=True,
        )

        self.qr_token = HotelQrToken.objects.create(
            property=self.property,
            token_digest="b" * 64,
            token_hint="reports-tok",
            created_by=self.owner,
            expires_at=timezone.now() + timedelta(days=30),
        )

        self.room_occupied = Room.objects.create(
            property=self.property, number="101", status=RoomStatus.OCCUPIED
        )
        self.room_cleaning = Room.objects.create(
            property=self.property, number="102", status=RoomStatus.CLEANING
        )
        self.room_vacant = Room.objects.create(
            property=self.property, number="103", status=RoomStatus.VACANT
        )
        self.room_maintenance = Room.objects.create(
            property=self.property, number="104", status=RoomStatus.MAINTENANCE
        )

        now = timezone.now()
        today_morning = now.replace(hour=9, minute=0, second=0, microsecond=0)
        two_days_ago = now - timedelta(days=2)
        yesterday = now - timedelta(days=1)

        # Guest 1: checked in today, still in-house.
        self.guest_one = self._make_stay(
            clerk_id="reports_guest_one",
            email="guest.one@example.com",
            first_name="Amara",
            last_name="Singh",
            document_number=DOCUMENT_NUMBER_GUEST_ONE,
            operational_status=OperationalStayStatus.CHECKED_IN,
            room=self.room_occupied,
            checked_in_at=today_morning,
            checked_out_at=None,
        )

        # Guest 2: checked in two days ago, checked out *today* — must show
        # up in today's register/status-counts purely because of checkout,
        # even though check-in is outside the range.
        self.guest_two = self._make_stay(
            clerk_id="reports_guest_two",
            email="guest.two@example.com",
            first_name="Devraj",
            last_name="Rao",
            document_number=DOCUMENT_NUMBER_GUEST_TWO,
            operational_status=OperationalStayStatus.CHECKED_OUT,
            room=self.room_cleaning,
            checked_in_at=two_days_ago,
            checked_out_at=today_morning,
        )

        # Guest 3: both events yesterday — entirely outside today's range.
        self.guest_three = self._make_stay(
            clerk_id="reports_guest_three",
            email="guest.three@example.com",
            first_name="Priya",
            last_name="Nair",
            document_number="000011112222",
            operational_status=OperationalStayStatus.CHECKED_OUT,
            room=None,
            checked_in_at=yesterday,
            checked_out_at=yesterday,
        )

        # Guest 4: checked in today, but at the *other* property — must
        # never leak into property-scoped reports.
        other_qr_token = HotelQrToken.objects.create(
            property=self.other_property,
            token_digest="c" * 64,
            token_hint="reports-tk2",
            created_by=self.owner,
            expires_at=timezone.now() + timedelta(days=30),
        )
        other_room = Room.objects.create(
            property=self.other_property, number="201", status=RoomStatus.OCCUPIED
        )
        self.guest_other_property = self._make_stay(
            clerk_id="reports_guest_other_property",
            email="guest.other@example.com",
            first_name="Other",
            last_name="Property",
            document_number="333322221111",
            operational_status=OperationalStayStatus.CHECKED_IN,
            room=other_room,
            checked_in_at=today_morning,
            checked_out_at=None,
            property_=self.other_property,
            qr_token=other_qr_token,
        )

    def _make_stay(
        self,
        *,
        clerk_id,
        email,
        first_name,
        last_name,
        document_number,
        operational_status,
        room,
        checked_in_at,
        checked_out_at,
        property_=None,
        qr_token=None,
    ):
        guest = ClerkUser.objects.create(clerk_id=clerk_id, email=email)
        stay = Stay.objects.create(
            property=property_ or self.property,
            guest=guest,
            qr_token=qr_token or self.qr_token,
            status=StayStatus.SUBMITTED,
            operational_status=operational_status,
            room=room,
            submitted_at=checked_in_at or timezone.now(),
            checked_in_at=checked_in_at,
            checked_out_at=checked_out_at,
            hotel_access_expires_at=timezone.now() + timedelta(days=30),
        )
        SharedIdentitySnapshot.objects.create(
            stay=stay,
            guest_data={"legalFirstName": first_name, "legalLastName": last_name},
            companion_data=[{"legalFirstName": "Companion"}],
            document_data={
                "documentType": "AADHAAR",
                "documentNumber": document_number,
                "nameOnDocument": f"{first_name} {last_name}",
                "issuingCountry": "IN",
                "expiryDate": None,
            },
        )
        return stay

    def authenticate(self, user):
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=user)
        )

    def _url(self, name, **extra):
        return reverse(
            name, args=[self.organization.slug, self.property.slug], **extra
        )

    # --- RBAC ---

    def test_reception_is_404d_out_of_every_report(self):
        self.authenticate(self.reception)

        for name in (
            "hotel-report-register",
            "hotel-report-in-house",
            "hotel-report-occupancy",
            "hotel-report-status-counts",
        ):
            response = self.client.get(self._url(name))
            self.assertEqual(
                response.status_code,
                status.HTTP_404_NOT_FOUND,
                msg=f"{name} should 404 for reception",
            )

        csv_response = self.client.get(self._url("hotel-report-register"), {"export": "csv"})
        self.assertEqual(csv_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_and_manager_can_view_every_report(self):
        for user in (self.owner, self.manager):
            self.authenticate(user)
            for name in (
                "hotel-report-register",
                "hotel-report-in-house",
                "hotel-report-occupancy",
                "hotel-report-status-counts",
            ):
                response = self.client.get(self._url(name))
                self.assertEqual(
                    response.status_code,
                    status.HTTP_200_OK,
                    msg=f"{name} should succeed for {user.email}",
                )

    # --- Register ---

    def test_register_defaults_to_today_and_includes_checkout_only_stays(self):
        self.authenticate(self.owner)
        response = self.client.get(self._url("hotel-report-register"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stay_ids = {entry["stayId"] for entry in response.data["entries"]}
        self.assertIn(str(self.guest_one.public_id), stay_ids)
        self.assertIn(str(self.guest_two.public_id), stay_ids)
        self.assertNotIn(str(self.guest_three.public_id), stay_ids)
        self.assertNotIn(str(self.guest_other_property.public_id), stay_ids)

        entry_two = next(
            entry
            for entry in response.data["entries"]
            if entry["stayId"] == str(self.guest_two.public_id)
        )
        self.assertEqual(entry_two["guestName"], "Devraj Rao")
        self.assertEqual(entry_two["roomNumber"], "102")
        self.assertEqual(entry_two["operationalStatus"], OperationalStayStatus.CHECKED_OUT)
        self.assertIsNotNone(entry_two["checkedOutAt"])

    def test_register_respects_explicit_date_range(self):
        self.authenticate(self.owner)
        yesterday = (timezone.now() - timedelta(days=1)).date().isoformat()

        response = self.client.get(
            self._url("hotel-report-register"),
            {"dateFrom": yesterday, "dateTo": yesterday},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stay_ids = {entry["stayId"] for entry in response.data["entries"]}
        self.assertEqual(stay_ids, {str(self.guest_three.public_id)})

    # --- CSV ---

    def test_register_csv_has_correct_content_type_header_and_no_document_numbers(self):
        self.authenticate(self.owner)
        response = self.client.get(
            self._url("hotel-report-register"), {"export": "csv"}
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        self.assertIn("attachment;", response["Content-Disposition"])

        body = response.content.decode("utf-8")
        lines = body.splitlines()
        self.assertEqual(
            lines[0],
            "Guest name,Companions,Room,Checked in at,Checked out at,Status",
        )
        self.assertIn("Amara Singh", body)
        self.assertIn("Devraj Rao", body)

        # Never document numbers or other identity data.
        self.assertNotIn(DOCUMENT_NUMBER_GUEST_ONE, body)
        self.assertNotIn(DOCUMENT_NUMBER_GUEST_TWO, body)
        self.assertNotIn("AADHAAR", body)

    # --- In-house ---

    def test_in_house_lists_only_currently_checked_in_stays(self):
        self.authenticate(self.owner)
        response = self.client.get(self._url("hotel-report-in-house"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        entries = response.data["entries"]
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]["stayId"], str(self.guest_one.public_id))
        self.assertEqual(entries[0]["roomNumber"], "101")

    # --- Occupancy ---

    def test_occupancy_counts_active_rooms_by_status(self):
        self.authenticate(self.owner)
        response = self.client.get(self._url("hotel-report-occupancy"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["activeRooms"], 4)
        self.assertEqual(response.data["occupiedRooms"], 1)
        self.assertEqual(
            response.data["statusCounts"],
            {
                "VACANT": 1,
                "OCCUPIED": 1,
                "CLEANING": 1,
                "MAINTENANCE": 1,
            },
        )

    def test_occupancy_ignores_inactive_rooms(self):
        Room.objects.create(
            property=self.property,
            number="105",
            status=RoomStatus.VACANT,
            is_active=False,
        )
        self.authenticate(self.owner)
        response = self.client.get(self._url("hotel-report-occupancy"))

        self.assertEqual(response.data["activeRooms"], 4)

    # --- Status counts ---

    def test_status_counts_match_register_date_range(self):
        self.authenticate(self.owner)
        response = self.client.get(self._url("hotel-report-status-counts"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["counts"],
            {"pendingCheckIn": 0, "checkedIn": 1, "checkedOut": 1},
        )

    def test_date_from_after_date_to_is_rejected(self):
        self.authenticate(self.owner)
        today = timezone.localdate().isoformat()
        yesterday = (timezone.now() - timedelta(days=1)).date().isoformat()

        response = self.client.get(
            self._url("hotel-report-register"),
            {"dateFrom": today, "dateTo": yesterday},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
