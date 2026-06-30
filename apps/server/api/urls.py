from django.urls import path

from .views import clerk_webhook, health, me

urlpatterns = [
    path("", health, name="root-health"),
    path("api/health/", health, name="health"),
    path("api/me/", me, name="me"),
    path("api/webhooks/clerk/", clerk_webhook, name="clerk-webhook"),
]
