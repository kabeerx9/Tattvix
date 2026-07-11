from datetime import date

from django.conf import settings

from .models import CompanionProfile


COMPANION_REQUIRED_FIELDS = (
    ("legalFirstName", "legal_first_name"),
    ("legalLastName", "legal_last_name"),
    ("dateOfBirth", "date_of_birth"),
    ("relationship", "relationship"),
    ("nationality", "nationality"),
)


def build_companion_list_payload(companions) -> dict:
    return {
        "companions": [
            build_companion_profile_payload(companion) for companion in companions
        ]
    }


def build_companion_profile_payload(companion: CompanionProfile) -> dict:
    missing_fields = [
        api_name
        for api_name, model_name in COMPANION_REQUIRED_FIELDS
        if not getattr(companion, model_name)
    ]

    return {
        "id": companion.id,
        "legalFirstName": companion.legal_first_name,
        "legalLastName": companion.legal_last_name,
        "dateOfBirth": companion.date_of_birth.isoformat()
        if companion.date_of_birth
        else None,
        "relationship": companion.relationship,
        "nationality": companion.nationality,
        "isMinor": is_minor(companion.date_of_birth),
        "readiness": {
            "isReady": len(missing_fields) == 0,
            "missingFields": missing_fields,
        },
        "createdAt": _isoformat(companion.created_at),
        "updatedAt": _isoformat(companion.updated_at),
    }


def is_minor(
    date_of_birth: date | None,
    *,
    today: date | None = None,
) -> bool | None:
    if date_of_birth is None:
        return None

    as_of = today or date.today()
    age = as_of.year - date_of_birth.year - (
        (as_of.month, as_of.day) < (date_of_birth.month, date_of_birth.day)
    )
    return age < settings.COMPANION_MINOR_AGE_YEARS


def _isoformat(value) -> str:
    return value.isoformat().replace("+00:00", "Z")
