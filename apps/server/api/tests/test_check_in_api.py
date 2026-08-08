from datetime import date, timedelta
from io import StringIO
from types import SimpleNamespace
from unittest.mock import patch

from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.check_in import generate_hotel_qr_token
from api.models import (
    ClerkUser,
    ConsentGrant,
    GuestProfile,
    HotelQrToken,
    IdentityAccessAction,
    IdentityAccessAudit,
    IdentityDocument,
    IdentityDocumentImage,
    IdentityDocumentImageSide,
    IdentityDocumentType,
    Membership,
    MembershipRole,
    OperationalStayStatus,
    Organization,
    Property,
    Room,
    SharedIdentitySnapshot,
    Stay,
    StayStatus,
)


class CheckInApiTests(APITestCase):
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
            clerk_id="hotel_owner",
            email="owner@example.com",
        )
        Membership.objects.create(
            user=self.owner,
            organization=self.organization,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )
        self.guest = ClerkUser.objects.create(
            clerk_id="hotel_guest",
            email="guest@example.com",
        )
        self.profile = GuestProfile.objects.create(
            user=self.guest,
            legal_first_name="Kabeer",
            legal_last_name="Joshi",
            phone_number="+919876543210",
            date_of_birth=date(1995, 4, 12),
            nationality="IN",
            address_line_1="12 Example Road",
            city="Kotdwar",
            state_region="Uttarakhand",
            postal_code="246149",
            country="IN",
        )
        self.document = IdentityDocument.objects.create(
            user=self.guest,
            document_type=IdentityDocumentType.AADHAAR,
            document_number="1234-5678-9012",
            name_on_document="Kabeer Joshi",
            issuing_country="IN",
        )
        for side in (
            IdentityDocumentImageSide.FRONT,
            IdentityDocumentImageSide.BACK,
        ):
            IdentityDocumentImage.objects.create(
                document=self.document,
                side=side,
                object_key=(
                    f"users/{self.guest.id}/identity-documents/"
                    f"{self.document.id}/{side.lower()}/image.jpg"
                ),
                content_type="image/jpeg",
                content_length=2048,
            )

        token_payload = generate_hotel_qr_token(
            property_=self.property,
            actor=self.owner,
        )
        self.raw_token = token_payload["token"]
        self.qr_token = HotelQrToken.objects.get()

    def authenticate(self, user):
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=user)
        )

    def submission_url(self):
        return reverse("guest-check-in-submit", args=[self.raw_token])

    def submit_identity(self):
        self.authenticate(self.guest)
        with patch("api.check_in_views.PrivateObjectStorage") as storage_class:
            response = self.client.post(
                self.submission_url(),
                {
                    "identityDocumentId": self.document.id,
                    "companionIds": [],
                    "consentAccepted": True,
                },
                format="json",
            )
        return response, storage_class

    def test_public_context_exposes_property_but_not_private_identity(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(
            reverse("check-in-context", args=[self.raw_token])
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["property"]["name"], "Tattvix Jaipur")
        self.assertEqual(
            response.data["accessPolicy"],
            {"maximumDays": 30, "postCheckoutGraceHours": 24},
        )
        self.assertIsNone(response.data["existingStay"])
        self.assertNotIn("guest", response.data)

    def test_expired_or_revoked_qr_is_rejected_cleanly(self):
        self.qr_token.expires_at = timezone.now() - timedelta(seconds=1)
        self.qr_token.save(update_fields=["expires_at"])

        response = self.client.get(
            reverse("check-in-context", args=[self.raw_token])
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data["code"], "invalid_qr")

    def test_hotel_owner_can_generate_a_hashed_property_qr_token(self):
        self.authenticate(self.owner)
        response = self.client.post(
            reverse(
                "hotel-check-in-token-create",
                args=[self.organization.slug, self.property.slug],
            ),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = HotelQrToken.objects.get(token_hint=response.data["token"][:12])
        self.assertNotEqual(created.token_digest, response.data["token"])
        self.assertTrue(response.data["checkInPath"].startswith("/check-in/"))
        self.qr_token.refresh_from_db()
        self.assertIsNotNone(self.qr_token.revoked_at)

    def test_unassigned_user_cannot_generate_a_property_qr(self):
        self.authenticate(self.guest)
        response = self.client.post(
            reverse(
                "hotel-check-in-token-create",
                args=[self.organization.slug, self.property.slug],
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_submission_copies_images_and_creates_immutable_snapshot(self):
        response, storage_class = self.submit_identity()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        stay = Stay.objects.get()
        self.assertEqual(stay.status, StayStatus.SUBMITTED)
        self.assertTrue(ConsentGrant.objects.filter(stay=stay).exists())
        snapshot = SharedIdentitySnapshot.objects.get(stay=stay)
        self.assertEqual(snapshot.guest_data["city"], "Kotdwar")
        self.assertEqual(
            snapshot.document_data["documentNumber"],
            "1234-5678-9012",
        )
        self.assertEqual(snapshot.document_images.count(), 2)
        self.assertEqual(storage_class.return_value.copy_object.call_count, 2)
        copied_keys = {
            call.kwargs["destination_key"]
            for call in storage_class.return_value.copy_object.call_args_list
        }
        self.assertTrue(
            all(key.startswith(f"stays/{stay.public_id}/") for key in copied_keys)
        )

        self.profile.city = "Dehradun"
        self.profile.save(update_fields=["city"])
        self.document.document_number = "UPDATED"
        self.document.save(update_fields=["document_number"])
        snapshot.refresh_from_db()
        self.assertEqual(snapshot.guest_data["city"], "Kotdwar")
        self.assertEqual(
            snapshot.document_data["documentNumber"],
            "1234-5678-9012",
        )

    def test_submission_is_idempotent_for_an_active_qr_and_guest(self):
        first_response, _storage_class = self.submit_identity()
        second_response, _storage_class = self.submit_identity()

        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(first_response.data["id"], second_response.data["id"])
        self.assertEqual(Stay.objects.count(), 1)
        self.assertEqual(ConsentGrant.objects.count(), 1)

    def test_incomplete_profile_cannot_be_shared(self):
        self.profile.city = ""
        self.profile.save(update_fields=["city"])

        response, storage_class = self.submit_identity()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "profile_not_ready")
        self.assertFalse(Stay.objects.exists())
        storage_class.return_value.copy_object.assert_not_called()

    def test_property_staff_can_view_snapshot_and_each_view_is_audited(self):
        response, _storage_class = self.submit_identity()
        stay_id = response.data["id"]
        self.authenticate(self.owner)

        detail_response = self.client.get(
            reverse(
                "hotel-stay-detail",
                args=[self.organization.slug, self.property.slug, stay_id],
            )
        )

        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            detail_response.data["snapshot"]["document"]["documentNumber"],
            "1234-5678-9012",
        )
        self.assertTrue(
            IdentityAccessAudit.objects.filter(
                action=IdentityAccessAction.DETAILS_VIEWED
            ).exists()
        )

        with patch("api.check_in_views.PrivateObjectStorage") as storage_class:
            storage_class.return_value.create_download_url.return_value = (
                "http://127.0.0.1:9000/private/signed"
            )
            image_response = self.client.post(
                reverse(
                    "hotel-stay-image-access",
                    args=[
                        self.organization.slug,
                        self.property.slug,
                        stay_id,
                    ],
                ),
                {"side": "FRONT"},
                format="json",
            )

        self.assertEqual(image_response.status_code, status.HTTP_200_OK)
        self.assertEqual(image_response.data["expiresInSeconds"], 120)
        self.assertTrue(
            IdentityAccessAudit.objects.filter(
                action=IdentityAccessAction.DOCUMENT_VIEWED,
                image_side=IdentityDocumentImageSide.FRONT,
            ).exists()
        )

    def test_cross_property_staff_cannot_read_the_identity_snapshot(self):
        response, _storage_class = self.submit_identity()
        stay_id = response.data["id"]
        other_organization = Organization.objects.create(
            name="Other Hotels",
            slug="other-hotels",
        )
        other_property = Property.objects.create(
            organization=other_organization,
            name="Other Property",
            slug="other",
        )
        Membership.objects.create(
            user=self.owner,
            organization=other_organization,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )
        self.authenticate(self.owner)

        response = self.client.get(
            reverse(
                "hotel-stay-detail",
                args=[other_organization.slug, other_property.slug, stay_id],
            )
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_closing_a_stay_limits_access_to_the_post_close_grace_window(self):
        response, _storage_class = self.submit_identity()
        stay_id = response.data["id"]
        self.authenticate(self.owner)
        before = timezone.now()

        close_response = self.client.post(
            reverse(
                "hotel-stay-close",
                args=[self.organization.slug, self.property.slug, stay_id],
            )
        )

        self.assertEqual(close_response.status_code, status.HTTP_200_OK)
        stay = Stay.objects.get(public_id=stay_id)
        self.assertEqual(stay.status, StayStatus.CLOSED)
        self.assertLessEqual(
            stay.hotel_access_expires_at,
            before + timedelta(hours=24, seconds=5),
        )

    def test_expired_hotel_detail_omits_the_entire_identity_snapshot(self):
        response, _storage_class = self.submit_identity()
        stay = Stay.objects.get(public_id=response.data["id"])
        stay.hotel_access_expires_at = timezone.now() - timedelta(seconds=1)
        stay.save(update_fields=["hotel_access_expires_at"])
        self.authenticate(self.owner)

        detail_response = self.client.get(
            reverse(
                "hotel-stay-detail",
                args=[
                    self.organization.slug,
                    self.property.slug,
                    stay.public_id,
                ],
            )
        )

        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertFalse(detail_response.data["identityAccess"]["isActive"])
        self.assertEqual(
            detail_response.data["identityAccess"]["reason"],
            "EXPIRED",
        )
        self.assertIsNone(detail_response.data["snapshot"])
        self.assertFalse(
            IdentityAccessAudit.objects.filter(
                action=IdentityAccessAction.DETAILS_VIEWED
            ).exists()
        )

    def test_guest_revocation_immediately_blocks_hotel_image_access(self):
        response, _storage_class = self.submit_identity()
        stay_id = response.data["id"]

        revoke_response = self.client.post(
            reverse("guest-stay-revoke", args=[stay_id])
        )
        self.assertEqual(revoke_response.status_code, status.HTTP_200_OK)
        self.assertEqual(revoke_response.data["status"], StayStatus.REVOKED)

        self.authenticate(self.owner)
        image_response = self.client.post(
            reverse(
                "hotel-stay-image-access",
                args=[self.organization.slug, self.property.slug, stay_id],
            ),
            {"side": "FRONT"},
            format="json",
        )
        self.assertEqual(image_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_guest_privacy_history_lists_only_their_shares_and_access_events(self):
        response, _storage_class = self.submit_identity()
        stay = Stay.objects.get(public_id=response.data["id"])
        IdentityAccessAudit.objects.create(
            stay=stay,
            actor=self.owner,
            action=IdentityAccessAction.DOCUMENT_VIEWED,
            image_side=IdentityDocumentImageSide.FRONT,
        )

        history_response = self.client.get(reverse("guest-stay-list"))

        self.assertEqual(history_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history_response.data["stays"]), 1)
        share = history_response.data["stays"][0]
        self.assertEqual(share["property"]["name"], self.property.name)
        self.assertEqual(
            share["accessEvents"][0]["action"],
            IdentityAccessAction.DOCUMENT_VIEWED,
        )
        self.assertNotIn("actor", share["accessEvents"][0])

    def test_guest_stay_list_reports_live_operational_status_and_room(self):
        response, _storage_class = self.submit_identity()
        stay = Stay.objects.get(public_id=response.data["id"])

        # Before check-in: no room, operationally pending.
        pending_response = self.client.get(reverse("guest-stay-list"))
        pending_share = pending_response.data["stays"][0]
        self.assertEqual(pending_share["operationalStatus"], "PENDING_CHECK_IN")
        self.assertIsNone(pending_share["room"])
        self.assertIsNone(pending_share["checkedInAt"])

        room = Room.objects.create(property=self.property, number="101", floor="1")
        stay.operational_status = OperationalStayStatus.CHECKED_IN
        stay.room = room
        stay.checked_in_at = timezone.now()
        stay.save(update_fields=["operational_status", "room", "checked_in_at"])

        checked_in_response = self.client.get(reverse("guest-stay-list"))
        checked_in_share = checked_in_response.data["stays"][0]
        self.assertEqual(checked_in_share["operationalStatus"], "CHECKED_IN")
        self.assertEqual(checked_in_share["room"], {"id": room.id, "number": "101"})
        self.assertIsNotNone(checked_in_share["checkedInAt"])
        # Guests only ever see the room number, never hotel-internal room
        # inventory state such as floor, room type, or housekeeping status.
        self.assertNotIn("floor", checked_in_share["room"])
        self.assertNotIn("roomType", checked_in_share["room"])
        self.assertNotIn("status", checked_in_share["room"])

    def test_guest_stay_list_never_leaks_another_guests_stay(self):
        response, _storage_class = self.submit_identity()
        stay = Stay.objects.get(public_id=response.data["id"])
        room = Room.objects.create(property=self.property, number="202", floor="2")
        stay.operational_status = OperationalStayStatus.CHECKED_IN
        stay.room = room
        stay.checked_in_at = timezone.now()
        stay.save(update_fields=["operational_status", "room", "checked_in_at"])

        other_guest = ClerkUser.objects.create(
            clerk_id="other_guest",
            email="other-guest@example.com",
        )
        self.authenticate(other_guest)

        other_response = self.client.get(reverse("guest-stay-list"))

        self.assertEqual(other_response.status_code, status.HTTP_200_OK)
        self.assertEqual(other_response.data["stays"], [])

    @patch(
        "api.management.commands.purge_expired_identity_images.PrivateObjectStorage"
    )
    def test_expired_shared_images_are_purged_without_deleting_audit_metadata(
        self,
        storage_class,
    ):
        response, _storage_class = self.submit_identity()
        stay = Stay.objects.get(public_id=response.data["id"])
        stay.hotel_access_expires_at = timezone.now() - timedelta(seconds=1)
        stay.save(update_fields=["hotel_access_expires_at"])
        output = StringIO()

        call_command(
            "purge_expired_identity_images",
            batch_size=10,
            stdout=output,
        )

        stay.identity_snapshot.refresh_from_db()
        self.assertEqual(stay.identity_snapshot.document_images.count(), 0)
        self.assertEqual(storage_class.return_value.delete_object.call_count, 2)
        self.assertTrue(SharedIdentitySnapshot.objects.filter(stay=stay).exists())
        self.assertIn("2 deleted", output.getvalue())


class HotelStayListSearchApiTests(APITestCase):
    """Search/filter behavior for GET hotel-stay-list.

    Reception searches by guest name; the domain rule is that this must
    match the immutable shared identity snapshot taken at check-in time,
    never the guest's live, editable profile.
    """

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
        self.other_property = Property.objects.create(
            organization=self.organization,
            name="Tattvix Goa",
            slug="goa",
        )
        self.owner = ClerkUser.objects.create(
            clerk_id="stay_search_owner",
            email="search-owner@example.com",
        )
        Membership.objects.create(
            user=self.owner,
            organization=self.organization,
            role=MembershipRole.OWNER,
            has_all_properties=True,
        )
        self.qr_token = HotelQrToken.objects.create(
            property=self.property,
            token_digest="a" * 64,
            token_hint="jaipur-hint",
            created_by=self.owner,
            expires_at=timezone.now() + timedelta(days=30),
        )
        self.other_qr_token = HotelQrToken.objects.create(
            property=self.other_property,
            token_digest="b" * 64,
            token_hint="goa-hint",
            created_by=self.owner,
            expires_at=timezone.now() + timedelta(days=30),
        )
        self._guest_counter = 0

    def authenticate(self, user):
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=user)
        )

    def list_url(self, property_=None):
        return reverse(
            "hotel-stay-list",
            args=[self.organization.slug, (property_ or self.property).slug],
        )

    def _create_guest(self, first_name, last_name):
        self._guest_counter += 1
        guest = ClerkUser.objects.create(
            clerk_id=f"stay_search_guest_{self._guest_counter}",
            email=f"stay-search-guest-{self._guest_counter}@example.com",
        )
        GuestProfile.objects.create(
            user=guest,
            legal_first_name=first_name,
            legal_last_name=last_name,
            phone_number="+919876543210",
            nationality="IN",
            address_line_1="12 Example Road",
            city="Kotdwar",
            state_region="Uttarakhand",
            postal_code="246149",
            country="IN",
        )
        return guest

    def _create_stay(
        self,
        *,
        property_,
        qr_token,
        guest,
        first_name,
        last_name,
        operational_status=OperationalStayStatus.PENDING_CHECK_IN,
        created_at=None,
    ):
        stay = Stay.objects.create(
            property=property_,
            guest=guest,
            qr_token=qr_token,
            status=StayStatus.SUBMITTED,
            operational_status=operational_status,
            submitted_at=timezone.now(),
            hotel_access_expires_at=timezone.now() + timedelta(days=30),
        )
        SharedIdentitySnapshot.objects.create(
            stay=stay,
            guest_data={
                "legalFirstName": first_name,
                "legalLastName": last_name,
            },
            companion_data=[],
            document_data={"documentType": "AADHAAR"},
        )
        if created_at is not None:
            Stay.objects.filter(id=stay.id).update(created_at=created_at)
            stay.refresh_from_db()
        return stay

    def test_search_matches_first_and_last_name_case_insensitively(self):
        guest = self._create_guest("Kabeer", "Joshi")
        stay = self._create_stay(
            property_=self.property,
            qr_token=self.qr_token,
            guest=guest,
            first_name="Kabeer",
            last_name="Joshi",
        )
        self.authenticate(self.owner)

        first_name_response = self.client.get(self.list_url(), {"search": "kabeer"})
        last_name_response = self.client.get(self.list_url(), {"search": "JOSHI"})

        self.assertEqual(first_name_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [s["id"] for s in first_name_response.data["stays"]],
            [str(stay.public_id)],
        )
        self.assertEqual(
            [s["id"] for s in last_name_response.data["stays"]],
            [str(stay.public_id)],
        )

    def test_search_matches_the_immutable_snapshot_not_the_live_profile(self):
        guest = self._create_guest("Original", "Name")
        stay = self._create_stay(
            property_=self.property,
            qr_token=self.qr_token,
            guest=guest,
            first_name="Original",
            last_name="Name",
        )
        profile = GuestProfile.objects.get(user=guest)
        profile.legal_first_name = "Changed"
        profile.legal_last_name = "Person"
        profile.save(update_fields=["legal_first_name", "legal_last_name"])
        self.authenticate(self.owner)

        snapshot_name_response = self.client.get(
            self.list_url(), {"search": "Original"}
        )
        live_profile_name_response = self.client.get(
            self.list_url(), {"search": "Changed"}
        )

        self.assertEqual(
            [s["id"] for s in snapshot_name_response.data["stays"]],
            [str(stay.public_id)],
        )
        self.assertEqual(live_profile_name_response.data["stays"], [])

    def test_search_rejects_a_single_character_term(self):
        self.authenticate(self.owner)

        response = self.client.get(self.list_url(), {"search": "k"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_operational_status_filter(self):
        pending_guest = self._create_guest("Asha", "Rao")
        checked_in_guest = self._create_guest("Bala", "Rao")
        self._create_stay(
            property_=self.property,
            qr_token=self.qr_token,
            guest=pending_guest,
            first_name="Asha",
            last_name="Rao",
            operational_status=OperationalStayStatus.PENDING_CHECK_IN,
        )
        checked_in_stay = self._create_stay(
            property_=self.property,
            qr_token=self.qr_token,
            guest=checked_in_guest,
            first_name="Bala",
            last_name="Rao",
            operational_status=OperationalStayStatus.CHECKED_IN,
        )
        self.authenticate(self.owner)

        response = self.client.get(
            self.list_url(), {"operationalStatus": "CHECKED_IN"}
        )

        self.assertEqual(
            [s["id"] for s in response.data["stays"]],
            [str(checked_in_stay.public_id)],
        )

    def test_date_range_filter(self):
        now = timezone.now()
        in_range_guest = self._create_guest("Chetan", "Verma")
        out_of_range_guest = self._create_guest("Divya", "Verma")
        in_range_stay = self._create_stay(
            property_=self.property,
            qr_token=self.qr_token,
            guest=in_range_guest,
            first_name="Chetan",
            last_name="Verma",
            created_at=now - timedelta(days=5),
        )
        self._create_stay(
            property_=self.property,
            qr_token=self.qr_token,
            guest=out_of_range_guest,
            first_name="Divya",
            last_name="Verma",
            created_at=now - timedelta(days=40),
        )
        self.authenticate(self.owner)

        response = self.client.get(
            self.list_url(),
            {
                "dateFrom": (now - timedelta(days=10)).date().isoformat(),
                "dateTo": now.date().isoformat(),
            },
        )

        self.assertEqual(
            [s["id"] for s in response.data["stays"]],
            [str(in_range_stay.public_id)],
        )

    def test_search_and_status_filters_combine(self):
        matching_guest = self._create_guest("Esha", "Kapoor")
        wrong_status_guest = self._create_guest("Esha", "Malhotra")
        matching_stay = self._create_stay(
            property_=self.property,
            qr_token=self.qr_token,
            guest=matching_guest,
            first_name="Esha",
            last_name="Kapoor",
            operational_status=OperationalStayStatus.CHECKED_IN,
        )
        self._create_stay(
            property_=self.property,
            qr_token=self.qr_token,
            guest=wrong_status_guest,
            first_name="Esha",
            last_name="Malhotra",
            operational_status=OperationalStayStatus.PENDING_CHECK_IN,
        )
        self.authenticate(self.owner)

        response = self.client.get(
            self.list_url(),
            {"search": "Esha", "operationalStatus": "CHECKED_IN"},
        )

        self.assertEqual(
            [s["id"] for s in response.data["stays"]],
            [str(matching_stay.public_id)],
        )

    def test_another_propertys_matching_stay_never_appears(self):
        own_guest = self._create_guest("Kabeer", "Joshi")
        own_stay = self._create_stay(
            property_=self.property,
            qr_token=self.qr_token,
            guest=own_guest,
            first_name="Kabeer",
            last_name="Joshi",
        )
        other_guest = self._create_guest("Kabeer", "Joshi")
        self._create_stay(
            property_=self.other_property,
            qr_token=self.other_qr_token,
            guest=other_guest,
            first_name="Kabeer",
            last_name="Joshi",
        )
        self.authenticate(self.owner)

        response = self.client.get(self.list_url(), {"search": "Kabeer"})

        self.assertEqual(
            [s["id"] for s in response.data["stays"]],
            [str(own_stay.public_id)],
        )
