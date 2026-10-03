import re

from rest_framework import serializers

from .models import HotelRegistrationStatus


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data):
        if isinstance(data, dict):
            unknown = set(data) - set(self.fields)
            if unknown:
                raise serializers.ValidationError(
                    {key: "Unknown field." for key in sorted(unknown)}
                )
        return super().to_internal_value(data)


class HotelRegistrationSubmitSerializer(StrictSerializer):
    hotelName = serializers.CharField(source="hotel_name", max_length=255)
    address = serializers.CharField(max_length=1000)
    contactPhone = serializers.CharField(source="contact_phone", max_length=32)

    def validate_contactPhone(self, value):
        if (
            not re.fullmatch(r"\+?[0-9\s-]+", value)
            or not 7 <= len(re.findall(r"[0-9]", value)) <= 20
        ):
            raise serializers.ValidationError(
                "Enter a phone number with 7–20 digits; spaces, hyphens and a leading + are allowed."
            )
        return value


class HotelRegistrationReviewSerializer(StrictSerializer):
    decision = serializers.ChoiceField(choices=["APPROVE", "REJECT"])
    rejectionReason = serializers.CharField(
        source="rejection_reason",
        max_length=1000,
        required=False,
        allow_blank=True,
        default="",
    )

    def validate(self, attrs):
        if attrs["decision"] == "REJECT" and not attrs["rejection_reason"]:
            raise serializers.ValidationError(
                {"rejectionReason": "A rejection reason is required."}
            )
        return attrs


class HotelRegistrationQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=HotelRegistrationStatus.values, default="PENDING"
    )
