from django.urls import path

from .check_in_views import (
    check_in_context,
    guest_check_in_submit,
    guest_stay_list,
    guest_stay_revoke,
    hotel_check_in_token_create,
    hotel_stay_close,
    hotel_stay_detail,
    hotel_stay_image_access,
    hotel_stay_list,
)
from .guest_views import (
    guest_companion_detail,
    guest_companion_list,
    guest_profile,
)
from .identity_document_views import (
    guest_identity_document_detail,
    guest_identity_document_image_access,
    guest_identity_document_list,
    guest_identity_document_upload,
    guest_identity_document_upload_complete,
)
from .platform_views import platform_organization_list, platform_user_list
from .views import clerk_webhook, health, me

urlpatterns = [
    path("", health, name="root-health"),
    path("api/health/", health, name="health"),
    path("api/me/", me, name="me"),
    path(
        "api/check-in/<str:raw_token>/",
        check_in_context,
        name="check-in-context",
    ),
    path(
        "api/check-in/<str:raw_token>/submit/",
        guest_check_in_submit,
        name="guest-check-in-submit",
    ),
    path(
        "api/guest/stays/",
        guest_stay_list,
        name="guest-stay-list",
    ),
    path(
        "api/guest/stays/<uuid:stay_id>/revoke/",
        guest_stay_revoke,
        name="guest-stay-revoke",
    ),
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
        "api/guest/identity-documents/",
        guest_identity_document_list,
        name="guest-identity-document-list",
    ),
    path(
        "api/guest/identity-documents/<int:document_id>/",
        guest_identity_document_detail,
        name="guest-identity-document-detail",
    ),
    path(
        "api/guest/identity-documents/<int:document_id>/uploads/",
        guest_identity_document_upload,
        name="guest-identity-document-upload",
    ),
    path(
        "api/guest/identity-documents/<int:document_id>/uploads/complete/",
        guest_identity_document_upload_complete,
        name="guest-identity-document-upload-complete",
    ),
    path(
        "api/guest/identity-documents/<int:document_id>/images/access/",
        guest_identity_document_image_access,
        name="guest-identity-document-image-access",
    ),
    path(
        "api/platform/organizations/",
        platform_organization_list,
        name="platform-organization-list",
    ),
    path(
        (
            "api/hotel/<slug:organization_slug>/<slug:property_slug>/"
            "check-in-tokens/"
        ),
        hotel_check_in_token_create,
        name="hotel-check-in-token-create",
    ),
    path(
        "api/hotel/<slug:organization_slug>/<slug:property_slug>/stays/",
        hotel_stay_list,
        name="hotel-stay-list",
    ),
    path(
        (
            "api/hotel/<slug:organization_slug>/<slug:property_slug>/"
            "stays/<uuid:stay_id>/"
        ),
        hotel_stay_detail,
        name="hotel-stay-detail",
    ),
    path(
        (
            "api/hotel/<slug:organization_slug>/<slug:property_slug>/"
            "stays/<uuid:stay_id>/images/access/"
        ),
        hotel_stay_image_access,
        name="hotel-stay-image-access",
    ),
    path(
        (
            "api/hotel/<slug:organization_slug>/<slug:property_slug>/"
            "stays/<uuid:stay_id>/close/"
        ),
        hotel_stay_close,
        name="hotel-stay-close",
    ),
    path("api/platform/users/", platform_user_list, name="platform-user-list"),
    path("api/webhooks/clerk/", clerk_webhook, name="clerk-webhook"),
]
