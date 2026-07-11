from .models import GuestProfile


PROFILE_REQUIRED_FIELDS = (
    ("legalFirstName", "legal_first_name"),
    ("legalLastName", "legal_last_name"),
    ("phoneNumber", "phone_number"),
    ("dateOfBirth", "date_of_birth"),
    ("nationality", "nationality"),
    ("addressLine1", "address_line_1"),
    ("city", "city"),
    ("stateRegion", "state_region"),
    ("postalCode", "postal_code"),
    ("country", "country"),
)


def build_guest_profile_payload(profile: GuestProfile | None) -> dict:
    values = {
        "legalFirstName": profile.legal_first_name if profile else "",
        "legalLastName": profile.legal_last_name if profile else "",
        "phoneNumber": profile.phone_number if profile else "",
        "dateOfBirth": profile.date_of_birth.isoformat()
        if profile and profile.date_of_birth
        else None,
        "nationality": profile.nationality if profile else "",
        "addressLine1": profile.address_line_1 if profile else "",
        "addressLine2": profile.address_line_2 if profile else "",
        "city": profile.city if profile else "",
        "stateRegion": profile.state_region if profile else "",
        "postalCode": profile.postal_code if profile else "",
        "country": profile.country if profile else "",
        "emergencyContactName": profile.emergency_contact_name if profile else "",
        "emergencyContactPhone": profile.emergency_contact_phone if profile else "",
    }
    missing_fields = [
        api_name
        for api_name, model_name in PROFILE_REQUIRED_FIELDS
        if not profile or not getattr(profile, model_name)
    ]

    # Identity-document CRUD is the next implementation slice. Until at least one
    # complete document exists, the approved MVP contract says the profile is not ready.
    missing_fields.append("identityDocuments")

    return {
        "profile": values,
        "readiness": {
            "isReady": len(missing_fields) == 0,
            "missingFields": missing_fields,
        },
        "updatedAt": _isoformat(profile.updated_at) if profile else None,
    }


def _isoformat(value) -> str:
    return value.isoformat().replace("+00:00", "Z")
