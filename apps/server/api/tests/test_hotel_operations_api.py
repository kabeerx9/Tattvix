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


class HotelOperationsApiTests(APITestCase):
    def setUp(self):
        self.organization = Organization.objects.create(
            name="Tattvix Hotels",
            slug="tattvix-hotels",
        )
        self.property = Property.objects.create(
            organization=self.organization,
            name="Tattvix Jaipur",
            slug="jaipur",
        )
        self.owner = ClerkUser.objects.create(
            clerk_id="operations_owner",
            email="owner@example.com",
        )
        Membership.objects.create(
            user=self.owner,
            organization=self.organization,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )
        self.reception = ClerkUser.objects.create(
            clerk_id="operations_reception",
            email="reception@example.com",
        )
        Membership.objects.create(
            user=self.reception,
            organization=self.organization,
            role=MembershipRole.RECEPTION,
            has_all_properties=True,
        )
        self.guest = ClerkUser.objects.create(
            clerk_id="operations_guest",
            email="guest@example.com",
        )
        self.qr_token = HotelQrToken.objects.create(
            property=self.property,
            token_digest="a" * 64,
            token_hint="operations",
            created_by=self.owner,
            expires_at=timezone.now() + timedelta(days=30),
        )
        self.stay = Stay.objects.create(
            property=self.property,
            guest=self.guest,
            qr_token=self.qr_token,
            status=StayStatus.SUBMITTED,
            submitted_at=timezone.now(),
            hotel_access_expires_at=timezone.now() + timedelta(days=30),
        )
        SharedIdentitySnapshot.objects.create(
            stay=self.stay,
            guest_data={
                "legalFirstName": "Kabeer",
                "legalLastName": "Joshi",
            },
            companion_data=[],
            document_data={"documentType": "AADHAAR"},
        )
        self.room = Room.objects.create(
            property=self.property,
            number="101",
            floor="1",
            room_type="Deluxe",
        )

    def authenticate(self, user):
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=user)
        )

    def test_owner_can_create_and_list_property_rooms(self):
        self.authenticate(self.owner)

        create_response = self.client.post(
            reverse(
                "hotel-room-list",
                args=[self.organization.slug, self.property.slug],
            ),
            {"number": "102", "floor": "1", "roomType": "Standard"},
            format="json",
        )
        list_response = self.client.get(
            reverse(
                "hotel-room-list",
                args=[self.organization.slug, self.property.slug],
            )
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data["status"], RoomStatus.VACANT)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [room["number"] for room in list_response.data["rooms"]],
            ["101", "102"],
        )

    def test_reception_cannot_create_rooms_but_can_assign_one(self):
        self.authenticate(self.reception)
        create_response = self.client.post(
            reverse(
                "hotel-room-list",
                args=[self.organization.slug, self.property.slug],
            ),
            {"number": "102"},
            format="json",
        )

        check_in_response = self.client.post(
            reverse(
                "hotel-stay-check-in",
                args=[
                    self.organization.slug,
                    self.property.slug,
                    self.stay.public_id,
                ],
            ),
            {"roomId": self.room.id},
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(check_in_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            check_in_response.data["operationalStatus"],
            OperationalStayStatus.CHECKED_IN,
        )
        self.assertEqual(check_in_response.data["room"]["number"], "101")
        self.room.refresh_from_db()
        self.assertEqual(self.room.status, RoomStatus.OCCUPIED)

    def test_an_occupied_room_cannot_be_assigned_to_another_stay(self):
        self.authenticate(self.owner)
        first_response = self.client.post(
            reverse(
                "hotel-stay-check-in",
                args=[
                    self.organization.slug,
                    self.property.slug,
                    self.stay.public_id,
                ],
            ),
            {"roomId": self.room.id},
            format="json",
        )
        second_guest = ClerkUser.objects.create(
            clerk_id="second_guest",
            email="second@example.com",
        )
        second_stay = Stay.objects.create(
            property=self.property,
            guest=second_guest,
            qr_token=self.qr_token,
            status=StayStatus.SUBMITTED,
            submitted_at=timezone.now(),
            hotel_access_expires_at=timezone.now() + timedelta(days=30),
        )
        SharedIdentitySnapshot.objects.create(
            stay=second_stay,
            guest_data={
                "legalFirstName": "Second",
                "legalLastName": "Guest",
            },
            companion_data=[],
            document_data={"documentType": "PASSPORT"},
        )

        second_response = self.client.post(
            reverse(
                "hotel-stay-check-in",
                args=[
                    self.organization.slug,
                    self.property.slug,
                    second_stay.public_id,
                ],
            ),
            {"roomId": self.room.id},
            format="json",
        )

        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(second_response.data["code"], "room_unavailable")

    def test_current_guests_and_checkout_follow_operational_lifecycle(self):
        self.authenticate(self.owner)
        self.client.post(
            reverse(
                "hotel-stay-check-in",
                args=[
                    self.organization.slug,
                    self.property.slug,
                    self.stay.public_id,
                ],
            ),
            {"roomId": self.room.id},
            format="json",
        )

        current_response = self.client.get(
            reverse(
                "hotel-guest-list",
                args=[self.organization.slug, self.property.slug],
            )
        )
        checkout_response = self.client.post(
            reverse(
                "hotel-stay-checkout",
                args=[
                    self.organization.slug,
                    self.property.slug,
                    self.stay.public_id,
                ],
            ),
            format="json",
        )
        history_response = self.client.get(
            reverse(
                "hotel-guest-list",
                args=[self.organization.slug, self.property.slug],
            )
        )

        self.assertEqual(len(current_response.data["current"]), 1)
        self.assertEqual(current_response.data["current"][0]["room"]["number"], "101")
        self.assertEqual(checkout_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            checkout_response.data["operationalStatus"],
            OperationalStayStatus.CHECKED_OUT,
        )
        self.assertEqual(len(history_response.data["current"]), 0)
        self.assertEqual(len(history_response.data["history"]), 1)
        self.room.refresh_from_db()
        self.stay.refresh_from_db()
        self.assertEqual(self.room.status, RoomStatus.CLEANING)
        self.assertEqual(self.stay.status, StayStatus.CLOSED)
        self.assertIsNotNone(self.stay.checked_out_at)

    def test_cleaning_room_can_be_marked_vacant_for_the_next_guest(self):
        self.room.status = RoomStatus.CLEANING
        self.room.save(update_fields=["status"])
        self.authenticate(self.owner)

        response = self.client.patch(
            reverse(
                "hotel-room-status",
                args=[
                    self.organization.slug,
                    self.property.slug,
                    self.room.id,
                ],
            ),
            {"status": RoomStatus.VACANT},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], RoomStatus.VACANT)
