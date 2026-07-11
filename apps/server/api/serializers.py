from datetime import date

from rest_framework import serializers

from .models import CompanionProfile, GuestProfile


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
