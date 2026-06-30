from django.urls import path

from .views import health

urlpatterns = [
    path("", health, name="root-health"),
    path("api/health/", health, name="health"),
]
