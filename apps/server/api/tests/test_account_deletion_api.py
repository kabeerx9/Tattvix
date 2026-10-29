from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser,
    CompanionProfile,
    GuestProfile,
    HotelQrToken,
    HotelReferralCode,
    IdentityDocument,
    IdentityDocumentImage,
    IdentityDocumentImageSide,
    IdentityDocumentType,
    Membership,
    MembershipRole,
    Organization,
    PlatformRole,
    PlatformRoleAssignment,
    Property,
    Stay,
    StayStatus,
)

STORAGE = "api.views.PrivateObjectStorage"
CLERK_CLIENT = "api.account_deletion.get_clerk_client"
CAPTURE_MESSAGE = "api.account_deletion.sentry_sdk.capture_message"
VERIFY_WEBHOOK = "api.views.verify_clerk_webhook"


class AccountDeletionFixtures:
    def setUp(self):
        self.user = ClerkUser.objects.create(
            clerk_id="user_to_delete",
            email="leaving@example.com",
            first_name="Lea",
            last_name="Ving",
            username="leaving",
            image_url="https://img.example.com/lea.png",
            public_metadata={"plan": "free"},
            raw_data={"id": "user_to_delete"},
        )
        GuestProfile.objects.create(user=self.user, legal_first_name="Lea", phone_number="+911234567890")
        self.companion = CompanionProfile.objects.create(user=self.user, legal_first_name="Kid")
        own_document = IdentityDocument.objects.create(
            user=self.user, document_type=IdentityDocumentType.PASSPORT, document_number="P123"
        )
        IdentityDocumentImage.objects.create(
            document=own_document, side=IdentityDocumentImageSide.FRONT,
            object_key="users/1/own/front.jpg", content_type="image/jpeg", content_length=10,
            pending_object_key="users/1/own/front-pending.jpg",
        )
        companion_document = IdentityDocument.objects.create(
            user=self.user, companion=self.companion,
            document_type=IdentityDocumentType.AADHAAR, document_number="123456789012",
        )
        IdentityDocumentImage.objects.create(
            document=companion_document, side=IdentityDocumentImageSide.BACK,
            object_key="users/1/companion/back.jpg", content_type="image/jpeg", content_length=10,
        )
        self.expected_keys = {
            "users/1/own/front.jpg", "users/1/own/front-pending.jpg", "users/1/companion/back.jpg",
        }

        self.org = Organization.objects.create(name="Lodge", slug="lodge")
        self.property = Property.objects.create(organization=self.org, name="Main", slug="main")
        self.owner = ClerkUser.objects.create(clerk_id="user_owner", email="owner@example.com")
        Membership.objects.create(user=self.owner, organization=self.org, role=MembershipRole.OWNER, has_all_properties=True)
        self.staff_membership = Membership.objects.create(
            user=self.user, organization=self.org, role=MembershipRole.RECEPTION, has_all_properties=True
        )
        qr = HotelQrToken.objects.create(
            property=self.property, token_digest="q" * 64, token_hint="qr",
            created_by=self.owner, expires_at=timezone.now() + timedelta(days=1),
        )
        self.stay = Stay.objects.create(
            property=self.property, qr_token=qr, guest=self.user,
            status=StayStatus.SUBMITTED, submitted_at=timezone.now(),
        )
        self.auth(self.user)

    def auth(self, user):
        self.client.force_authenticate(user=SimpleNamespace(is_authenticated=True, db_user=user))

    def delete(self):
        return self.client.delete(reverse("me"))

    def assert_untouched(self):
        self.user.refresh_from_db()
        self.assertIsNone(self.user.deleted_at)
        self.assertEqual(self.user.email, "leaving@example.com")
        self.assertEqual(self.user.clerk_id, "user_to_delete")
        self.assertTrue(GuestProfile.objects.filter(user=self.user).exists())
        self.assertEqual(CompanionProfile.objects.filter(user=self.user).count(), 1)
        self.assertEqual(IdentityDocument.objects.filter(user=self.user).count(), 2)
        self.assertEqual(IdentityDocumentImage.objects.filter(document__user=self.user).count(), 2)

    def assert_purged(self):
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.deleted_at)
        self.assertEqual(self.user.clerk_id, f"deleted:{self.user.id}")
        for field in ("email", "first_name", "last_name", "username", "image_url"):
            self.assertEqual(getattr(self.user, field), "", field)
        for field in ("public_metadata", "private_metadata", "unsafe_metadata", "raw_data"):
            self.assertEqual(getattr(self.user, field), {}, field)
        self.assertFalse(GuestProfile.objects.filter(user=self.user).exists())
        self.assertFalse(CompanionProfile.objects.filter(user=self.user).exists())
        self.assertFalse(IdentityDocument.objects.filter(user=self.user).exists())
        self.assertFalse(IdentityDocumentImage.objects.filter(document__user=self.user).exists())
        self.stay.refresh_from_db()
        self.assertEqual(self.stay.guest_id, self.user.id)


