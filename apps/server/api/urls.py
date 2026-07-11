from django.urls import path

from .guest_views import (
    guest_companion_detail,
    guest_companion_list,
    guest_profile,
)
from .platform_views import platform_organization_list, platform_user_list
from .views import clerk_webhook, health, me

urlpatterns = [
    path("", health, name="root-health"),
    path("api/health/", health, name="health"),
    path("api/me/", me, name="me"),
    path("api/guest/profile/", guest_profile, name="guest-profile"),
    path(
        "api/guest/companions/",
        guest_companion_list,
        name="guest-companion-list",
    ),
    path(
        "api/guest/companions/<int:companion_id>/",
        guest_companion_detail,
        name="guest-companion-detail",
    ),
    path(
        "api/platform/organizations/",
        platform_organization_list,
        name="platform-organization-list",
    ),
    path("api/platform/users/", platform_user_list, name="platform-user-list"),
    path("api/webhooks/clerk/", clerk_webhook, name="clerk-webhook"),
]
