from datetime import date, timedelta
from types import SimpleNamespace

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from api.companion_profile import is_minor
from api.models import ClerkUser, CompanionProfile


class CompanionProfileApiTests(APITestCase):
    def setUp(self):
        self.user = ClerkUser.objects.create(
            clerk_id="user_companion_owner",
            email="guest@example.com",
        )
        self.other_user = ClerkUser.objects.create(
            clerk_id="user_companion_other",
            email="other@example.com",
        )
        self.client.force_authenticate(
            user=SimpleNamespace(is_authenticated=True, db_user=self.user)
        )
        self.collection_url = reverse("guest-companion-list")

    def test_list_returns_only_the_authenticated_users_companions(self):
        own_companion = CompanionProfile.objects.create(
            user=self.user,
            legal_first_name="Aisha",
        )
        CompanionProfile.objects.create(
            user=self.other_user,
            legal_first_name="Private",
        )

        response = self.client.get(self.collection_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["companions"][0]["id"], own_companion.id)
        self.assertEqual(len(response.data["companions"]), 1)

    def test_post_creates_an_incomplete_companion_for_the_authenticated_user(self):
        response = self.client.post(
            self.collection_url,
            {"legalFirstName": "Aisha"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        companion = CompanionProfile.objects.get()
        self.assertEqual(companion.user, self.user)
        self.assertEqual(response.data["legalFirstName"], "Aisha")
        self.assertIsNone(response.data["isMinor"])
        self.assertEqual(
            response.data["readiness"]["missingFields"],
            ["legalLastName", "dateOfBirth", "relationship", "nationality"],
        )
        self.assertFalse(response.data["readiness"]["isReady"])

    def test_post_normalizes_nationality_and_derives_readiness_and_age(self):
        response = self.client.post(
            self.collection_url,
            self._complete_payload(date_of_birth=self._years_ago(10).isoformat()),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["nationality"], "IN")
        self.assertTrue(response.data["isMinor"])
        self.assertTrue(response.data["readiness"]["isReady"])
        self.assertEqual(response.data["readiness"]["missingFields"], [])

    def test_detail_crud_is_scoped_to_the_authenticated_owner(self):
        companion = CompanionProfile.objects.create(
            user=self.user,
            legal_first_name="Aisha",
        )
        detail_url = reverse("guest-companion-detail", args=[companion.id])

        get_response = self.client.get(detail_url)
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_response.data["id"], companion.id)

        update_response = self.client.put(
            detail_url,
            self._complete_payload(date_of_birth=self._years_ago(30).isoformat()),
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertFalse(update_response.data["isMinor"])

        delete_response = self.client.delete(detail_url)
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(CompanionProfile.objects.filter(id=companion.id).exists())

    def test_another_users_companion_is_not_readable_or_mutable(self):
        companion = CompanionProfile.objects.create(
            user=self.other_user,
            legal_first_name="Private",
        )
        detail_url = reverse("guest-companion-detail", args=[companion.id])

        get_response = self.client.get(detail_url)
        put_response = self.client.put(
            detail_url,
            self._complete_payload(date_of_birth=self._years_ago(20).isoformat()),
            format="json",
        )
        delete_response = self.client.delete(detail_url)

        self.assertEqual(get_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(put_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(delete_response.status_code, status.HTTP_404_NOT_FOUND)

        self.assertTrue(CompanionProfile.objects.filter(id=companion.id).exists())

    def test_rejects_future_dates_and_invalid_country_codes(self):
        future_payload = self._complete_payload(
            date_of_birth=(date.today() + timedelta(days=1)).isoformat()
        )
        future_response = self.client.post(
            self.collection_url,
            future_payload,
            format="json",
        )
        self.assertEqual(future_response.status_code, status.HTTP_400_BAD_REQUEST)

        invalid_country_payload = self._complete_payload(
            date_of_birth=self._years_ago(20).isoformat()
        )
        invalid_country_payload["nationality"] = "IND"
        invalid_country_response = self.client.post(
            self.collection_url,
            invalid_country_payload,
            format="json",
        )
        self.assertEqual(
            invalid_country_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(CompanionProfile.objects.count(), 0)

    def test_age_boundary_is_calculated_without_a_persisted_flag(self):
        birthday = date(2008, 7, 12)

        self.assertTrue(is_minor(birthday, today=date(2026, 7, 11)))
        self.assertFalse(is_minor(birthday, today=date(2026, 7, 12)))
        self.assertIsNone(is_minor(None, today=date(2026, 7, 12)))

    @override_settings(COMPANION_MINOR_AGE_YEARS=21)
    def test_age_threshold_uses_the_launch_jurisdiction_setting(self):
        self.assertTrue(is_minor(date(2006, 7, 12), today=date(2026, 7, 12)))

    @staticmethod
    def _complete_payload(*, date_of_birth: str):
        return {
            "legalFirstName": "Aisha",
            "legalLastName": "Khan",
            "dateOfBirth": date_of_birth,
            "relationship": "Sibling",
            "nationality": "in",
        }

    @staticmethod
    def _years_ago(years: int) -> date:
        today = date.today()
        try:
            return today.replace(year=today.year - years)
        except ValueError:
            return today.replace(year=today.year - years, day=28)
