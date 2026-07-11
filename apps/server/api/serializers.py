from rest_framework import serializers


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
