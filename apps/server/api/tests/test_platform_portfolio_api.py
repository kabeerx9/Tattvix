import json
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser,
    GuestProfile,
    HotelQrToken,
    HotelRegistrationRequest,
    HotelRegistrationStatus,
    IdentityDocumentImageSide,
    Membership,
    MembershipRole,
    OperationalStayStatus,
    Organization,
    PlatformRole,
    PlatformRoleAssignment,
    Property,
    PropertyPhoto,
    Room,
    RoomStatus,
    SharedIdentityDocumentImage,
    SharedIdentitySnapshot,
    Stay,
    StayCharge,
    StayStatus,
)

SECRET_DOCUMENT_NUMBER = "P9988776Z"
SECRET_GUEST_NAME = "Kabeerlegal"
SECRET_OBJECT_KEY = "private/identity-documents/super-secret-front.jpg"


class PlatformPortfolioApiTestCase(APITestCase):
    def setUp(self):
        self.admin = ClerkUser.objects.create(clerk_id="admin", email="admin@example.com")
        PlatformRoleAssignment.objects.create(user=self.admin, role=PlatformRole.SUPER_ADMIN)

        self.org1 = Organization.objects.create(name="Tattwix Hotels", slug="tattwix-hotels")
        self.jaipur = Property.objects.create(
            organization=self.org1, name="Jaipur", slug="jaipur", address="MI Road, Jaipur"
        )
        self.org2 = Organization.objects.create(name="Other Stays", slug="other-stays")
        self.goa = Property.objects.create(organization=self.org2, name="Goa", slug="goa")

        self.owner1 = ClerkUser.objects.create(clerk_id="owner1", email="owner1@example.com")
        Membership.objects.create(
            user=self.owner1, organization=self.org1, role=MembershipRole.OWNER,
            has_all_properties=True,
        )
        self.guest = ClerkUser.objects.create(
            clerk_id="guest", email="secret-guest@example.com",
            first_name=SECRET_GUEST_NAME,
        )
        GuestProfile.objects.create(user=self.guest, legal_first_name=SECRET_GUEST_NAME)

        self.token1 = HotelQrToken.objects.create(
            property=self.jaipur, token_digest="a" * 64, token_hint="jaipur",
            created_by=self.owner1, expires_at=timezone.now() + timedelta(days=30),
        )
        self.token2 = HotelQrToken.objects.create(
            property=self.goa, token_digest="b" * 64, token_hint="goa",
            created_by=self.owner1, expires_at=timezone.now() + timedelta(days=30),
        )

        # Jaipur: 2 deluxe (4000, 6000), 1 suite (12000), 1 unpriced, 1 inactive.
        self.deluxe_101 = Room.objects.create(
            property=self.jaipur, number="101", room_type="Deluxe",
            nightly_rate_minor=400000, status=RoomStatus.OCCUPIED,
        )
        Room.objects.create(
            property=self.jaipur, number="102", room_type="Deluxe",
            nightly_rate_minor=600000, status=RoomStatus.VACANT,
        )
        Room.objects.create(
            property=self.jaipur, number="201", room_type="Suite",
            nightly_rate_minor=1200000, status=RoomStatus.CLEANING,
        )
        Room.objects.create(
            property=self.jaipur, number="301", room_type="", status=RoomStatus.MAINTENANCE,
        )
        Room.objects.create(
            property=self.jaipur, number="999", room_type="Suite",
            nightly_rate_minor=9900000, is_active=False,
        )

        now = timezone.now()
        self._stay(self.jaipur, self.token1, StayStatus.DRAFT)
        self._stay(self.jaipur, self.token1, StayStatus.SUBMITTED)
        self.in_house = self._stay(
            self.jaipur, self.token1, StayStatus.SUBMITTED,
            operational_status=OperationalStayStatus.CHECKED_IN,
            checked_in_at=now - timedelta(days=2), room=self.deluxe_101,
        )
        old = self._stay(
            self.jaipur, self.token1, StayStatus.CLOSED,
            operational_status=OperationalStayStatus.CHECKED_OUT,
            checked_in_at=now - timedelta(days=20), checked_out_at=now - timedelta(days=18),
        )
        StayCharge.objects.create(
            stay=self.in_house, kind=StayCharge.Kind.ROOM, description="Room",
            quantity=2, unit_price_minor=400000, created_by=self.owner1,
        )
        StayCharge.objects.create(
            stay=self.in_house, kind=StayCharge.Kind.EXTRA, description="Tea",
            quantity=3, unit_price_minor=5000, created_by=self.owner1,
        )
        StayCharge.objects.create(
            stay=self.in_house, kind=StayCharge.Kind.EXTRA, description="Voided",
            quantity=1, unit_price_minor=99999, created_by=self.owner1,
            voided_at=now, voided_by=self.owner1, void_reason="Mistake",
        )
        stale = StayCharge.objects.create(
            stay=old, kind=StayCharge.Kind.ROOM, description="Room",
            quantity=2, unit_price_minor=300000, created_by=self.owner1,
        )
        StayCharge.objects.filter(id=stale.id).update(created_at=now - timedelta(days=40))

        snapshot = SharedIdentitySnapshot.objects.create(
            stay=self.in_house,
            guest_data={"legalFirstName": SECRET_GUEST_NAME},
            companion_data=[],
            document_data={"documentNumber": SECRET_DOCUMENT_NUMBER},
        )
        SharedIdentityDocumentImage.objects.create(
            snapshot=snapshot, side=IdentityDocumentImageSide.FRONT,
            object_key=SECRET_OBJECT_KEY, content_type="image/jpeg", content_length=1,
        )

        PropertyPhoto.objects.create(
            property=self.jaipur, kind=PropertyPhoto.Kind.COVER, object_key="photos/cover.jpg"
        )
        PropertyPhoto.objects.create(
            property=self.jaipur, kind=PropertyPhoto.Kind.ROOM_TYPE, room_type="Deluxe",
            object_key="photos/deluxe.jpg",
        )
        HotelRegistrationRequest.objects.create(
            applicant=self.owner1, hotel_name="Jaipur", address="MI Road", contact_phone="1",
            status=HotelRegistrationStatus.APPROVED, reviewer=self.admin, reviewed_at=now,
            organization=self.org1, property=self.jaipur,
        )

        self.storage = Mock()
        self.storage.create_download_url.side_effect = (
            lambda **kw: f"https://storage.example/{kw['object_key']}"
        )
        storage_patch = patch(
            "api.platform_portfolio.PrivateObjectStorage", return_value=self.storage
        )
        storage_patch.start()
        self.addCleanup(storage_patch.stop)

    def _stay(self, property_, token, status, operational_status=OperationalStayStatus.PENDING_CHECK_IN,
              checked_in_at=None, checked_out_at=None, room=None):
        return Stay.objects.create(
            property=property_, guest=self.guest, qr_token=token, status=status,
            operational_status=operational_status, room=room,
            submitted_at=None if status == StayStatus.DRAFT else timezone.now(),
            checked_in_at=checked_in_at, checked_out_at=checked_out_at,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=SimpleNamespace(is_authenticated=True, db_user=user))

    def url(self, **params):
        base = reverse("platform-portfolio")
        if params:
            base += "?" + "&".join(f"{key}={value}" for key, value in params.items())
        return base

    def property_payload(self, response, slug):
        return next(item for item in response.json()["properties"] if item["slug"] == slug)


