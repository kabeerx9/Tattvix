import re

from django.db import migrations

_AADHAAR_FULL = re.compile(r"\d{12}")


def _mask(value):
    # Same rule as models.mask_aadhaar_number, frozen here so later edits to
    # the model helper can't change what this migration did.
    if not isinstance(value, str):
        return value
    digits = re.sub(r"[\s-]", "", value)
    if _AADHAAR_FULL.fullmatch(digits):
        return f"XXXX XXXX {digits[-4:]}"
    return value


def _mask_document_payload(payload):
    if isinstance(payload, dict) and payload.get("documentType") == "AADHAAR":
        number = payload.get("documentNumber")
        masked = _mask(number)
        if masked != number:
            return {**payload, "documentNumber": masked}, True
    return payload, False


def mask_stored_aadhaar_numbers(apps, schema_editor):
    """Redact full Aadhaar numbers saved before masking at write time (rule R6)."""
    IdentityDocument = apps.get_model("api", "IdentityDocument")
    SharedIdentitySnapshot = apps.get_model("api", "SharedIdentitySnapshot")

    for document in IdentityDocument.objects.filter(document_type="AADHAAR").exclude(
        document_number=""
    ):
        masked = _mask(document.document_number)
        if masked != document.document_number:
            document.document_number = masked
            document.save(update_fields=["document_number"])

    for snapshot in SharedIdentitySnapshot.objects.all():
        document_data, changed = _mask_document_payload(snapshot.document_data)
        companion_data = []
        for companion in snapshot.companion_data or []:
            if isinstance(companion, dict) and companion.get("document"):
                masked_document, companion_changed = _mask_document_payload(
                    companion["document"]
                )
                if companion_changed:
                    companion = {**companion, "document": masked_document}
                    changed = True
            companion_data.append(companion)
        if changed:
            snapshot.document_data = document_data
            snapshot.companion_data = companion_data
            snapshot.save(update_fields=["document_data", "companion_data"])


class Migration(migrations.Migration):
    dependencies = [
        ("api", "0013_propertyphoto"),
    ]

    operations = [
        # Irreversible by design: the full numbers must not be recoverable.
        migrations.RunPython(mask_stored_aadhaar_numbers, migrations.RunPython.noop),
    ]
