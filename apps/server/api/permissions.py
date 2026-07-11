from rest_framework.permissions import BasePermission

from .models import PlatformRole, PlatformRoleAssignment


class IsPlatformAdmin(BasePermission):
    message = "Platform administrator access is required."

    def has_permission(self, request, view):
        db_user = getattr(request.user, "db_user", None)
        if db_user is None:
            return False

        return PlatformRoleAssignment.objects.filter(
            user=db_user,
            role=PlatformRole.SUPER_ADMIN,
        ).exists()
