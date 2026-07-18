from io import StringIO
from unittest.mock import Mock, patch

from django.core.management import CommandError, call_command
from django.test import SimpleTestCase, override_settings

from api.object_storage import (
    ObjectStorageValidationError,
    PrivateObjectStorage,
)


@override_settings(
    OBJECT_STORAGE_BUCKET_NAME="private-documents",
    OBJECT_STORAGE_MAX_UPLOAD_BYTES=8_388_608,
    OBJECT_STORAGE_ALLOWED_CONTENT_TYPES=frozenset(
        {"image/jpeg", "image/png", "image/webp"}
    ),
    OBJECT_STORAGE_PRESIGNED_URL_TTL_SECONDS=120,
)
class PrivateObjectStorageTests(SimpleTestCase):
    def setUp(self):
        self.client = Mock()
        self.client.generate_presigned_url.return_value = (
            "http://127.0.0.1:9000/private-documents/signed"
        )
        self.storage = PrivateObjectStorage(client=self.client)

    def test_upload_url_is_scoped_to_one_key_size_and_content_type(self):
        upload = self.storage.create_upload_url(
            object_key="users/user_123/documents/upload_123/front.jpg",
            content_type="image/jpeg",
            content_length=2048,
        )

        self.assertEqual(upload.method, "PUT")
        self.assertEqual(upload.headers["Content-Type"], "image/jpeg")
        self.assertEqual(upload.headers["Content-Length"], "2048")
        self.assertEqual(upload.headers["Cache-Control"], "private, no-store")
        self.assertEqual(upload.expires_in_seconds, 120)
        self.client.generate_presigned_url.assert_called_once_with(
            ClientMethod="put_object",
            Params={
                "Bucket": "private-documents",
                "Key": "users/user_123/documents/upload_123/front.jpg",
                "ContentType": "image/jpeg",
                "ContentLength": 2048,
                "CacheControl": "private, no-store",
            },
            ExpiresIn=120,
            HttpMethod="PUT",
        )

    def test_download_url_is_short_lived_and_private(self):
        url = self.storage.create_download_url(
            object_key="users/user_123/documents/upload_123/front.jpg"
        )

        self.assertEqual(
            url,
            "http://127.0.0.1:9000/private-documents/signed",
        )
        self.client.generate_presigned_url.assert_called_once_with(
            ClientMethod="get_object",
            Params={
                "Bucket": "private-documents",
                "Key": "users/user_123/documents/upload_123/front.jpg",
                "ResponseContentDisposition": "inline",
                "ResponseCacheControl": "private, no-store",
            },
            ExpiresIn=120,
            HttpMethod="GET",
        )

    def test_rejects_unsupported_empty_and_oversized_uploads_before_signing(self):
        invalid_uploads = (
            {"content_type": "application/pdf", "content_length": 2048},
            {"content_type": "image/jpeg", "content_length": 0},
            {"content_type": "image/jpeg", "content_length": 8_388_609},
            {"content_type": "image/jpeg", "content_length": True},
        )

        for invalid_upload in invalid_uploads:
            with self.subTest(invalid_upload=invalid_upload):
                with self.assertRaises(ObjectStorageValidationError):
                    self.storage.create_upload_url(
                        object_key="users/user_123/documents/upload_123/front.jpg",
                        **invalid_upload,
                    )

        self.client.generate_presigned_url.assert_not_called()

    def test_rejects_unsafe_object_keys_before_any_storage_request(self):
        unsafe_keys = (
            "",
            "/absolute/front.jpg",
            "../outside.jpg",
            "users//front.jpg",
            "users\\front.jpg",
            "users/./front.jpg",
            "users/\x00/front.jpg",
        )

        for unsafe_key in unsafe_keys:
            with self.subTest(object_key=unsafe_key):
                with self.assertRaises(ObjectStorageValidationError):
                    self.storage.create_download_url(object_key=unsafe_key)

        self.client.generate_presigned_url.assert_not_called()

    def test_delete_and_health_check_use_only_the_configured_bucket(self):
        key = "users/user_123/documents/upload_123/front.jpg"

        self.storage.delete_object(object_key=key)
        self.storage.check_bucket_access()

        self.client.delete_object.assert_called_once_with(
            Bucket="private-documents",
            Key=key,
        )
        self.client.head_bucket.assert_called_once_with(Bucket="private-documents")


class CheckObjectStorageCommandTests(SimpleTestCase):
    @patch("api.management.commands.check_object_storage.PrivateObjectStorage")
    def test_reports_success_without_exposing_configuration(self, storage_class):
        output = StringIO()

        call_command("check_object_storage", stdout=output)

        storage_class.return_value.check_bucket_access.assert_called_once_with()
        self.assertIn("bucket is accessible", output.getvalue())

    @patch("api.management.commands.check_object_storage.PrivateObjectStorage")
    def test_returns_a_generic_error_without_leaking_storage_details(
        self,
        storage_class,
    ):
        storage_class.return_value.check_bucket_access.side_effect = OSError(
            "secret-access-key"
        )

        with self.assertRaises(CommandError) as raised:
            call_command("check_object_storage")

        self.assertIn("Object storage is unavailable", str(raised.exception))
        self.assertNotIn("secret-access-key", str(raised.exception))
