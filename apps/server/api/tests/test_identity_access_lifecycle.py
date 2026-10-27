from datetime import timedelta
from unittest.mock import Mock, patch

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from api.check_in import hotel_identity_access_state, build_guest_stay_payload, purge_expired_shared_identity_images
from api.models import OperationalStayStatus, Stay, StayStatus, Room, IdentityAccessAudit
from api.hotel_operations import confirm_hotel_check_in, checkout_hotel_stay
from api.tests import test_check_in_api as fixtures


class IdentityAccessLifecycleTests(APITestCase):
    setUp = fixtures.CheckInApiTests.setUp
    authenticate = fixtures.CheckInApiTests.authenticate
    submission_url = fixtures.CheckInApiTests.submission_url
    submit_identity = fixtures.CheckInApiTests.submit_identity

    def shared_stay(self):
        response, _ = self.submit_identity()
        self.assertEqual(response.status_code, 201)
        return Stay.objects.get(public_id=response.data['id'])

    def test_new_submission_has_no_running_expiry(self):
        stay = self.shared_stay()
        self.assertIsNone(stay.hotel_access_expires_at)
        self.assertIsNone(build_guest_stay_payload(stay)['hotelAccessExpiresAt'])
        self.assertTrue(hotel_identity_access_state(stay)['isActive'])

    def test_legacy_long_stay_keeps_access_and_images_even_after_old_deadline(self):
        stay = self.shared_stay()
        stay.operational_status = OperationalStayStatus.CHECKED_IN
        stay.checked_in_at = timezone.now() - timedelta(days=120)
        stay.hotel_access_expires_at = timezone.now() - timedelta(days=110)
        stay.save()
        self.assertTrue(hotel_identity_access_state(stay)['isActive'])
        self.assertIsNone(build_guest_stay_payload(stay)['hotelAccessExpiresAt'])
        storage = Mock()
        self.assertEqual(purge_expired_shared_identity_images(storage=storage, batch_size=100), (0, 0))
        storage.delete_object.assert_not_called()
        self.assertEqual(stay.identity_snapshot.document_images.count(), 2)

    def test_checkout_timestamp_overrides_legacy_submission_deadline(self):
        stay = self.shared_stay()
        stay.status = StayStatus.CLOSED
        stay.operational_status = OperationalStayStatus.CHECKED_OUT
        stay.checked_out_at = timezone.now() - timedelta(days=59)
        stay.hotel_access_expires_at = timezone.now() - timedelta(days=65)
        stay.save()
        self.assertTrue(hotel_identity_access_state(stay)['isActive'])
        self.assertEqual(build_guest_stay_payload(stay)['hotelAccessExpiresAt'], (stay.checked_out_at + timedelta(days=60)).isoformat().replace("+00:00", "Z"))
        storage = Mock()
        self.assertEqual(purge_expired_shared_identity_images(storage=storage, batch_size=100), (0, 0))
        stay.checked_out_at = timezone.now() - timedelta(days=60, seconds=1)
        stay.save()
        self.assertFalse(hotel_identity_access_state(stay)['isActive'])
        self.assertEqual(purge_expired_shared_identity_images(storage=storage, batch_size=100), (2, 0))

    def test_revoke_rejected_before_checkout_but_available_after(self):
        stay = self.shared_stay()
        url = reverse('guest-stay-revoke', args=[stay.public_id])
        for operational_status in [OperationalStayStatus.PENDING_CHECK_IN, OperationalStayStatus.CHECKED_IN]:
            stay.operational_status = operational_status
            stay.save()
            response = self.client.post(url)
            self.assertEqual(response.status_code, 409)
            self.assertEqual(response.data['code'], 'stay_not_checked_out')
            stay.refresh_from_db()
            self.assertEqual(stay.status, StayStatus.SUBMITTED)
        stay.operational_status = OperationalStayStatus.CHECKED_OUT
        stay.checked_out_at = timezone.now()
        stay.save()
        self.assertEqual(self.client.post(url).status_code, 200)
        stay.refresh_from_db()
        self.assertEqual(stay.status, StayStatus.REVOKED)
        self.assertFalse(hotel_identity_access_state(stay)['isActive'])
        self.assertEqual(self.client.post(url).status_code, 200)

    def test_legacy_close_cannot_start_clock_before_checkout(self):
        stay = self.shared_stay()
        self.authenticate(self.owner)
        response = self.client.post(reverse('hotel-stay-close', args=[self.organization.slug, self.property.slug, stay.public_id]))
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data['code'], 'stay_not_checked_out')

    def test_real_checkout_starts_exact_60_day_clock_and_retry_does_not_extend_it(self):
        stay = self.shared_stay()
        room = Room.objects.create(property=self.property, number="L60", nightly_rate_minor=10000)
        stay = confirm_hotel_check_in(property_=self.property, stay=stay, room_id=room.id, actor=self.owner)
        # Legacy early review closure must not prevent checkout from setting the window.
        stay.status = StayStatus.CLOSED
        stay.closed_at = timezone.now() - timedelta(days=100)
        stay.hotel_access_expires_at = timezone.now() - timedelta(days=99)
        stay.save()
        checkout_time = timezone.now()
        with patch("api.hotel_operations.timezone.now", return_value=checkout_time):
            stay = checkout_hotel_stay(property_=self.property, stay=stay, actor=self.owner)
        self.assertEqual(stay.checked_out_at, checkout_time)
        self.assertEqual(stay.hotel_access_expires_at, checkout_time + timedelta(days=60))
        first_audit_count = IdentityAccessAudit.objects.filter(stay=stay).count()
        with patch("api.hotel_operations.timezone.now", return_value=checkout_time + timedelta(days=5)):
            repeated = checkout_hotel_stay(property_=self.property, stay=stay, actor=self.owner)
        self.assertEqual(repeated.hotel_access_expires_at, stay.hotel_access_expires_at)
        self.assertEqual(repeated.checked_out_at, checkout_time)
        self.assertEqual(IdentityAccessAudit.objects.filter(stay=stay).count(), first_audit_count)
        with patch("api.check_in.timezone.now", return_value=checkout_time + timedelta(days=60) - timedelta(microseconds=1)):
            self.assertTrue(hotel_identity_access_state(stay)["isActive"])
        with patch("api.check_in.timezone.now", return_value=checkout_time + timedelta(days=60)):
            self.assertFalse(hotel_identity_access_state(stay)["isActive"])

    def test_existing_revocation_is_not_reopened_by_checkout(self):
        stay = self.shared_stay()
        room = Room.objects.create(property=self.property, number="R60", nightly_rate_minor=10000)
        stay = confirm_hotel_check_in(property_=self.property, stay=stay, room_id=room.id, actor=self.owner)
        # Historical guests could revoke in house. Keep that state terminal.
        stay.status = StayStatus.REVOKED
        stay.hotel_access_expires_at = timezone.now() - timedelta(days=1)
        stay.save()
        old_revocation = stay.hotel_access_expires_at
        stay = checkout_hotel_stay(property_=self.property, stay=stay, actor=self.owner)
        self.assertEqual(stay.status, StayStatus.REVOKED)
        self.assertEqual(stay.hotel_access_expires_at, old_revocation)
        self.assertFalse(hotel_identity_access_state(stay)["isActive"])
        storage = Mock()
        self.assertEqual(purge_expired_shared_identity_images(storage=storage, batch_size=100), (2, 0))