class AccountDeletionApiTests(AccountDeletionFixtures, APITestCase):
    @patch(CLERK_CLIENT)
    @patch(STORAGE)
    def test_delete_purges_own_data_anonymises_user_and_keeps_stay(self, storage_class, clerk_client):
        storage = storage_class.return_value
        PlatformRoleAssignment.objects.create(user=self.user, role=PlatformRole.SUPER_ADMIN)
        HotelReferralCode.objects.create(owner=self.user, code="LEA123")

        response = self.delete()

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assert_purged()
        deleted_keys = {call.kwargs["object_key"] for call in storage.delete_object.call_args_list}
        self.assertEqual(deleted_keys, self.expected_keys)
        self.staff_membership.refresh_from_db()
        self.assertFalse(self.staff_membership.is_active)
        self.assertFalse(PlatformRoleAssignment.objects.filter(user=self.user).exists())
        self.assertFalse(HotelReferralCode.objects.filter(owner=self.user).exists())
        clerk_client.return_value.users.delete.assert_called_once()
        self.assertEqual(clerk_client.return_value.users.delete.call_args.kwargs["user_id"], "user_to_delete")
        # The owner's membership on the same hotel is untouched.
        self.assertTrue(Membership.objects.get(user=self.owner).is_active)

    @patch(CLERK_CLIENT)
    @patch(STORAGE)
    def test_active_owner_is_refused_and_nothing_changes(self, storage_class, clerk_client):
        self.staff_membership.role = MembershipRole.OWNER
        self.staff_membership.save()

        response = self.delete()

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "owner_has_hotel")
        self.assertIn("Contact support", response.data["error"])
        storage_class.return_value.delete_object.assert_not_called()
        clerk_client.return_value.users.delete.assert_not_called()
        self.assert_untouched()

    @patch(CLERK_CLIENT)
    @patch(STORAGE)
    def test_former_owner_of_deactivated_hotel_can_delete(self, storage_class, clerk_client):
        self.staff_membership.role = MembershipRole.OWNER
        self.staff_membership.save()
        self.org.is_active = False
        self.org.save()

        self.assertEqual(self.delete().status_code, status.HTTP_204_NO_CONTENT)
        self.assert_purged()

    @patch(CLERK_CLIENT)
    @patch(STORAGE)
    def test_storage_failure_returns_503_and_changes_nothing(self, storage_class, clerk_client):
        storage_class.return_value.delete_object.side_effect = [None, RuntimeError("boom")]

        response = self.delete()

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["code"], "storage_unavailable")
        clerk_client.return_value.users.delete.assert_not_called()
        self.assert_untouched()

    @patch(CAPTURE_MESSAGE)
    @patch(CLERK_CLIENT)
    @patch(STORAGE)
    def test_clerk_api_failure_still_succeeds_and_reports_to_sentry(self, storage_class, clerk_client, capture_message):
        clerk_client.return_value.users.delete.side_effect = RuntimeError("clerk down")

        response = self.delete()

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assert_purged()
        capture_message.assert_called_once()
        self.assertNotIn("leaving", str(capture_message.call_args))

    @patch(CAPTURE_MESSAGE)
    @patch(CLERK_CLIENT)
    @patch(STORAGE)
    def test_clerk_not_found_is_success_without_sentry(self, storage_class, clerk_client, capture_message):
        clerk_client.return_value.users.delete.side_effect = Mock(
            side_effect=type("Gone", (Exception,), {"status_code": 404})("gone")
        )

        self.assertEqual(self.delete().status_code, status.HTTP_204_NO_CONTENT)
        capture_message.assert_not_called()

    @patch(CLERK_CLIENT)
    @patch(STORAGE)
    def test_second_call_is_a_no_op(self, storage_class, clerk_client):
        self.assertEqual(self.delete().status_code, status.HTTP_204_NO_CONTENT)
        self.user.refresh_from_db()
        deleted_at = self.user.deleted_at
        storage_class.return_value.delete_object.reset_mock()
        clerk_client.return_value.users.delete.reset_mock()

        self.assertEqual(self.delete().status_code, status.HTTP_204_NO_CONTENT)

        self.user.refresh_from_db()
        self.assertEqual(self.user.deleted_at, deleted_at)
        storage_class.return_value.delete_object.assert_not_called()
        clerk_client.return_value.users.delete.assert_not_called()

    @patch("api.user_sync._fetch_clerk_user", return_value=None)
    @patch("api.authentication.authenticate_headers")
    @patch(CLERK_CLIENT)
    @patch(STORAGE)
    def test_old_token_no_longer_reaches_the_deleted_account(self, storage_class, clerk_client, authenticate_headers, _fetch):
        self.assertEqual(self.delete().status_code, status.HTTP_204_NO_CONTENT)
        self.client.force_authenticate(user=None)
        authenticate_headers.return_value = SimpleNamespace(
            is_signed_in=True, payload={"sub": "user_to_delete", "email": "leaving@example.com"}, message=None
        )

        response = self.client.get(reverse("me"), HTTP_AUTHORIZATION="Bearer stale")

        # A still-valid Clerk session resolves to a brand-new, empty user,
        # never to the anonymised row or its stay.
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotEqual(response.data["id"], self.user.id)
        self.assertEqual(response.data["memberships"], [])
        self.assertEqual(Stay.objects.filter(guest_id=response.data["id"]).count(), 0)

        authenticate_headers.return_value = SimpleNamespace(
            is_signed_in=True, payload={"sub": f"deleted:{self.user.id}"}, message=None
        )
        forged = self.client.get(reverse("me"), HTTP_AUTHORIZATION="Bearer forged")
        # ClerkAuthentication sets no WWW-Authenticate header, so DRF reports 403.
        self.assertEqual(forged.status_code, status.HTTP_403_FORBIDDEN)


