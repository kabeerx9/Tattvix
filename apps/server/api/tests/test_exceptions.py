from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from api.exceptions import validation_payload


class ValidationPayloadTests(SimpleTestCase):
    def test_field_errors_lead_with_the_first_message(self):
        error = ValidationError({"documentNumber": ["Enter the 12-digit Aadhaar number."], "issuingCountry": ["Use a two-letter code."]})
        self.assertEqual(
            validation_payload(error.detail),
            {
                "error": "Enter the 12-digit Aadhaar number.",
                "code": "invalid",
                "fields": {"documentNumber": "Enter the 12-digit Aadhaar number.", "issuingCountry": "Use a two-letter code."},
            },
        )

    def test_form_wide_errors_come_before_field_errors(self):
        error = ValidationError({"non_field_errors": ["Dates overlap."], "checkOut": ["Must be after check-in."]})
        payload = validation_payload(error.detail)
        self.assertEqual(payload["error"], "Dates overlap.")
        self.assertEqual(payload["fields"], {"checkOut": "Must be after check-in."})

    def test_a_bare_message_or_nested_list_still_reads(self):
        self.assertEqual(validation_payload(ValidationError("Not allowed.").detail), {"error": "Not allowed.", "code": "invalid"})
        nested = ValidationError({"guests": [{"name": ["Required."]}]})
        self.assertEqual(validation_payload(nested.detail)["fields"], {"guests": "Required."})
