from rest_framework import serializers

from .hotel_registration_serializers import StrictSerializer
from .models import MembershipRole


class PositiveIdentifierField(serializers.IntegerField):
    """DRF otherwise accepts True/False as 1/0 on integer identifiers."""

    def to_internal_value(self, data):
        if isinstance(data, bool):
            self.fail("invalid")
        return super().to_internal_value(data)


class TeamUserSearchQuerySerializer(StrictSerializer):
    email = serializers.CharField(min_length=3, max_length=100, trim_whitespace=True)


class TeamMemberAddSerializer(StrictSerializer):
    userId = PositiveIdentifierField(source="user_id", min_value=1)
    role = serializers.ChoiceField(choices=MembershipRole.values)
    propertyIds = serializers.ListField(
        source="property_ids", child=PositiveIdentifierField(min_value=1), required=True
    )

    def validate(self, attrs):
        ids = attrs["property_ids"]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError({"propertyIds": "Property IDs must be unique."})
        if attrs["role"] == MembershipRole.OWNER and ids:
            raise serializers.ValidationError({"propertyIds": "Owners have access to all properties."})
        if attrs["role"] != MembershipRole.OWNER and not ids:
            raise serializers.ValidationError({"propertyIds": "Select at least one property."})
        return attrs


class TeamMemberUpdateSerializer(StrictSerializer):
    role = serializers.ChoiceField(choices=MembershipRole.values, required=False)
    propertyIds = serializers.ListField(
        source="property_ids", child=PositiveIdentifierField(min_value=1), required=False
    )
    isActive = serializers.BooleanField(source="is_active", required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Provide role, propertyIds, or isActive.")
        ids = attrs.get("property_ids")
        if ids is not None and len(ids) != len(set(ids)):
            raise serializers.ValidationError({"propertyIds": "Property IDs must be unique."})
        if attrs.get("role") == MembershipRole.OWNER and ids:
            raise serializers.ValidationError({"propertyIds": "Owners have access to all properties."})
        return attrs
