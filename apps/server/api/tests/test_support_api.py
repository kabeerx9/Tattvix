from django.test import override_settings
from rest_framework.test import APITestCase


class SupportApiTests(APITestCase):
    @override_settings(SUPPORT_CALL_PHONE="", SUPPORT_WHATSAPP_PHONE="")
    def test_unconfigured_support_has_no_dialable_placeholder(self):
        response = self.client.get("/api/support/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"callPhone": None, "whatsappPhone": None})
        self.assertIn("no-store", response["Cache-Control"])

    @override_settings(SUPPORT_CALL_PHONE="+91 90000 00001", SUPPORT_WHATSAPP_PHONE="+91-90000-00002")
    def test_public_endpoint_normalizes_independent_server_contacts(self):
        response = self.client.get("/api/support/", HTTP_AUTHORIZATION="Bearer invalid-expired-session")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, {"callPhone": "+919000000001", "whatsappPhone": "+919000000002"})

    @override_settings(SUPPORT_CALL_PHONE="tel:+919000000001?foo=bar", SUPPORT_WHATSAPP_PHONE="https://example.com")
    def test_invalid_configuration_does_not_publish_contact_links(self):
        self.assertEqual(self.client.get("/api/support/").data, {"callPhone": None, "whatsappPhone": None})

    @override_settings(SUPPORT_CALL_PHONE="+910000000000", SUPPORT_WHATSAPP_PHONE="+910000000000")
    def test_placeholder_cannot_be_called_or_messaged(self):
        self.assertEqual(self.client.get("/api/support/").data, {"callPhone": None, "whatsappPhone": None})
