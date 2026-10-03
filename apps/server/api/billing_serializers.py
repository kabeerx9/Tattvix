import re

from rest_framework import serializers

from .hotel_registration_serializers import (
    StrictSerializer,
    HotelRegistrationSubmitSerializer,
)


class RoomRateSerializer(StrictSerializer):
    nightlyRateMinor = serializers.IntegerField(
        source="nightly_rate_minor", min_value=0, max_value=100000000, allow_null=True
    )


class ExtraChargeSerializer(StrictSerializer):
    requestId = serializers.UUIDField(source="request_id")
    description = serializers.CharField(max_length=200)
    quantity = serializers.IntegerField(min_value=1, max_value=9999)
    unitPriceMinor = serializers.IntegerField(
        source="unit_price_minor", min_value=0, max_value=100000000
    )


class VoidChargeSerializer(StrictSerializer):
    reason = serializers.CharField(max_length=500)


class PropertyDetailsSerializer(StrictSerializer):
    address = serializers.CharField(max_length=1000, allow_blank=True, required=False)
    contactPhone = serializers.CharField(
        source="contact_phone", max_length=32, allow_blank=True, required=False
    )
    description = serializers.CharField(
        max_length=2000, allow_blank=True, required=False
    )
    amenities = serializers.ListField(
        child=serializers.CharField(max_length=80), max_length=30, required=False
    )
    checkInTime = serializers.CharField(
        source="check_in_time", allow_blank=True, required=False
    )
    checkOutTime = serializers.CharField(
        source="check_out_time", allow_blank=True, required=False
    )

    def validate_contactPhone(self, value):
        if not value:
            return value
        return HotelRegistrationSubmitSerializer().validate_contactPhone(value)

    def validate_checkInTime(self, value):
        if value and not re.fullmatch(r"(?:[01][0-9]|2[0-3]):[0-5][0-9]", value):
            raise serializers.ValidationError("Use HH:mm, or leave blank.")
        return value

    validate_checkOutTime = validate_checkInTime
