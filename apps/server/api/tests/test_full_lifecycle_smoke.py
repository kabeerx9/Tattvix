"""End-to-end smoke test for the full guest lifecycle.

One ordered scenario that walks every seam of the product: a platform admin
onboards a hotel, the owner sets up a room and a QR check-in token, a guest
scans it, fills their profile/companion/identity document, consents to
share, the hotel assigns a room and checks them in, then checks them out —
and finally the post-checkout access grace window is proven to actually
expire. This is not meant to duplicate the edge-case coverage already in
test_check_in_api.py / test_hotel_operations_api.py / etc.; it exists to
break loudly the moment any one of those seams stops fitting together.
"""

from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.conf import settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser,
    ConsentGrant,
    IdentityAccessAction,
    IdentityAccessAudit,
    IdentityDocument,
    IdentityDocumentImage,
    IdentityDocumentImageSide,
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
)


class FullLifecycleSmokeTest(APITestCase):
    """QR -> profile/companion/identity -> consent -> check-in -> checkout.

    Each `_step_*` helper is a checkpoint: if the scenario breaks, the
    failing helper name tells you which seam of the product broke.
    """

    def authenticate(self, user):
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=user)
        )

    def test_full_guest_lifecycle_from_qr_to_checkout(self):
        self._step1_platform_admin_onboards_hotel()
        self._step2_owner_creates_room_and_qr_token()
        self._step3_guest_resolves_qr_context()
        self._step4_guest_completes_profile_companion_and_identity()
        self._step5_guest_submits_consent()
        self._step6_hotel_sees_and_checks_in_the_stay()
        self._step7_hotel_checks_out_the_stay()
        self._step8_access_refuses_after_simulated_expiry()
        self._step9_guest_stay_list_shows_final_checked_out_status()

    # -- 1. Platform admin onboards an organization + property + owner ----

    def _step1_platform_admin_onboards_hotel(self):
        self.platform_admin = ClerkUser.objects.create(
            clerk_id="smoke_platform_admin",
            email="platform-admin@example.com",
        )
        PlatformRoleAssignment.objects.create(
            user=self.platform_admin,
            role=PlatformRole.SUPER_ADMIN,
        )
        self.owner = ClerkUser.objects.create(
            clerk_id="smoke_owner",
            email="owner@example.com",
            first_name="Hotel",
            last_name="Owner",
        )
        self.authenticate(self.platform_admin)

        response = self.client.post(
            reverse("platform-organization-list"),
            {
                "organization": {
                    "name": "Smoke Hotels",
                    "slug": "smoke-hotels",
                },
                "property": {
                    "name": "Smoke Jaipur",
                    "slug": "jaipur",
                },
                "ownerEmail": self.owner.email,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.organization = Organization.objects.get(slug="smoke-hotels")
        self.property = Property.objects.get(organization=self.organization)
        self.assertTrue(
            Membership.objects.filter(
                organization=self.organization,
                user=self.owner,
                role=MembershipRole.OWNER,
                has_all_properties=True,
            ).exists()
        )

    # -- 2. Owner creates a room and generates a hotel QR token -----------

    def _step2_owner_creates_room_and_qr_token(self):
        self.authenticate(self.owner)

        room_response = self.client.post(
            reverse(
                "hotel-room-list",
                args=[self.organization.slug, self.property.slug],
            ),
            {"number": "101", "floor": "1", "roomType": "Deluxe"},
            format="json",
        )
        self.assertEqual(room_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(room_response.data["status"], RoomStatus.VACANT)
        self.room = Room.objects.get(id=room_response.data["id"])

        token_response = self.client.post(
            reverse(
                "hotel-check-in-token-create",
                args=[self.organization.slug, self.property.slug],
            ),
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_201_CREATED)
        self.raw_token = token_response.data["token"]
        self.assertTrue(token_response.data["checkInPath"].startswith("/check-in/"))

    # -- 3. Guest resolves the public QR context (AllowAny) ---------------

    def _step3_guest_resolves_qr_context(self):
        self.guest = ClerkUser.objects.create(
            clerk_id="smoke_guest",
            email="guest@example.com",
        )
        self.client.force_authenticate(user=None)

        context_response = self.client.get(
            reverse("check-in-context", args=[self.raw_token])
        )

        self.assertEqual(context_response.status_code, status.HTTP_200_OK)
        self.assertEqual(context_response.data["property"]["name"], "Smoke Jaipur")
        self.assertIsNone(context_response.data["existingStay"])

    # -- 4. Guest completes profile, a companion, and identity document ---

    def _step4_guest_completes_profile_companion_and_identity(self):
        self.authenticate(self.guest)

        profile_response = self.client.put(
            reverse("guest-profile"),
            {
                "legalFirstName": "Kabeer",
                "legalLastName": "Joshi",
                "phoneNumber": "+919876543210",
                "dateOfBirth": "1995-04-12",
                "nationality": "in",
                "addressLine1": "12 Example Road",
                "addressLine2": "",
                "city": "Kotdwar",
                "stateRegion": "Uttarakhand",
                "postalCode": "246149",
                "country": "in",
                "emergencyContactName": "",
                "emergencyContactPhone": "",
            },
            format="json",
        )
        self.assertEqual(profile_response.status_code, status.HTTP_200_OK)

        companion_response = self.client.post(
            reverse("guest-companion-list"),
            {
                "legalFirstName": "Aisha",
                "legalLastName": "Khan",
                "dateOfBirth": self._years_ago(30).isoformat(),
                "relationship": "Spouse",
                "nationality": "in",
            },
            format="json",
        )
        self.assertEqual(companion_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(companion_response.data["readiness"]["isReady"])
        self.companion_id = companion_response.data["id"]

        document_response = self.client.post(
            reverse("guest-identity-document-list"),
            {
                "documentType": "AADHAAR",
                "documentNumber": "1234-5678-9012",
                "nameOnDocument": "Kabeer Joshi",
                "issuingCountry": "in",
                "expiryDate": None,
            },
            format="json",
        )
        self.assertEqual(document_response.status_code, status.HTTP_201_CREATED)
        self.document = IdentityDocument.objects.get(id=document_response.data["id"])

        # Attaching the actual document images goes through a presigned
        # upload against real object storage, which is out of scope for an
        # API-level smoke test (see report). Same shortcut as
        # test_check_in_api.py's setUp: create the ready image rows
        # directly instead of exercising the upload/finalize endpoints.
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

    # -- 5. Guest submits/consents -----------------------------------------

    def _step5_guest_submits_consent(self):
        self.authenticate(self.guest)

        with patch("api.check_in_views.PrivateObjectStorage"):
            submit_response = self.client.post(
                reverse("guest-check-in-submit", args=[self.raw_token]),
                {
                    "identityDocumentId": self.document.id,
                    "companionIds": [self.companion_id],
                    "consentAccepted": True,
                },
                format="json",
            )

        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        self.stay = Stay.objects.get(public_id=submit_response.data["id"])
        self.assertEqual(self.stay.status, StayStatus.SUBMITTED)
        self.assertTrue(
            SharedIdentitySnapshot.objects.filter(stay=self.stay).exists()
        )
        # The consent grant is the audit record of the guest's share.
        self.assertTrue(ConsentGrant.objects.filter(stay=self.stay).exists())

    # -- 6. Hotel sees the stay, assigns a room, confirms check-in --------

    def _step6_hotel_sees_and_checks_in_the_stay(self):
        self.authenticate(self.owner)

        list_response = self.client.get(
            reverse(
                "hotel-stay-list",
                args=[self.organization.slug, self.property.slug],
            )
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [s["id"] for s in list_response.data["stays"]],
            [str(self.stay.public_id)],
        )

        detail_response = self.client.get(
            reverse(
                "hotel-stay-detail",
                args=[
                    self.organization.slug,
                    self.property.slug,
                    self.stay.public_id,
                ],
            )
        )
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertTrue(detail_response.data["identityAccess"]["isActive"])
        self.assertEqual(
            detail_response.data["snapshot"]["document"]["documentNumber"],
            "1234-5678-9012",
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

        self.assertEqual(check_in_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            check_in_response.data["operationalStatus"],
            OperationalStayStatus.CHECKED_IN,
        )
        self.assertIsNotNone(check_in_response.data["checkedInAt"])
        self.room.refresh_from_db()
        self.stay.refresh_from_db()
        self.assertEqual(self.room.status, RoomStatus.OCCUPIED)
        self.assertEqual(self.stay.operational_status, OperationalStayStatus.CHECKED_IN)
        self.assertIsNotNone(self.stay.checked_in_at)

    # -- 7. Hotel checks out ------------------------------------------------

    def _step7_hotel_checks_out_the_stay(self):
        self.authenticate(self.owner)
        before_checkout = timezone.now()

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

        self.assertEqual(checkout_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            checkout_response.data["operationalStatus"],
            OperationalStayStatus.CHECKED_OUT,
        )
        self.room.refresh_from_db()
        self.stay.refresh_from_db()
        self.assertEqual(self.room.status, RoomStatus.CLEANING)
        self.assertEqual(self.stay.status, StayStatus.CLOSED)
        self.assertIsNotNone(self.stay.checked_out_at)
        self.assertLessEqual(
            self.stay.hotel_access_expires_at,
            before_checkout
            + timedelta(
                hours=settings.HOTEL_IDENTITY_POST_CLOSE_GRACE_HOURS,
                seconds=5,
            ),
        )
        self.assertTrue(
            IdentityAccessAudit.objects.filter(
                stay=self.stay,
                action=IdentityAccessAction.STAY_CLOSED,
            ).exists()
        )

    # -- 8. After the post-checkout grace window expires, access refuses --

    def _step8_access_refuses_after_simulated_expiry(self):
        self.stay.hotel_access_expires_at = timezone.now() - timedelta(seconds=1)
        self.stay.save(update_fields=["hotel_access_expires_at"])
        self.authenticate(self.owner)

        detail_response = self.client.get(
            reverse(
                "hotel-stay-detail",
                args=[
                    self.organization.slug,
                    self.property.slug,
                    self.stay.public_id,
                ],
            )
        )
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertFalse(detail_response.data["identityAccess"]["isActive"])
        self.assertIsNone(detail_response.data["snapshot"])

        image_response = self.client.post(
            reverse(
                "hotel-stay-image-access",
                args=[
                    self.organization.slug,
                    self.property.slug,
                    self.stay.public_id,
                ],
            ),
            {"side": "FRONT"},
            format="json",
        )
        self.assertEqual(image_response.status_code, status.HTTP_403_FORBIDDEN)

    # -- 9. Guest's own stay list reflects the final state ------------------

    def _step9_guest_stay_list_shows_final_checked_out_status(self):
        self.authenticate(self.guest)

        stay_list_response = self.client.get(reverse("guest-stay-list"))

        self.assertEqual(stay_list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(stay_list_response.data["stays"]), 1)
        share = stay_list_response.data["stays"][0]
        self.assertEqual(share["operationalStatus"], "CHECKED_OUT")
        self.assertEqual(share["room"], {"id": self.room.id, "number": "101"})

    @staticmethod
    def _years_ago(years: int) -> date:
        today = date.today()
        try:
            return today.replace(year=today.year - years)
        except ValueError:
            return today.replace(year=today.year - years, day=28)
