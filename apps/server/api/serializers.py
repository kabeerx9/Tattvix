from datetime import date

from django.conf import settings
from rest_framework import serializers

from .models import (
    CompanionProfile,
    GuestProfile,
    IdentityDocument,
    IdentityDocumentImageSide,
    OperationalStayStatus,
)


SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"


class OrganizationInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, trim_whitespace=True)
    slug = serializers.RegexField(regex=SLUG_PATTERN, max_length=255)


class PropertyInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, trim_whitespace=True)
    slug = serializers.RegexField(regex=SLUG_PATTERN, max_length=255)


class PlatformOrganizationOnboardingSerializer(serializers.Serializer):
    organization = OrganizationInputSerializer()
    property = PropertyInputSerializer()
    ownerEmail = serializers.EmailField(source="owner_email")


class PlatformUserSearchQuerySerializer(serializers.Serializer):
    email = serializers.CharField(min_length=3, max_length=100, trim_whitespace=True)


class PlatformUserSearchResultSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    email = serializers.EmailField(read_only=True)
    firstName = serializers.CharField(source="first_name", read_only=True)
    lastName = serializers.CharField(source="last_name", read_only=True)
    imageUrl = serializers.CharField(source="image_url", read_only=True)


class PlatformPropertyCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, trim_whitespace=True)
    slug = serializers.RegexField(regex=SLUG_PATTERN, max_length=255)


class PlatformMemberAddSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=("OWNER", "MANAGER", "RECEPTION"))


class PlatformMemberUpdateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(
        choices=("OWNER", "MANAGER", "RECEPTION"),
        required=False,
    )
    isActive = serializers.BooleanField(source="is_active", required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide role or isActive.")
        return attrs


class PlatformOversightAuditQuerySerializer(serializers.Serializer):
    organizationSlug = serializers.RegexField(
        regex=SLUG_PATTERN,
        source="organization_slug",
        required=False,
    )
    action = serializers.CharField(
        max_length=32,
        required=False,
        trim_whitespace=True,
    )
    limit = serializers.IntegerField(required=False, min_value=1, max_value=200)


class GuestProfileSerializer(serializers.ModelSerializer):
    legalFirstName = serializers.CharField(
        source="legal_first_name", allow_blank=True, max_length=150
    )
    legalLastName = serializers.CharField(
        source="legal_last_name", allow_blank=True, max_length=150
    )
    phoneNumber = serializers.CharField(
        source="phone_number", allow_blank=True, max_length=32
    )
    dateOfBirth = serializers.DateField(
        source="date_of_birth", allow_null=True, required=False
    )
    addressLine1 = serializers.CharField(
        source="address_line_1", allow_blank=True, max_length=255
    )
    addressLine2 = serializers.CharField(
        source="address_line_2", allow_blank=True, max_length=255
    )
    stateRegion = serializers.CharField(
        source="state_region", allow_blank=True, max_length=120
    )
    postalCode = serializers.CharField(
        source="postal_code", allow_blank=True, max_length=20
    )
    emergencyContactName = serializers.CharField(
        source="emergency_contact_name", allow_blank=True, max_length=150
    )
    emergencyContactPhone = serializers.CharField(
        source="emergency_contact_phone", allow_blank=True, max_length=32
    )

    class Meta:
        model = GuestProfile
        fields = [
            "legalFirstName",
            "legalLastName",
            "phoneNumber",
            "dateOfBirth",
            "nationality",
            "addressLine1",
            "addressLine2",
            "city",
            "stateRegion",
            "postalCode",
            "country",
            "emergencyContactName",
            "emergencyContactPhone",
        ]
        extra_kwargs = {
            "nationality": {"allow_blank": True, "max_length": 2},
            "city": {"allow_blank": True, "max_length": 120},
            "country": {"allow_blank": True, "max_length": 2},
        }

    def validate_dateOfBirth(self, value):
        if value is not None and value >= date.today():
            raise serializers.ValidationError("Date of birth must be in the past.")
        return value

    def validate_nationality(self, value):
        return self._validate_country_code(value)

    def validate_country(self, value):
        return self._validate_country_code(value)

    @staticmethod
    def _validate_country_code(value: str) -> str:
        normalized = value.strip().upper()
        if normalized and (len(normalized) != 2 or not normalized.isalpha()):
            raise serializers.ValidationError("Use a two-letter country code.")
        return normalized


class CompanionProfileSerializer(serializers.ModelSerializer):
    legalFirstName = serializers.CharField(
        source="legal_first_name", allow_blank=True, max_length=150, required=False
    )
    legalLastName = serializers.CharField(
        source="legal_last_name", allow_blank=True, max_length=150, required=False
    )
    dateOfBirth = serializers.DateField(
        source="date_of_birth", allow_null=True, required=False
    )

    class Meta:
        model = CompanionProfile
        fields = [
            "legalFirstName",
            "legalLastName",
            "dateOfBirth",
            "relationship",
            "nationality",
        ]
        extra_kwargs = {
            "relationship": {"allow_blank": True, "max_length": 100},
            "nationality": {"allow_blank": True, "max_length": 2},
        }

    def validate_dateOfBirth(self, value):
        if value is not None and value >= date.today():
            raise serializers.ValidationError("Date of birth must be in the past.")
        return value

    def validate_nationality(self, value):
        return GuestProfileSerializer._validate_country_code(value)


class IdentityDocumentSerializer(serializers.ModelSerializer):
    documentType = serializers.ChoiceField(
        source="document_type",
        choices=IdentityDocument._meta.get_field("document_type").choices,
        allow_blank=True,
        required=False,
    )
    documentNumber = serializers.CharField(
        source="document_number",
        allow_blank=True,
        max_length=64,
        required=False,
    )
    nameOnDocument = serializers.CharField(
        source="name_on_document",
        allow_blank=True,
        max_length=300,
        required=False,
    )
    issuingCountry = serializers.CharField(
        source="issuing_country",
        allow_blank=True,
        max_length=2,
        required=False,
    )
    expiryDate = serializers.DateField(
        source="expiry_date",
        allow_null=True,
        required=False,
    )

    class Meta:
        model = IdentityDocument
        fields = [
            "documentType",
            "documentNumber",
            "nameOnDocument",
            "issuingCountry",
            "expiryDate",
        ]

    def validate_issuingCountry(self, value):
        return GuestProfileSerializer._validate_country_code(value)


class IdentityDocumentImageUploadSerializer(serializers.Serializer):
    side = serializers.ChoiceField(choices=IdentityDocumentImageSide.choices)
    contentType = serializers.ChoiceField(
        source="content_type",
        choices=sorted(settings.OBJECT_STORAGE_ALLOWED_CONTENT_TYPES),
    )
    contentLength = serializers.IntegerField(
        source="content_length",
        min_value=1,
        max_value=settings.OBJECT_STORAGE_MAX_UPLOAD_BYTES,
    )


class IdentityDocumentImageFinalizeSerializer(serializers.Serializer):
    side = serializers.ChoiceField(choices=IdentityDocumentImageSide.choices)
    objectKey = serializers.CharField(source="object_key", max_length=1024)


class IdentityDocumentImageAccessSerializer(serializers.Serializer):
    side = serializers.ChoiceField(choices=IdentityDocumentImageSide.choices)


class GuestCheckInSubmitSerializer(serializers.Serializer):
    identityDocumentId = serializers.IntegerField(
        source="identity_document_id",
        min_value=1,
    )
    companionIds = serializers.ListField(
        source="companion_ids",
        child=serializers.IntegerField(min_value=1),
        allow_empty=True,
        max_length=20,
    )
    consentAccepted = serializers.BooleanField(
        source="consent_accepted",
    )

    def validate_consentAccepted(self, value):
        if value is not True:
            raise serializers.ValidationError(
                "Explicit consent is required before sharing."
            )
        return value


class HotelStayImageAccessSerializer(serializers.Serializer):
    side = serializers.ChoiceField(choices=IdentityDocumentImageSide.choices)


class HotelRoomCreateSerializer(serializers.Serializer):
    number = serializers.CharField(max_length=32, trim_whitespace=True)
    floor = serializers.CharField(
        max_length=32,
        trim_whitespace=True,
        allow_blank=True,
        required=False,
        default="",
    )
    roomType = serializers.CharField(
        source="room_type",
        max_length=100,
        trim_whitespace=True,
        allow_blank=True,
        required=False,
        default="",
    )


class HotelRoomStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=("VACANT", "CLEANING", "MAINTENANCE")
    )


class HotelStayCheckInSerializer(serializers.Serializer):
    roomId = serializers.IntegerField(source="room_id", min_value=1)


class HotelStayListQuerySerializer(serializers.Serializer):
    search = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        max_length=200,
    )
    operationalStatus = serializers.ChoiceField(
        source="operational_status",
        choices=OperationalStayStatus.choices,
        required=False,
    )
    dateFrom = serializers.DateField(source="date_from", required=False)
    dateTo = serializers.DateField(source="date_to", required=False)

    def validate_search(self, value):
        value = value.strip()
        if value and len(value) < 2:
            raise serializers.ValidationError(
                "Search must be at least 2 characters."
            )
        return value or None


class HotelReportDateRangeQuerySerializer(serializers.Serializer):
    dateFrom = serializers.DateField(source="date_from", required=False)
    dateTo = serializers.DateField(source="date_to", required=False)

    def validate(self, attrs):
        date_from = attrs.get("date_from")
        date_to = attrs.get("date_to")
        if date_from and date_to and date_from > date_to:
            raise serializers.ValidationError(
                "dateFrom must not be after dateTo."
            )
        return attrs
