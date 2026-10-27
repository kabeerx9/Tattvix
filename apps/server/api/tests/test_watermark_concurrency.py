from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Event
from time import sleep
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.db import connection, connections
from django.utils import timezone
from rest_framework.test import APIClient, APITransactionTestCase

from api.check_in import purge_expired_shared_identity_images
from api.object_storage import ObjectMetadata
from api.tests import test_check_in_api as fixtures
from api.tests import test_shared_identity_watermarks as watermark_fixtures


class WatermarkConcurrencyTests(APITransactionTestCase):
    setUp = fixtures.CheckInApiTests.setUp
    authenticate = fixtures.CheckInApiTests.authenticate
    submission_url = fixtures.CheckInApiTests.submission_url
    submit_identity = fixtures.CheckInApiTests.submit_identity
    prepared_stay = watermark_fixtures.SharedIdentityWatermarkTests.prepared_stay
    access_url = watermark_fixtures.SharedIdentityWatermarkTests.access_url

    def worker(self, fn):
        try:
            return fn()
        finally:
            connections.close_all()

    def test_conversion_and_expiry_purge_use_the_same_lock_order(self):
        self.assertEqual(connection.vendor, "postgresql")
        stay = self.prepared_stay()
        stay.operational_status = "CHECKED_OUT"
        stay.checked_out_at = timezone.now() - timedelta(days=60) + timedelta(milliseconds=300)
        stay.hotel_access_expires_at = stay.checked_out_at + timedelta(days=60)
        stay.save()
        entered, release = Event(), Event()
        storage = Mock()
        storage.create_download_url.return_value = "https://example.com/private.jpg"
        def metadata(**kwargs):
            entered.set()
            if not release.wait(timeout=5):
                raise RuntimeError("Test conversion timed out")
            return ObjectMetadata("image/jpeg", 123)
        storage.get_object_metadata.side_effect = metadata
        def access():
            client = APIClient()
            client.force_authenticate(user=SimpleNamespace(is_authenticated=True, db_user=self.owner))
            return client.post(self.access_url(stay), {"side": "FRONT"}, format="json").status_code
        with patch("api.check_in_views.PrivateObjectStorage", return_value=storage), ThreadPoolExecutor(max_workers=2) as pool:
            viewer = pool.submit(self.worker, access)
            self.assertTrue(entered.wait(timeout=5))
            sleep(0.4)
            purge = pool.submit(self.worker, lambda: purge_expired_shared_identity_images(storage=storage, batch_size=100))
            try:
                sleep(0.1)
                self.assertFalse(purge.done(), "Purge must wait for conversion's stay lock")
            finally:
                release.set()
            self.assertEqual(viewer.result(timeout=5), 403)
            self.assertEqual(purge.result(timeout=5), (2, 0))
        storage.create_download_url.assert_not_called()
        self.assertFalse(stay.identity_snapshot.document_images.exists())

    def test_revocation_waits_for_checkout_and_then_remains_terminal(self):
        from django.db import transaction
        from api.check_in import revoke_guest_consent, hotel_identity_access_state
        from api.hotel_operations import confirm_hotel_check_in, checkout_hotel_stay
        from api.models import Stay, Room, StayStatus

        stay = self.prepared_stay()
        room = Room.objects.create(property=self.property, number="RACE60", nightly_rate_minor=10000)
        stay = confirm_hotel_check_in(property_=self.property, stay=stay, room_id=room.id, actor=self.owner)
        entered = Event()
        def revoke():
            entered.set()
            return revoke_guest_consent(stay=stay, guest=self.guest).status
        with ThreadPoolExecutor(max_workers=1) as pool:
            with transaction.atomic():
                Stay.objects.select_for_update().get(id=stay.id)
                revoker = pool.submit(self.worker, revoke)
                self.assertTrue(entered.wait(timeout=5))
                sleep(0.1)
                self.assertFalse(revoker.done(), "Revocation must wait for the stay lock")
                checked_out = checkout_hotel_stay(property_=self.property, stay=stay, actor=self.owner)
                self.assertEqual(checked_out.hotel_access_expires_at, checked_out.checked_out_at + timedelta(days=60))
            self.assertEqual(revoker.result(timeout=5), StayStatus.REVOKED)
        stay.refresh_from_db()
        self.assertFalse(hotel_identity_access_state(stay)["isActive"])
        self.assertGreaterEqual(stay.hotel_access_expires_at, checked_out.checked_out_at)
        retried = checkout_hotel_stay(property_=self.property, stay=stay, actor=self.owner)
        self.assertEqual(retried.status, StayStatus.REVOKED)
