from datetime import date, timedelta
from types import SimpleNamespace

from django.urls import reverse
from rest_framework.test import APITestCase

from api.models import ClerkUser, GuestProfile


class GuestProfileApiTests(APITestCase):
    def setUp(self):
        self.user = ClerkUser.objects.create(
            clerk_id="user_profile_owner",
            email="guest@example.com",
        )
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=self.user)
        )
        self.url = reverse("guest-profile")

    def test_get_returns_empty_draft_without_creating_a_record(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["legalFirstName"], "")
        self.assertIn("identityDocuments", response.data["readiness"]["missingFields"])
        self.assertFalse(response.data["readiness"]["isReady"])
        self.assertEqual(GuestProfile.objects.count(), 0)

    def test_put_creates_and_then_updates_only_the_authenticated_users_profile(self):
        payload = self._complete_profile_payload()

        create_response = self.client.put(self.url, payload, format="json")
        self.assertEqual(create_response.status_code, 200)
        self.assertEqual(GuestProfile.objects.count(), 1)
        self.assertEqual(create_response.data["profile"]["nationality"], "IN")
        self.assertEqual(
            create_response.data["readiness"]["missingFields"],
            ["identityDocuments"],
        )

        payload["city"] = "Dehradun"
        update_response = self.client.put(self.url, payload, format="json")

        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(GuestProfile.objects.count(), 1)
        self.assertEqual(update_response.data["profile"]["city"], "Dehradun")

    def test_user_cannot_read_another_users_profile(self):
        GuestProfile.objects.create(
            user=self.user,
            legal_first_name="Private",
        )
        other_user = ClerkUser.objects.create(
            clerk_id="user_other",
            email="other@example.com",
        )
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=other_user)
        )

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["profile"]["legalFirstName"], "")
        self.assertEqual(GuestProfile.objects.count(), 1)

    def test_rejects_future_date_of_birth(self):
        payload = self._complete_profile_payload()
        payload["dateOfBirth"] = (date.today() + timedelta(days=1)).isoformat()

        response = self.client.put(self.url, payload, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(GuestProfile.objects.count(), 0)

    @staticmethod
    def _complete_profile_payload():
        return {
            "legalFirstName": "Kabeer",
            "legalLastName": "Joshi",
            "phoneNumber": "+919876543210",
            "dateOfBirth": "1995-04-12",
            "nationality": "in",
            "addressLine1": "12 Example Road",
            "addressLine2": "",
            "city": "Kotdwar",
            "stateRegion": "Uttarakhand",
            "postalCode": "246149",
            "country": "in",
            "emergencyContactName": "",
            "emergencyContactPhone": "",
        }
