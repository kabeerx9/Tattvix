from django.urls import path

from .platform_views import platform_organization_list, platform_user_list
from .views import clerk_webhook, health, me

urlpatterns = [
    path("", health, name="root-health"),
    path("api/health/", health, name="health"),
    path("api/me/", me, name="me"),
    path(
        "api/platform/organizations/",
        platform_organization_list,
        name="platform-organization-list",
    ),
    path("api/platform/users/", platform_user_list, name="platform-user-list"),
    path("api/webhooks/clerk/", clerk_webhook, name="clerk-webhook"),
]