class ClerkUserDeletedWebhookTests(AccountDeletionFixtures, APITestCase):
    url = reverse("clerk-webhook")

    def post_event(self, clerk_id):
        with patch(VERIFY_WEBHOOK, return_value={"type": "user.deleted", "id": "evt_1", "data": {"id": clerk_id, "deleted": True}}):
            return self.client.post(self.url, {}, format="json")

    @patch(CLERK_CLIENT)
    @patch(STORAGE)
    def test_user_deleted_event_purges_without_calling_clerk(self, storage_class, clerk_client):
        self.client.force_authenticate(user=None)

        response = self.post_event("user_to_delete")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_purged()
        self.assertEqual(
            {call.kwargs["object_key"] for call in storage_class.return_value.delete_object.call_args_list},
            self.expected_keys,
        )
        clerk_client.return_value.users.delete.assert_not_called()

    @patch(CAPTURE_MESSAGE)
    @patch(STORAGE)
    def test_user_deleted_event_keeps_owner_membership_and_reports(self, storage_class, capture_message):
        self.staff_membership.role = MembershipRole.OWNER
        self.staff_membership.save()
        self.client.force_authenticate(user=None)

        self.assertEqual(self.post_event("user_to_delete").status_code, status.HTTP_200_OK)

        self.assert_purged()
        self.staff_membership.refresh_from_db()
        self.assertTrue(self.staff_membership.is_active)
        capture_message.assert_called_once()
        self.assertNotIn("leaving", str(capture_message.call_args))

    @patch(STORAGE)
    def test_unknown_user_is_a_no_op(self, storage_class):
        self.client.force_authenticate(user=None)

        response = self.post_event("user_never_seen")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        storage_class.return_value.delete_object.assert_not_called()
        self.assertFalse(ClerkUser.objects.filter(clerk_id="user_never_seen").exists())
        self.assert_untouched()

    @patch(STORAGE)
    def test_storage_failure_returns_500_so_svix_retries(self, storage_class):
        storage_class.return_value.delete_object.side_effect = RuntimeError("boom")
        self.client.force_authenticate(user=None)

        response = self.post_event("user_to_delete")

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assert_untouched()
