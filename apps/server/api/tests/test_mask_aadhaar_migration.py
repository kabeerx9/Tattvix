from importlib import import_module

from django.apps import apps
from django.test import TestCase

from api.models import ClerkUser, IdentityDocument

migration = import_module("api.migrations.0014_mask_stored_aadhaar_numbers")


class MaskStoredAadhaarNumbersTests(TestCase):
    def setUp(self):
        self.user = ClerkUser.objects.create(
            clerk_id="user_migration_owner",
            email="migration@example.com",
        )

    def _document(self, document_type, number):
        document = IdentityDocument.objects.create(user=self.user, document_type=document_type)
        # update() skips the model's save-time masking, like rows written before it.
        IdentityDocument.objects.filter(pk=document.pk).update(document_number=number)
        return document

    def test_masks_full_aadhaar_and_leaves_other_documents(self):
        aadhaar = self._document("AADHAAR", "1234 5678 9012")
        already_masked = self._document("AADHAAR", "XXXX XXXX 4821")
        passport = self._document("PASSPORT", "123456789012")

        migration.mask_stored_aadhaar_numbers(apps, None)

        aadhaar.refresh_from_db()
        already_masked.refresh_from_db()
        passport.refresh_from_db()
        self.assertEqual(aadhaar.document_number, "XXXX XXXX 9012")
        self.assertEqual(already_masked.document_number, "XXXX XXXX 4821")
        self.assertEqual(passport.document_number, "123456789012")

    def test_masks_snapshot_payloads_for_guest_and_companions(self):
        payload, changed = migration._mask_document_payload(
            {"documentType": "AADHAAR", "documentNumber": "1234-5678-9012"}
        )
        self.assertTrue(changed)
        self.assertEqual(payload["documentNumber"], "XXXX XXXX 9012")

        payload, changed = migration._mask_document_payload(
            {"documentType": "PASSPORT", "documentNumber": "123456789012"}
        )
        self.assertFalse(changed)
        self.assertEqual(payload["documentNumber"], "123456789012")
