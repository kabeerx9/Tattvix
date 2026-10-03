from datetime import date, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.db.models.deletion import ProtectedError
from django.test import TransactionTestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from api.models import (
    ClerkUser,
    CompanionProfile,
    IdentityDocument,
    IdentityDocumentImage,
)
from api.object_storage import ObjectMetadata, PresignedUpload


class CompanionIdentityDocumentApiTests(APITestCase):
    def setUp(self):
        self.user = ClerkUser.objects.create(clerk_id="companion_docs_owner")
        self.other = ClerkUser.objects.create(clerk_id="companion_docs_other")
        self.companion = CompanionProfile.objects.create(user=self.user)
        self.other_companion = CompanionProfile.objects.create(user=self.other)
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=self.user)
        )

    def url(self, action="list", document=None, companion=None):
        args = [(companion or self.companion).id]
        if document:
            args.append(document.id)
        return reverse(f"guest-companion-identity-document-{action}", args=args)

    def test_create_list_update_are_scoped_to_companion(self):
        response = self.client.post(
            self.url(), {"documentType": "PASSPORT"}, format="json"
        )
        self.assertEqual(response.status_code, 201)
        document = IdentityDocument.objects.get(pk=response.data["id"])
        self.assertEqual(document.companion, self.companion)
        self.assertEqual(document.user, self.user)
        self.assertEqual(
            self.client.get(self.url()).data["documents"][0]["id"], document.id
        )
        response = self.client.put(
            self.url("detail", document), {"documentType": "AADHAAR"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["documentType"], "AADHAAR")
        self.assertEqual(
            self.client.get(reverse("guest-identity-document-list")).data["documents"],
            [],
        )

    def test_parent_and_document_ownership_are_both_required_on_every_route(self):
        own = IdentityDocument.objects.create(user=self.user, companion=self.companion)
        primary = IdentityDocument.objects.create(user=self.user)
        foreign = IdentityDocument.objects.create(
            user=self.other, companion=self.other_companion
        )
        sibling = CompanionProfile.objects.create(user=self.user)
        sibling_doc = IdentityDocument.objects.create(user=self.user, companion=sibling)
        for method in ("get", "post"):
            self.assertEqual(
                getattr(self.client, method)(
                    self.url(companion=self.other_companion)
                ).status_code,
                404,
            )
        for action, methods in (
            ("detail", ("get", "put", "delete")),
            ("upload", ("post",)),
            ("upload-complete", ("post",)),
            ("image-access", ("post",)),
        ):
            for method in methods:
                with self.subTest(action=action, method=method):
                    self.assertEqual(
                        getattr(self.client, method)(
                            reverse(f"guest-identity-document-{action}", args=[own.id])
                        ).status_code,
                        404,
                    )
                    for invalid in (primary, foreign, sibling_doc):
                        self.assertEqual(
                            getattr(self.client, method)(
                                self.url(action, invalid)
                            ).status_code,
                            404,
                        )

    @patch("api.identity_document_views.PrivateObjectStorage")
    def test_upload_finalize_access_and_delete_reuse_private_storage(
        self, storage_class
    ):
        document = IdentityDocument.objects.create(
            user=self.user, companion=self.companion
        )
        storage = storage_class.return_value
        storage.create_upload_url.side_effect = lambda **kw: PresignedUpload(
            object_key=kw["object_key"],
            url="https://private/upload",
            method="PUT",
            headers={},
            expires_in_seconds=120,
        )
        response = self.client.post(
            self.url("upload", document),
            {"side": "FRONT", "contentType": "image/jpeg", "contentLength": 100},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        key = response.data["objectKey"]
        storage.get_object_metadata.return_value = ObjectMetadata(
            content_type="image/jpeg", content_length=100
        )
        response = self.client.post(
            self.url("upload-complete", document),
            {"side": "FRONT", "objectKey": key},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["images"]["front"]["isUploaded"])
        storage.create_download_url.return_value = "https://private/access"
        self.assertEqual(
            self.client.post(
                self.url("image-access", document), {"side": "FRONT"}, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(
            self.client.delete(self.url("detail", document)).status_code, 204
        )
        storage.delete_object.assert_called_once_with(object_key=key)

    def test_companion_document_does_not_satisfy_primary_readiness(self):
        document = IdentityDocument.objects.create(
            user=self.user,
            companion=self.companion,
            document_type="PASSPORT",
            document_number="123",
            name_on_document="Companion",
            issuing_country="IN",
            expiry_date=date.today() + timedelta(days=365),
        )
        IdentityDocumentImage.objects.create(
            document=document,
            side="FRONT",
            object_key="ready",
            content_type="image/jpeg",
            content_length=100,
        )
        response = self.client.get(reverse("guest-profile"))
        self.assertIn("identityDocuments", response.data["readiness"]["missingFields"])

    @patch("api.guest_views.PrivateObjectStorage")
    def test_delete_companion_cleans_committed_and_pending_objects(self, storage_class):
        document = IdentityDocument.objects.create(
            user=self.user, companion=self.companion
        )
        IdentityDocumentImage.objects.create(
            document=document,
            side="FRONT",
            object_key="ready",
            pending_object_key="pending",
        )
        with self.assertRaises(ProtectedError):
            self.companion.delete()
        response = self.client.delete(
            reverse("guest-companion-detail", args=[self.companion.id])
        )
        self.assertEqual(response.status_code, 204)
        self.assertEqual(
            {
                c.kwargs["object_key"]
                for c in storage_class.return_value.delete_object.call_args_list
            },
            {"ready", "pending"},
        )
        self.assertFalse(IdentityDocument.objects.filter(pk=document.id).exists())
        self.assertFalse(CompanionProfile.objects.filter(pk=self.companion.id).exists())

    @patch("api.guest_views.PrivateObjectStorage")
    def test_failed_companion_cleanup_preserves_all_database_records(
        self, storage_class
    ):
        for key in ("first", "second"):
            document = IdentityDocument.objects.create(
                user=self.user, companion=self.companion
            )
            IdentityDocumentImage.objects.create(
                document=document, side="FRONT", object_key=key
            )
        storage_class.return_value.delete_object.side_effect = [
            None,
            RuntimeError("storage unavailable"),
        ]
        response = self.client.delete(
            reverse("guest-companion-detail", args=[self.companion.id])
        )
        self.assertEqual(response.status_code, 503)
        self.assertTrue(CompanionProfile.objects.filter(pk=self.companion.id).exists())
        self.assertEqual(
            IdentityDocument.objects.filter(companion=self.companion).count(), 2
        )
        self.assertEqual(IdentityDocumentImage.objects.count(), 2)


class CompanionDocumentDeletionConcurrencyTests(TransactionTestCase):
    def test_document_create_waits_for_companion_deletion_and_returns_not_found(self):
        from concurrent.futures import ThreadPoolExecutor
        from threading import Event

        from django.db import close_old_connections
        from rest_framework.test import APIClient

        user = ClerkUser.objects.create(clerk_id="concurrent_companion_owner")
        companion = CompanionProfile.objects.create(user=user)
        document = IdentityDocument.objects.create(user=user, companion=companion)
        IdentityDocumentImage.objects.create(
            document=document, side="FRONT", object_key="ready"
        )
        deleting = Event()
        continue_delete = Event()
        creating = Event()

        def request(method, url):
            close_old_connections()
            try:
                client = APIClient()
                client.force_authenticate(
                    user=SimpleNamespace(is_authenticated=True, db_user=user)
                )
                if method == "post":
                    creating.set()
                return getattr(client, method)(url, {}, format="json").status_code
            finally:
                close_old_connections()

        def pause_cleanup(**kwargs):
            deleting.set()
            if not continue_delete.wait(timeout=5):
                raise RuntimeError("Timed out waiting for concurrent request")

        with patch("api.guest_views.PrivateObjectStorage") as storage_class:
            storage_class.return_value.delete_object.side_effect = pause_cleanup
            with ThreadPoolExecutor(max_workers=2) as executor:
                deletion = executor.submit(
                    request,
                    "delete",
                    reverse("guest-companion-detail", args=[companion.id]),
                )
                self.assertTrue(deleting.wait(timeout=5))
                creation = executor.submit(
                    request,
                    "post",
                    reverse(
                        "guest-companion-identity-document-list", args=[companion.id]
                    ),
                )
                try:
                    self.assertTrue(creating.wait(timeout=5))
                    # The request cannot create a child while deletion holds the parent lock.
                    from concurrent.futures import TimeoutError

                    with self.assertRaises(TimeoutError):
                        creation.result(timeout=0.1)
                finally:
                    continue_delete.set()
                self.assertEqual(deletion.result(timeout=5), 204)
                self.assertEqual(creation.result(timeout=5), 404)
        self.assertFalse(
            IdentityDocument.objects.filter(companion_id=companion.id).exists()
        )