class PlatformPortfolioAuthzTests(PlatformPortfolioApiTestCase):
    def test_unauthenticated_request_is_rejected(self):
        self.assertIn(self.client.get(self.url()).status_code, (401, 403))

    def test_hotel_owner_gets_403_even_for_own_organization(self):
        self.authenticate(self.owner1)
        self.assertEqual(self.client.get(self.url()).status_code, 403)
        self.assertEqual(
            self.client.get(self.url(organization=self.org1.slug)).status_code, 403
        )
        self.assertEqual(
            self.client.get(self.url(organization=self.org2.slug)).status_code, 403
        )

    def test_guest_gets_403(self):
        self.authenticate(self.guest)
        self.assertEqual(self.client.get(self.url()).status_code, 403)

    def test_endpoint_is_read_only(self):
        self.authenticate(self.admin)
        self.assertEqual(self.client.post(self.url(), {}, format="json").status_code, 405)

    def test_invalid_organization_filter_is_400(self):
        self.authenticate(self.admin)
        self.assertEqual(self.client.get(self.url(organization="Not Valid")).status_code, 400)


class PlatformPortfolioDataTests(PlatformPortfolioApiTestCase):
    def test_lists_every_property_across_organizations(self):
        self.authenticate(self.admin)
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [item["slug"] for item in response.json()["properties"]], ["goa", "jaipur"]
        )

    def test_organization_filter_scopes_properties(self):
        self.authenticate(self.admin)
        response = self.client.get(self.url(organization=self.org1.slug))
        self.assertEqual([item["slug"] for item in response.json()["properties"]], ["jaipur"])
        missing = self.client.get(self.url(organization="nobody"))
        self.assertEqual(missing.json()["properties"], [])

    def test_rooms_rates_and_room_types(self):
        self.authenticate(self.admin)
        jaipur = self.property_payload(self.client.get(self.url()), "jaipur")
        self.assertEqual(
            jaipur["rooms"],
            {"total": 4, "occupied": 1, "ready": 1, "cleaning": 1, "maintenance": 1},
        )
        self.assertEqual(
            jaipur["rates"], {"minMinor": 400000, "avgMinor": 733333, "maxMinor": 1200000}
        )
        types = {item["name"]: item for item in jaipur["roomTypes"]}
        self.assertEqual([item["name"] for item in jaipur["roomTypes"]], ["Deluxe", "Suite", ""])
        self.assertEqual(types["Deluxe"]["rooms"]["total"], 2)
        self.assertEqual(types["Deluxe"]["rooms"]["occupied"], 1)
        self.assertEqual(
            types["Deluxe"]["rates"], {"minMinor": 400000, "avgMinor": 500000, "maxMinor": 600000}
        )
        self.assertEqual(types["Deluxe"]["photoUrl"], "https://storage.example/photos/deluxe.jpg")
        self.assertIsNone(types["Suite"]["photoUrl"])
        self.assertEqual(types[""]["rates"], {"minMinor": None, "avgMinor": None, "maxMinor": None})
        self.assertEqual(jaipur["coverPhotoUrl"], "https://storage.example/photos/cover.jpg")

    def test_stays_occupancy_and_revenue(self):
        self.authenticate(self.admin)
        jaipur = self.property_payload(self.client.get(self.url()), "jaipur")
        self.assertEqual(
            jaipur["stays"], {"inHouse": 1, "arrivalsPending": 1, "checkInsLast7Days": 1}
        )
        # In-house stay checked in two days ago covers three of the last 7 nights.
        self.assertEqual(jaipur["occupancy"]["recentOccupiedRoomNights"], 3)
        self.assertEqual(jaipur["occupancy"]["recentAvailableRoomNights"], 28)
        # 2 x 4000 room + 3 x 50 tea; voided and 40-day-old charges excluded.
        self.assertEqual(jaipur["revenueLast30DaysMinor"], 815000)
        self.assertIsNotNone(jaipur["lastActivityAt"])

    def test_onboarding_and_setup_status(self):
        self.authenticate(self.admin)
        response = self.client.get(self.url())
        jaipur = self.property_payload(response, "jaipur")
        goa = self.property_payload(response, "goa")
        self.assertEqual(jaipur["onboarding"]["source"], "REQUEST")
        self.assertEqual(goa["onboarding"]["source"], "ADMIN")
        self.assertEqual(
            jaipur["setup"],
            {"hasAddress": True, "hasCoverPhoto": True, "hasRooms": True, "hasRates": True},
        )
        self.assertEqual(
            goa["setup"],
            {"hasAddress": False, "hasCoverPhoto": False, "hasRooms": False, "hasRates": False},
        )
        self.assertEqual(jaipur["organization"]["activeMemberCount"], 1)
        self.assertEqual(goa["rooms"]["total"], 0)
        self.assertEqual(goa["rates"]["avgMinor"], None)
        self.assertEqual(goa["revenueLast30DaysMinor"], 0)
        self.assertIsNone(goa["lastActivityAt"])

    def test_photo_storage_failure_falls_back_to_placeholders(self):
        self.storage.create_download_url.side_effect = RuntimeError("bucket down")
        self.authenticate(self.admin)
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(self.property_payload(response, "jaipur")["coverPhotoUrl"])

    def test_never_exposes_guest_identity(self):
        self.authenticate(self.admin)
        body = json.dumps(self.client.get(self.url()).json())
        for secret in (
            SECRET_DOCUMENT_NUMBER, SECRET_GUEST_NAME, SECRET_OBJECT_KEY,
            self.guest.email, str(self.in_house.public_id),
        ):
            self.assertNotIn(secret, body)

    def test_query_count_does_not_grow_with_properties(self):
        self.authenticate(self.admin)
        with CaptureQueriesContext(connection) as baseline:
            self.client.get(self.url())
        for index in range(4):
            property_ = Property.objects.create(
                organization=self.org2, name=f"Extra {index}", slug=f"extra-{index}"
            )
            Room.objects.create(
                property=property_, number="1", room_type="Std", nightly_rate_minor=1000
            )
            PropertyPhoto.objects.create(
                property=property_, kind=PropertyPhoto.Kind.COVER,
                object_key=f"photos/extra-{index}.jpg",
            )
        with CaptureQueriesContext(connection) as grown:
            response = self.client.get(self.url())
        self.assertEqual(len(response.json()["properties"]), 6)
        self.assertEqual(len(grown), len(baseline))

