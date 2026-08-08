from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .permissions import IsPlatformAdmin
from .platform_admin import (
    add_organization_member,
    build_member_payload,
    build_organization_detail,
    build_property_payload,
    create_organization_property,
    list_organizations,
    update_organization_member,
)
from .platform_onboarding import PlatformOnboardingError, onboard_organization
from .models import ClerkUser, Membership, Organization
from .serializers import (
    PlatformMemberAddSerializer,
    PlatformMemberUpdateSerializer,
    PlatformOrganizationOnboardingSerializer,
    PlatformPropertyCreateSerializer,
    PlatformUserSearchQuerySerializer,
    PlatformUserSearchResultSerializer,
)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated, IsPlatformAdmin])
def platform_organization_list(request):
    if request.method == "GET":
        return Response({"organizations": list_organizations()})

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


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsPlatformAdmin])
def platform_organization_detail(request, organization_slug: str):
    organization = get_object_or_404(Organization, slug=organization_slug)
    return Response(build_organization_detail(organization))


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsPlatformAdmin])
def platform_organization_properties(request, organization_slug: str):
    organization = get_object_or_404(Organization, slug=organization_slug)
    serializer = PlatformPropertyCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        property_ = create_organization_property(
            organization=organization,
            actor=request.user.db_user,
            **serializer.validated_data,
        )
    except PlatformOnboardingError as exc:
        return Response(
            {"error": exc.message, "code": exc.code},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(
        build_property_payload(property_),
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated, IsPlatformAdmin])
def platform_organization_members(request, organization_slug: str):
    organization = get_object_or_404(Organization, slug=organization_slug)
    serializer = PlatformMemberAddSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        membership = add_organization_member(
            organization=organization,
            actor=request.user.db_user,
            **serializer.validated_data,
        )
    except PlatformOnboardingError as exc:
        return Response(
            {"error": exc.message, "code": exc.code},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(
        build_member_payload(membership),
        status=status.HTTP_201_CREATED,
    )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated, IsPlatformAdmin])
def platform_organization_member_detail(
    request,
    organization_slug: str,
    membership_id: int,
):
    organization = get_object_or_404(Organization, slug=organization_slug)
    membership = get_object_or_404(
        Membership,
        id=membership_id,
        organization=organization,
    )
    serializer = PlatformMemberUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        updated = update_organization_member(
            organization=organization,
            membership=membership,
            actor=request.user.db_user,
            role=serializer.validated_data.get("role"),
            is_active=serializer.validated_data.get("is_active"),
        )
    except PlatformOnboardingError as exc:
        return Response(
            {"error": exc.message, "code": exc.code},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return Response(build_member_payload(updated))
