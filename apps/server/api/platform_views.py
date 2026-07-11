from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .permissions import IsPlatformAdmin
from .platform_onboarding import PlatformOnboardingError, onboard_organization
from .models import ClerkUser
from .serializers import (
    PlatformOrganizationOnboardingSerializer,
    PlatformUserSearchQuerySerializer,
    PlatformUserSearchResultSerializer,
)


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsPlatformAdmin])
def platform_organization_list(request):
    serializer = PlatformOrganizationOnboardingSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    try:
        result = onboard_organization(**serializer.validated_data)
    except PlatformOnboardingError as exc:
        return Response(
            {"error": exc.message, "code": exc.code},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return Response(result, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsPlatformAdmin])
def platform_user_list(request):
    query_serializer = PlatformUserSearchQuerySerializer(data=request.query_params)
    query_serializer.is_valid(raise_exception=True)

    users = ClerkUser.objects.filter(
        email__icontains=query_serializer.validated_data["email"]
    ).exclude(email="").order_by("email", "id")[:10]
    result_serializer = PlatformUserSearchResultSerializer(users, many=True)
    return Response({"users": result_serializer.data})
