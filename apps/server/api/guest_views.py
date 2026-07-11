from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .companion_profile import (
    build_companion_list_payload,
    build_companion_profile_payload,
)
from .guest_profile import build_guest_profile_payload
from .models import CompanionProfile, GuestProfile
from .serializers import CompanionProfileSerializer, GuestProfileSerializer


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def guest_profile(request):
    user = request.user.db_user
    profile = GuestProfile.objects.filter(user=user).first()

    if request.method == "GET":
        return Response(build_guest_profile_payload(profile))

    serializer = GuestProfileSerializer(instance=profile, data=request.data)
    serializer.is_valid(raise_exception=True)
    saved_profile = serializer.save(user=user)
    return Response(build_guest_profile_payload(saved_profile))


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def guest_companion_list(request):
    user = request.user.db_user

    if request.method == "GET":
        companions = CompanionProfile.objects.filter(user=user).order_by(
            "-updated_at", "-id"
        )
        return Response(build_companion_list_payload(companions))

    serializer = CompanionProfileSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    companion = serializer.save(user=user)
    return Response(
        build_companion_profile_payload(companion),
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def guest_companion_detail(request, companion_id: int):
    companion = get_object_or_404(
        CompanionProfile,
        id=companion_id,
        user=request.user.db_user,
    )

    if request.method == "GET":
        return Response(build_companion_profile_payload(companion))

    if request.method == "PUT":
        serializer = CompanionProfileSerializer(instance=companion, data=request.data)
        serializer.is_valid(raise_exception=True)
        updated_companion = serializer.save()
        return Response(build_companion_profile_payload(updated_companion))

    companion.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
