from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser,
    GuestProfile,
    IdentityDocument,
    IdentityDocumentImage,
    IdentityDocumentImageSide,
    IdentityDocumentType,
)
from api.object_storage import ObjectMetadata, PresignedUpload


class IdentityDocumentApiTests(APITestCase):
    def setUp(self):
        self.user = ClerkUser.objects.create(
            clerk_id="user_document_owner",
            email="guest@example.com",
        )
        self.other_user = ClerkUser.objects.create(
            clerk_id="user_document_other",
            email="other@example.com",
        )
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=self.user)
        )
        self.collection_url = reverse("guest-identity-document-list")

    def test_list_returns_only_documents_owned_by_authenticated_user(self):
        own_document = IdentityDocument.objects.create(
            user=self.user,
            document_type=IdentityDocumentType.AADHAAR,
        )
        IdentityDocument.objects.create(
            user=self.other_user,
            document_type=IdentityDocumentType.PASSPORT,
        )

        response = self.client.get(self.collection_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["documents"]), 1)
        self.assertEqual(response.data["documents"][0]["id"], own_document.id)

    def test_create_allows_draft_and_returns_server_requirements(self):
        response = self.client.post(
            self.collection_url,
            {
                "documentType": "AADHAAR",
                "documentNumber": "",
                "nameOnDocument": "",
                "issuingCountry": "in",
                "expiryDate": None,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(IdentityDocument.objects.get().user, self.user)
        self.assertEqual(response.data["issuingCountry"], "IN")
        self.assertTrue(response.data["requirements"]["backImageRequired"])
        self.assertFalse(response.data["requirements"]["expiryDateRequired"])
        self.assertEqual(
            response.data["readiness"]["missingFields"],
            ["documentNumber", "nameOnDocument", "frontImage", "backImage"],
        )

    def test_expired_document_is_saved_but_not_ready(self):
        payload = self._passport_payload()
        payload["expiryDate"] = (date.today() - timedelta(days=1)).isoformat()

        response = self.client.post(self.collection_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("expiryDate", response.data["readiness"]["missingFields"])

    def test_other_users_document_is_not_readable_or_mutable(self):
        document = IdentityDocument.objects.create(
            user=self.other_user,
            document_type=IdentityDocumentType.PASSPORT,
        )
        detail_url = reverse("guest-identity-document-detail", args=[document.id])

        self.assertEqual(
            self.client.get(detail_url).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.put(
                detail_url,
                self._passport_payload(),
                format="json",
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(
            self.client.delete(detail_url).status_code,
            status.HTTP_404_NOT_FOUND,
        )

    @patch("api.identity_document_views.PrivateObjectStorage")
    def test_upload_authorization_uses_safe_key_and_records_pending_upload(
        self,
        storage_class,
    ):
        document = IdentityDocument.objects.create(
            user=self.user,
            document_type=IdentityDocumentType.PASSPORT,
            document_number="SENSITIVE-1234",
        )
        storage = storage_class.return_value
        storage.create_upload_url.side_effect = self._signed_upload
        upload_url = reverse("guest-identity-document-upload", args=[document.id])

        response = self.client.post(
            upload_url,
            {
                "side": "FRONT",
                "contentType": "image/jpeg",
                "contentLength": 2048,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["method"], "PUT")
        self.assertNotIn("SENSITIVE-1234", response.data["objectKey"])
        self.assertTrue(
            response.data["objectKey"].startswith(
                f"users/{self.user.id}/identity-documents/{document.id}/front/"
            )
        )
        image = IdentityDocumentImage.objects.get(
            document=document,
            side=IdentityDocumentImageSide.FRONT,
        )
        self.assertEqual(image.pending_object_key, response.data["objectKey"])
        self.assertEqual(image.pending_content_length, 2048)

    @patch("api.identity_document_views.PrivateObjectStorage")
    def test_finalize_verifies_storage_and_makes_image_ready(
        self,
        storage_class,
    ):
        document = IdentityDocument.objects.create(
            user=self.user,
            **self._passport_model_values(),
        )
        object_key = (
            f"users/{self.user.id}/identity-documents/{document.id}/front/upload.jpg"
        )
        IdentityDocumentImage.objects.create(
            document=document,
            side=IdentityDocumentImageSide.FRONT,
            pending_object_key=object_key,
            pending_content_type="image/jpeg",
            pending_content_length=2048,
        )
        storage = storage_class.return_value
        storage.get_object_metadata.return_value = ObjectMetadata(
            content_type="image/jpeg",
            content_length=2048,
        )
        complete_url = reverse(
            "guest-identity-document-upload-complete",
            args=[document.id],
        )

        response = self.client.post(
            complete_url,
            {"side": "FRONT", "objectKey": object_key},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["images"]["front"]["isUploaded"])
        self.assertTrue(response.data["readiness"]["isReady"])
        image = IdentityDocumentImage.objects.get(document=document)
        self.assertEqual(image.object_key, object_key)
        self.assertEqual(image.pending_object_key, "")

    @patch("api.identity_document_views.PrivateObjectStorage")
    def test_finalize_rejects_stale_or_mismatched_upload(
        self,
        storage_class,
    ):
        document = IdentityDocument.objects.create(user=self.user)
        IdentityDocumentImage.objects.create(
            document=document,
            side=IdentityDocumentImageSide.FRONT,
            pending_object_key="users/1/identity-documents/1/front/current.jpg",
            pending_content_type="image/jpeg",
            pending_content_length=2048,
        )
        complete_url = reverse(
            "guest-identity-document-upload-complete",
            args=[document.id],
        )

        response = self.client.post(
            complete_url,
            {
                "side": "FRONT",
                "objectKey": "users/1/identity-documents/1/front/stale.jpg",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        storage_class.return_value.get_object_metadata.assert_not_called()

    @patch("api.identity_document_views.PrivateObjectStorage")
    def test_image_access_returns_only_short_lived_authorized_url(
        self,
        storage_class,
    ):
        document = IdentityDocument.objects.create(user=self.user)
        object_key = (
            f"users/{self.user.id}/identity-documents/{document.id}/front/image.jpg"
        )
        IdentityDocumentImage.objects.create(
            document=document,
            side=IdentityDocumentImageSide.FRONT,
            object_key=object_key,
            content_type="image/jpeg",
            content_length=2048,
        )
        storage_class.return_value.create_download_url.return_value = (
            "http://127.0.0.1:9000/private/signed"
        )
        access_url = reverse(
            "guest-identity-document-image-access",
            args=[document.id],
        )

        response = self.client.post(
            access_url,
            {"side": "FRONT"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["expiresInSeconds"], 120)
        self.assertNotIn("objectKey", response.data)
        storage_class.return_value.create_download_url.assert_called_once_with(
            object_key=object_key
        )

    @patch("api.identity_document_views.PrivateObjectStorage")
    def test_delete_removes_private_objects_before_database_record(
        self,
        storage_class,
    ):
        document = IdentityDocument.objects.create(user=self.user)
        ready_key = (
            f"users/{self.user.id}/identity-documents/{document.id}/front/ready.jpg"
        )
        pending_key = (
            f"users/{self.user.id}/identity-documents/{document.id}/back/pending.jpg"
        )
        IdentityDocumentImage.objects.create(
            document=document,
            side=IdentityDocumentImageSide.FRONT,
            object_key=ready_key,
            content_type="image/jpeg",
            content_length=2048,
        )
        IdentityDocumentImage.objects.create(
            document=document,
            side=IdentityDocumentImageSide.BACK,
            pending_object_key=pending_key,
            pending_content_type="image/jpeg",
            pending_content_length=2048,
        )
        detail_url = reverse("guest-identity-document-detail", args=[document.id])

        response = self.client.delete(detail_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(IdentityDocument.objects.filter(id=document.id).exists())
        deleted_keys = {
            call.kwargs["object_key"]
            for call in storage_class.return_value.delete_object.call_args_list
        }
        self.assertEqual(deleted_keys, {ready_key, pending_key})

    def test_guest_profile_becomes_ready_with_one_complete_document(self):
        GuestProfile.objects.create(
            user=self.user,
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
        document = IdentityDocument.objects.create(
            user=self.user,
            **self._passport_model_values(),
        )
        IdentityDocumentImage.objects.create(
            document=document,
            side=IdentityDocumentImageSide.FRONT,
            object_key="users/1/identity-documents/1/front/image.jpg",
            content_type="image/jpeg",
            content_length=2048,
        )

        response = self.client.get(reverse("guest-profile"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["readiness"]["isReady"])
        self.assertEqual(response.data["readiness"]["missingFields"], [])

    @staticmethod
    def _signed_upload(**kwargs):
        return PresignedUpload(
            object_key=kwargs["object_key"],
            url="http://127.0.0.1:9000/private/signed",
            method="PUT",
            headers={
                "Content-Type": kwargs["content_type"],
                "Content-Length": str(kwargs["content_length"]),
                "Cache-Control": "private, no-store",
            },
            expires_in_seconds=120,
        )

    @staticmethod
    def _passport_payload():
        return {
            "documentType": "PASSPORT",
            "documentNumber": "P1234567",
            "nameOnDocument": "Kabeer Joshi",
            "issuingCountry": "in",
            "expiryDate": (date.today() + timedelta(days=365)).isoformat(),
        }

    @staticmethod
    def _passport_model_values():
        return {
            "document_type": IdentityDocumentType.PASSPORT,
            "document_number": "P1234567",
            "name_on_document": "Kabeer Joshi",
            "issuing_country": "IN",
            "expiry_date": date.today() + timedelta(days=365),
        }
