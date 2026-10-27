from datetime import timedelta
from unittest.mock import patch

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from api.models import ConsentGrant, IdentityAccessAudit, SharedIdentitySnapshot, Stay
from api.object_storage import ObjectMetadata
from api.tests import test_check_in_api as fixtures


class SharedIdentityWatermarkTests(APITestCase):
    setUp = fixtures.CheckInApiTests.setUp
    authenticate = fixtures.CheckInApiTests.authenticate
    submission_url = fixtures.CheckInApiTests.submission_url
    submit_identity = fixtures.CheckInApiTests.submit_identity

    def access_url(self, stay):
        return reverse("hotel-stay-image-access", args=[self.organization.slug, self.property.slug, stay.public_id])

    def prepared_stay(self):
        response, _ = self.submit_identity()
        self.assertEqual(response.status_code, 201)
        self.authenticate(self.owner)
        return Stay.objects.get(public_id=response.data["id"])

    def test_new_sharing_renders_each_original_to_isolated_private_jpeg(self):
        response, storage_class = self.submit_identity()
        self.assertEqual(response.status_code, 201)
        storage = storage_class.return_value
        storage.create_download_url.return_value = "https://example.com/private.jpg"
        self.assertEqual(storage.read_image_bytes.call_count, 2)
        self.assertEqual(storage.put_image_bytes.call_count, 2)
        storage.copy_object.assert_not_called()
        for call in storage.put_image_bytes.call_args_list:
            self.assertTrue(call.kwargs["object_key"].startswith("stays/"))
            self.assertEqual(call.kwargs["metadata"]["tattwix-watermark-version"], "1")
        for image in SharedIdentitySnapshot.objects.get().document_images.all():
            self.assertEqual(image.content_type, "image/jpeg")
        consent = ConsentGrant.objects.get()
        for call in self.watermark.call_args_list:
            self.assertEqual(call.kwargs["property_name"], self.property.name)
            self.assertEqual(call.kwargs["shared_at"], consent.granted_at)

    @patch("api.check_in_views.PrivateObjectStorage")
    def test_existing_shared_copy_is_converted_in_place_before_signing(self, storage_class):
        stay = self.prepared_stay()
        storage = storage_class.return_value
        storage.create_download_url.return_value = "https://example.com/private.jpg"
        storage.get_object_metadata.return_value = ObjectMetadata("image/png", 123)
        storage.create_download_url.return_value = "https://example.com/private.jpg"
        image = stay.identity_snapshot.document_images.get(side="FRONT")
        response = self.client.post(self.access_url(stay), {"side": "FRONT"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data), {"url", "expiresInSeconds"})
        storage.read_image_bytes.assert_called_once_with(object_key=image.object_key)
        storage.put_image_bytes.assert_called_once()
        self.assertEqual(storage.put_image_bytes.call_args.kwargs["object_key"], image.object_key)
        storage.create_download_url.assert_called_once_with(object_key=image.object_key)

    @patch("api.check_in_views.PrivateObjectStorage")
    def test_converted_copy_is_not_rendered_again_even_after_property_rename(self, storage_class):
        stay = self.prepared_stay()
        self.watermark.reset_mock()
        storage = storage_class.return_value
        storage.create_download_url.return_value = "https://example.com/private.jpg"
        storage.get_object_metadata.return_value = ObjectMetadata("image/jpeg", 123, {"tattwix-watermark-version": "1"})
        storage.create_download_url.return_value = "https://example.com/private.jpg"
        self.property.name = "Renamed property"
        self.property.save()
        response = self.client.post(self.access_url(stay), {"side": "FRONT"}, format="json")
        self.assertEqual(response.status_code, 200)
        storage.read_image_bytes.assert_not_called()
        storage.put_image_bytes.assert_not_called()
        self.watermark.assert_not_called()

    @patch("api.check_in_views.PrivateObjectStorage")
    def test_failed_conversion_never_signs_raw_copy_or_records_view(self, storage_class):
        stay = self.prepared_stay()
        storage = storage_class.return_value
        storage.create_download_url.return_value = "https://example.com/private.jpg"
        storage.get_object_metadata.return_value = ObjectMetadata("image/jpeg", 123)
        storage.read_image_bytes.side_effect = ValueError("invalid image")
        response = self.client.post(self.access_url(stay), {"side": "FRONT"}, format="json")
        self.assertEqual(response.status_code, 503)
        storage.create_download_url.assert_not_called()
        self.assertFalse(IdentityAccessAudit.objects.filter(action="DOCUMENT_VIEWED").exists())

    @patch("api.check_in_views.PrivateObjectStorage")
    def test_access_expiring_during_conversion_does_not_issue_url(self, storage_class):
        stay = self.prepared_stay()
        storage = storage_class.return_value
        storage.create_download_url.return_value = "https://example.com/private.jpg"
        storage.get_object_metadata.return_value = ObjectMetadata("image/jpeg", 123)
        states = [{"isActive": True}, {"isActive": False}]
        with patch("api.check_in_views.hotel_identity_access_state", side_effect=states):
            response = self.client.post(self.access_url(stay), {"side": "FRONT"}, format="json")
        self.assertEqual(response.status_code, 403)
        storage.create_download_url.assert_not_called()

    @patch("api.check_in_views.PrivateObjectStorage")
    def test_denied_expired_and_revoked_access_never_touches_storage(self, storage_class):
        stay = self.prepared_stay()
        storage = storage_class.return_value
        storage.create_download_url.return_value = "https://example.com/private.jpg"
        storage.reset_mock()
        self.authenticate(self.guest)
        self.assertEqual(self.client.post(self.access_url(stay), {"side": "FRONT"}, format="json").status_code, 404)
        self.authenticate(self.owner)
        stay.hotel_access_expires_at = timezone.now() - timedelta(seconds=1)
        stay.save()
        self.assertEqual(self.client.post(self.access_url(stay), {"side": "FRONT"}, format="json").status_code, 403)
        storage.get_object_metadata.assert_not_called()
        storage.create_download_url.assert_not_called()

    @patch("api.check_in_views.PrivateObjectStorage")
    def test_failed_submission_put_cleans_ambiguous_destination_and_has_no_consent(self, storage_class):
        self.authenticate(self.guest)
        storage = storage_class.return_value
        storage.create_download_url.return_value = "https://example.com/private.jpg"
        storage.put_image_bytes.side_effect = RuntimeError("write outcome unknown")
        response = self.client.post(self.submission_url(), {"identityDocumentId": self.document.id, "companionIds": [], "consentAccepted": True}, format="json")
        self.assertEqual(response.status_code, 503)
        self.assertFalse(ConsentGrant.objects.exists())
        storage.delete_object.assert_called_once()

    @patch("api.check_in_views.PrivateObjectStorage")
    def test_qr_revoked_during_processing_does_not_commit_consent(self, storage_class):
        self.authenticate(self.guest)
        storage = storage_class.return_value
        def revoke(**kwargs):
            self.qr_token.revoked_at = timezone.now()
            self.qr_token.save()
        storage.put_image_bytes.side_effect = revoke
        response = self.client.post(self.submission_url(), {"identityDocumentId": self.document.id, "companionIds": [], "consentAccepted": True}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(ConsentGrant.objects.exists())
        self.assertFalse(SharedIdentitySnapshot.objects.exists())
        self.assertEqual(storage.delete_object.call_count, 2)

    @patch("api.check_in_views.PrivateObjectStorage")
    def test_actor_losing_scope_during_processing_does_not_get_url(self, storage_class):
        from api.models import Membership
        stay = self.prepared_stay()
        storage = storage_class.return_value
        storage.get_object_metadata.return_value = ObjectMetadata("image/jpeg", 123)
        def remove_access(**kwargs):
            Membership.objects.filter(user=self.owner).update(is_active=False)
        storage.put_image_bytes.side_effect = remove_access
        response = self.client.post(self.access_url(stay), {"side": "FRONT"}, format="json")
        self.assertEqual(response.status_code, 404)
        storage.create_download_url.assert_not_called()

    @patch("api.check_in_views.PrivateObjectStorage")
    def test_failed_cleanup_is_durable_and_retried_by_retention_job(self, storage_class):
        from api.models import PendingIdentityImageCleanup
        from api.check_in import purge_expired_shared_identity_images
        self.authenticate(self.guest)
        storage = storage_class.return_value
        storage.put_image_bytes.side_effect = RuntimeError("ambiguous write")
        storage.delete_object.side_effect = RuntimeError("storage unavailable")
        response = self.client.post(self.submission_url(), {"identityDocumentId": self.document.id, "companionIds": [], "consentAccepted": True}, format="json")
        self.assertEqual(response.status_code, 503)
        pending = PendingIdentityImageCleanup.objects.get()
        self.assertEqual(pending.object_key, storage.put_image_bytes.call_args.kwargs["object_key"])
        self.assertFalse(ConsentGrant.objects.exists())
        PendingIdentityImageCleanup.objects.filter(id=pending.id).update(created_at=timezone.now() - timedelta(hours=2))
        storage.delete_object.side_effect = None
        self.assertEqual(purge_expired_shared_identity_images(storage=storage, batch_size=100), (1, 0))
        self.assertFalse(PendingIdentityImageCleanup.objects.exists())

    def test_retention_does_not_delete_recent_in_progress_preparations(self):
        from unittest.mock import Mock
        from api.models import PendingIdentityImageCleanup
        from api.check_in import purge_expired_shared_identity_images
        pending = PendingIdentityImageCleanup.objects.create(object_key="stays/test/preparing.jpg")
        storage = Mock()
        self.assertEqual(purge_expired_shared_identity_images(storage=storage, batch_size=100), (0, 0))
        storage.delete_object.assert_not_called()
        self.assertTrue(PendingIdentityImageCleanup.objects.filter(id=pending.id).exists())
