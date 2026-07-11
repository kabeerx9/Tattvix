from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .guest_profile import build_guest_profile_payload
from .models import GuestProfile
from .serializers import GuestProfileSerializer


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
