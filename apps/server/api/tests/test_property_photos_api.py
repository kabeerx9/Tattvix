from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.urls import reverse
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser, Membership, MembershipPropertyAccess, MembershipRole,
    Organization, Property, PropertyPhoto, Room,
)
from api.object_storage import ObjectMetadata, PresignedUpload


class PropertyPhotosApiTests(APITestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Photos", slug="photos")
        self.property = Property.objects.create(organization=self.organization, name="Hotel", slug="hotel")
        self.other_property = Property.objects.create(organization=self.organization, name="Other", slug="other")
        self.owner = ClerkUser.objects.create(clerk_id="photo-owner", email="owner@example.com")
        Membership.objects.create(user=self.owner, organization=self.organization, role=MembershipRole.OWNER, has_all_properties=True)
        self.reception = ClerkUser.objects.create(clerk_id="photo-reception", email="reception@example.com")
        membership = Membership.objects.create(user=self.reception, organization=self.organization, role=MembershipRole.RECEPTION)
        MembershipPropertyAccess.objects.create(membership=membership, property=self.property)
        Room.objects.create(property=self.property, number="101", room_type="Deluxe")
        self.authenticate(self.owner)
        self.storage = Mock()
        self.storage.create_upload_url.side_effect = lambda **kw: PresignedUpload(
            object_key=kw["object_key"], url="https://storage.example/upload", method="PUT",
            headers={"Content-Type": kw["content_type"]}, expires_in_seconds=120,
        )
        self.storage.get_object_metadata.return_value = ObjectMetadata(content_type="image/jpeg", content_length=2048)
        self.storage.create_download_url.side_effect = lambda **kw: f'https://storage.example/{kw["object_key"]}'
        storage_patch = patch("api.property_photo_views.PrivateObjectStorage", return_value=self.storage)
        storage_patch.start()
        self.addCleanup(storage_patch.stop)

    def authenticate(self, user):
        self.client.force_authenticate(user=SimpleNamespace(is_authenticated=True, db_user=user))

    def url(self, name, property_=None):
        return reverse(name, args=[self.organization.slug, (property_ or self.property).slug])

    def upload(self, **extra):
        return self.client.post(self.url("hotel-property-photo-upload"), {
            "kind": "COVER", "contentType": "image/jpeg", "contentLength": 2048, **extra,
        }, format="json")

    def complete(self, **extra):
        return self.client.post(self.url("hotel-property-photo-upload-complete"), {"kind": "COVER", **extra}, format="json")

    def test_owner_uploads_and_finalizes_cover(self):
        self.assertEqual(self.upload().status_code, 200)
        self.assertEqual(self.complete().status_code, 200)
        response = self.client.get(self.url("hotel-property-photos"))
        self.assertEqual(response.status_code, 200)
        self.assertIn("/photos/cover/", response.data["cover"]["url"])

    def test_finalize_uses_pending_key_only(self):
        self.upload()
        key = PropertyPhoto.objects.get().pending_object_key
        response = self.complete(objectKey="users/other/private.jpg")
        self.assertEqual(response.status_code, 200)
        photo = PropertyPhoto.objects.get()
        self.assertEqual(photo.object_key, key)
        self.assertTrue(key.startswith(f"properties/{self.property.id}/photos/cover/"))
        self.storage.get_object_metadata.assert_called_once_with(object_key=key)

    def test_finalize_rejects_mismatched_object(self):
        for metadata in (ObjectMetadata("image/jpeg", 1), ObjectMetadata("image/png", 2048)):
            with self.subTest(metadata=metadata):
                self.upload()
                key = PropertyPhoto.objects.get().pending_object_key
                self.storage.get_object_metadata.return_value = metadata
                self.assertEqual(self.complete().status_code, 400)
                self.assertEqual(PropertyPhoto.objects.get().pending_object_key, "")
                self.assertEqual(PropertyPhoto.objects.get().object_key, "")
                self.storage.delete_object.assert_any_call(object_key=key)

    def test_replacing_photo_deletes_previous_object(self):
        self.upload()
        self.complete()
        previous = PropertyPhoto.objects.get().object_key
        self.upload()
        self.assertEqual(self.complete().status_code, 200)
        self.assertNotEqual(PropertyPhoto.objects.get().object_key, previous)
        self.storage.delete_object.assert_any_call(object_key=previous)

    def test_unknown_room_type_is_400(self):
        self.assertEqual(self.upload(kind="ROOM_TYPE", roomType="Unknown").status_code, 400)
        self.assertFalse(PropertyPhoto.objects.exists())

    def test_reception_can_view_but_not_upload(self):
        self.authenticate(self.reception)
        self.assertEqual(self.client.get(self.url("hotel-property-photos")).status_code, 200)
        self.assertEqual(self.upload().status_code, 404)
        self.assertEqual(self.complete().status_code, 404)
        self.assertEqual(self.client.delete(self.url("hotel-property-photos"), {"kind": "COVER"}, format="json").status_code, 404)

    def test_other_property_is_404(self):
        self.authenticate(self.reception)
        self.assertEqual(self.client.get(self.url("hotel-property-photos", self.other_property)).status_code, 404)

    def test_room_type_photo_and_removal(self):
        self.assertEqual(self.upload(kind="ROOM_TYPE", roomType="Deluxe").status_code, 200)
        response = self.complete(kind="ROOM_TYPE", roomType="Deluxe")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["roomTypes"][0]["roomType"], "Deluxe")
        key = PropertyPhoto.objects.get().object_key
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(self.url("hotel-property-photos"), {"kind": "ROOM_TYPE", "roomType": "Deluxe"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"cover": None, "roomTypes": []})
        self.assertFalse(PropertyPhoto.objects.exists())
        self.storage.delete_object.assert_any_call(object_key=key)

    def test_replacing_pending_upload_deletes_abandoned_object(self):
        self.upload()
        previous = PropertyPhoto.objects.get().pending_object_key
        self.upload()
        self.storage.delete_object.assert_any_call(object_key=previous)

    def test_cover_rejects_room_type_and_finalize_requires_pending(self):
        self.assertEqual(self.upload(roomType="Deluxe").status_code, 400)
        self.assertEqual(self.complete().status_code, 400)

    def test_unknown_room_type_delete_is_400(self):
        response = self.client.delete(self.url("hotel-property-photos"), {"kind": "ROOM_TYPE", "roomType": "Unknown"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_remove_storage_failure_does_not_leave_broken_photo_row(self):
        self.upload()
        self.complete()
        self.upload()
        self.storage.delete_object.side_effect = RuntimeError("Storage unavailable")
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(self.url("hotel-property-photos"), {"kind": "COVER"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(PropertyPhoto.objects.exists())
        self.assertIsNone(response.data["cover"])