class PlatformPortfolioContactTests(PlatformPortfolioApiTestCase):
    def test_multiple_owners_have_names_and_do_not_leak_across_organizations(self):
        user = ClerkUser.objects.create(clerk_id="second-owner", email="second@example.com", first_name="Second", last_name="Owner")
        Membership.objects.create(user=user, organization=self.org1, role=MembershipRole.OWNER)
        self.authenticate(self.admin)
        response = self.client.get(self.url(includeContacts="true", organization=self.org1.slug))
        contacts = self.property_payload(response, "jaipur")["contacts"]
        self.assertEqual(contacts["owners"], [
            {"name": "", "email": "owner1@example.com"},
            {"name": "Second Owner", "email": "second@example.com"},
        ])
        self.assertEqual(len(response.json()["properties"]), 1)
        legacy = self.client.get(self.url(includeContacts="false"))
        self.assertNotIn("contacts", self.property_payload(legacy, "jaipur"))

    def test_contacts_are_opt_in_and_only_include_active_owners(self):
        self.jaipur.contact_phone = "+919876543210"
        self.jaipur.save(update_fields=["contact_phone"])
        for role, active in [(MembershipRole.OWNER, False), (MembershipRole.MANAGER, True)]:
            user = ClerkUser.objects.create(clerk_id=f"extra-{role}", email=f"{role}@example.com")
            Membership.objects.create(user=user, organization=self.org1, role=role, is_active=active)
        self.authenticate(self.admin)
        legacy = self.property_payload(self.client.get(self.url()), "jaipur")
        self.assertNotIn("contacts", legacy)
        response = self.client.get(self.url(includeContacts="true"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.property_payload(response, "jaipur")["contacts"], {
            "phone": "+919876543210",
            "owners": [{"name": "", "email": "owner1@example.com"}],
        })
        self.assertEqual(self.property_payload(response, "goa")["contacts"], {"phone": "", "owners": []})
        self.assertNotIn(self.guest.email, json.dumps(response.json()))

    def test_contacts_still_require_platform_admin(self):
        self.authenticate(self.owner1)
        self.assertEqual(self.client.get(self.url(includeContacts="true")).status_code, 403)

    def test_contacts_query_count_is_constant(self):
        self.authenticate(self.admin)
        with CaptureQueriesContext(connection) as baseline:
            self.client.get(self.url(includeContacts="true"))
        for i in range(3):
            org = Organization.objects.create(name=f"Contact {i}", slug=f"contact-{i}")
            Property.objects.create(organization=org, name="Hotel", slug="hotel")
            Membership.objects.create(user=self.owner1, organization=org, role=MembershipRole.OWNER)
        with CaptureQueriesContext(connection) as grown:
            self.client.get(self.url(includeContacts="true"))
        self.assertEqual(len(grown), len(baseline))
