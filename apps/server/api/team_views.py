from django.http import Http404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from .models import ClerkUser
from .team import TeamError, add_team_member, build_team_payload, require_owner, team_member_payload, update_team_member
from .team_serializers import TeamMemberAddSerializer, TeamMemberUpdateSerializer, TeamUserSearchQuerySerializer


class TeamUserSearchThrottle(ScopedRateThrottle):
    """Authenticate through Clerk's request wrapper, but rate-limit the DB user."""

    scope = "team-user-search"

    def get_cache_key(self, request, view):
        user = getattr(request.user, "db_user", request.user)
        return self.cache_format % {"scope": self.scope, "ident": user.pk}


def _error(exc):
    return Response({"error": exc.message, "code": exc.code}, status=exc.status_code)


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def hotel_team(request, organization_slug: str):
    organization = require_owner(organization_slug=organization_slug, actor=request.user.db_user)
    if request.method == "GET":
        return Response(build_team_payload(organization=organization, actor=request.user.db_user))
    serializer = TeamMemberAddSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        membership = add_team_member(organization=organization, actor=request.user.db_user, **serializer.validated_data)
    except TeamError as exc:
        return _error(exc)
    return Response(team_member_payload(membership), status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@throttle_classes([TeamUserSearchThrottle])
def hotel_team_users(request, organization_slug: str):
    require_owner(organization_slug=organization_slug, actor=request.user.db_user)
    query = TeamUserSearchQuerySerializer(data=request.query_params)
    query.is_valid(raise_exception=True)
    users = ClerkUser.objects.filter(email__icontains=query.validated_data["email"]).exclude(email="").order_by("email", "id")[:10]
    return Response({"users": [{"id": u.id, "email": u.email, "firstName": u.first_name, "lastName": u.last_name} for u in users]}, headers={"Cache-Control": "no-store"})


hotel_team_users.cls.throttle_scope = "team-user-search"


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def hotel_team_member(request, organization_slug: str, membership_id: int):
    organization = require_owner(organization_slug=organization_slug, actor=request.user.db_user)
    serializer = TeamMemberUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        membership = update_team_member(organization=organization, actor=request.user.db_user, membership_id=membership_id, **serializer.validated_data)
    except TeamError as exc:
        return _error(exc)
    return Response(team_member_payload(membership))
