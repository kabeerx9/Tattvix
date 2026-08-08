from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch

from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle

from api.check_in import generate_hotel_qr_token
from api.models import ClerkUser, HotelQrToken, IdentityDocument, IdentityDocumentType
from api.models import Organization, Property

# DRF's SimpleRateThrottle sets `THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES`
# as a class attribute evaluated once, at rest_framework.throttling import
# time, and every throttle subclass (including our ScopedRateThrottle-based
# ones) shares that same dict object rather than getting its own copy.
# django.test.override_settings(REST_FRAMEWORK=...) updates django.conf.settings
# and fires DRF's setting_changed reload, but that only rebuilds api_settings —
# it does not retroactively patch the dict our throttle classes already
# captured. So override_settings on REST_FRAMEWORK is a no-op for shrinking
# an already-imported throttle's effective rate; the reliable way is
# patch.dict on the shared THROTTLE_RATES dict for the scope key itself.


class ThrottlingTests(APITestCase):
    def setUp(self):
        # DRF throttles key off django.core.cache's default cache, which
        # persists across test methods (unlike the DB, which each
        # APITestCase wraps in a rolled-back transaction). Without this,
        # counts from earlier tests (or earlier methods in this file) leak
        # into whichever test runs next and produce flaky 429s.
        cache.clear()

        self.organization = Organization.objects.create(
            name="Tattvix Hotels",
            slug="tattvix-hotels-throttle",
        )
        self.property = Property.objects.create(
            organization=self.organization,
            name="Tattvix Goa",
            slug="goa-throttle",
        )
        self.owner = ClerkUser.objects.create(
            clerk_id="hotel_owner_throttle",
            email="owner-throttle@example.com",
        )
        token_payload = generate_hotel_qr_token(
            property_=self.property,
            actor=self.owner,
        )
        self.raw_token = token_payload["token"]
        self.qr_token = HotelQrToken.objects.get()

    def test_public_check_in_endpoint_throttles_after_configured_rate(self):
        with patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, {"public-check-in": "2/min"}
        ):
            url = reverse("check-in-context", args=[self.raw_token])
            first = self.client.get(url)
            second = self.client.get(url)
            third = self.client.get(url)

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(third.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_identity_upload_endpoint_throttles_after_configured_rate(self):
        user = ClerkUser.objects.create(
            clerk_id="user_upload_throttle",
            email="upload-throttle@example.com",
        )
        document = IdentityDocument.objects.create(
            user=user,
            document_type=IdentityDocumentType.PASSPORT,
        )
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=user)
        )
        url = reverse(
            "guest-identity-document-upload",
            args=[document.id],
        )

        with patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, {"identity-upload": "2/min"}
        ):
            first = self.client.post(url, {}, format="json")
            second = self.client.post(url, {}, format="json")
            third = self.client.post(url, {}, format="json")

        # The first two requests reach the view (and fail body validation,
        # which is fine — we only care that they weren't throttled).
        self.assertNotEqual(first.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertNotEqual(second.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(third.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_identity_upload_throttle_is_scoped_per_user(self):
        user_a = ClerkUser.objects.create(
            clerk_id="user_upload_a",
            email="upload-a@example.com",
        )
        user_b = ClerkUser.objects.create(
            clerk_id="user_upload_b",
            email="upload-b@example.com",
        )
        document_a = IdentityDocument.objects.create(
            user=user_a,
            document_type=IdentityDocumentType.PASSPORT,
        )
        document_b = IdentityDocument.objects.create(
            user=user_b,
            document_type=IdentityDocumentType.PASSPORT,
        )
        url_a = reverse("guest-identity-document-upload", args=[document_a.id])
        url_b = reverse("guest-identity-document-upload", args=[document_b.id])

        with patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, {"identity-upload": "1/min"}
        ):
            self.client.force_authenticate(
                user=SimpleNamespace(is_authenticated=True, db_user=user_a)
            )
            first = self.client.post(url_a, {}, format="json")
            throttled = self.client.post(url_a, {}, format="json")

            self.client.force_authenticate(
                user=SimpleNamespace(is_authenticated=True, db_user=user_b)
            )
            not_throttled = self.client.post(url_b, {}, format="json")

        self.assertNotEqual(first.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertNotEqual(
            not_throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS
        )

    def test_health_endpoint_is_never_throttled(self):
        with patch.dict(
            ScopedRateThrottle.THROTTLE_RATES, {"public-check-in": "2/min"}
        ):
            url = reverse("health")
            responses = [self.client.get(url) for _ in range(10)]

        for response in responses:
            self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_and_expired_qr_tokens_return_identical_responses(self):
        never_existed_response = self.client.get(
            reverse("check-in-context", args=["this-token-was-never-issued"])
        )

        self.qr_token.expires_at = timezone.now() - timedelta(seconds=1)
        self.qr_token.save(update_fields=["expires_at"])
        expired_response = self.client.get(
            reverse("check-in-context", args=[self.raw_token])
        )

        self.assertEqual(
            never_existed_response.status_code, expired_response.status_code
        )
        self.assertEqual(never_existed_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            set(never_existed_response.data.keys()), set(expired_response.data.keys())
        )
        self.assertEqual(never_existed_response.data, expired_response.data)
