from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

PURGE = "api.views.purge_expired_shared_identity_images"
CRON_SECRET = "a-long-random-cron-secret-for-tests"


class PurgeIdentityImagesCronTests(APITestCase):
    url = reverse("cron-purge-identity-images")

    def test_missing_secret_configuration_fails_closed(self):
        # An unset CRON_SECRET must never mean "no auth required".
        with override_settings(CRON_SECRET=""), patch(PURGE) as purge:
            response = self.client.get(
                self.url, HTTP_AUTHORIZATION="Bearer "
            )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        purge.assert_not_called()

    def test_missing_or_wrong_bearer_token_is_rejected(self):
        with override_settings(CRON_SECRET=CRON_SECRET), patch(PURGE) as purge:
            missing = self.client.get(self.url)
            wrong = self.client.get(self.url, HTTP_AUTHORIZATION="Bearer nope")
            unprefixed = self.client.get(self.url, HTTP_AUTHORIZATION=CRON_SECRET)

        for response in (missing, wrong, unprefixed):
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        purge.assert_not_called()

    def test_valid_secret_runs_purge_and_reports_counts(self):
        with (
            override_settings(CRON_SECRET=CRON_SECRET),
            patch(PURGE, return_value=(3, 0)) as purge,
        ):
            response = self.client.get(
                self.url, HTTP_AUTHORIZATION=f"Bearer {CRON_SECRET}"
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), {"deleted": 3, "deferred": 0})
        purge.assert_called_once()

    def test_deferred_deletions_surface_as_server_error(self):
        # Vercel marks non-2xx cron runs as failed, which is the only alert
        # we get that storage deletes are stuck.
        with (
            override_settings(CRON_SECRET=CRON_SECRET),
            patch(PURGE, return_value=(1, 2)),
        ):
            response = self.client.get(
                self.url, HTTP_AUTHORIZATION=f"Bearer {CRON_SECRET}"
            )

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.json(), {"deleted": 1, "deferred": 2})
