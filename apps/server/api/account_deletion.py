"""Delete a person's own data while keeping what hotels must retain.

A ClerkUser row is never removed: stays, charges, consent grants, audit rows
and hotel requests point at it with PROTECT and form the hotel's legal guest
register. The row is anonymised instead, and everything the person owns
outright (profile, companions, identity documents and their private objects)
is removed. Storage objects go first so a failed delete leaves the database
untouched and a retry is safe.
"""

from __future__ import annotations

import logging

import sentry_sdk
from django.db import transaction
from django.utils import timezone

from .clerk import get_clerk_client
from .exceptions import PayloadAPIException
from .models import (
    ClerkUser,
    CompanionProfile,
    GuestProfile,
    HotelReferralCode,
    IdentityDocument,
    Membership,
    MembershipRole,
    PlatformRoleAssignment,
)
from .object_storage import PrivateObjectStorage
from .user_sync import DELETED_CLERK_ID_PREFIX

logger = logging.getLogger(__name__)

OWNER_HAS_HOTEL_MESSAGE = (
    "You own a hotel on Tattwix. Contact support to hand it over before "
    "deleting your account."
)
STORAGE_UNAVAILABLE_MESSAGE = (
    "Private document storage is temporarily unavailable. Nothing was deleted; "
    "try again in a few minutes."
)


class OwnerHasHotel(PayloadAPIException):
    status_code = 409

    def __init__(self) -> None:
        super().__init__({"error": OWNER_HAS_HOTEL_MESSAGE, "code": "owner_has_hotel"})


class AccountStorageUnavailable(PayloadAPIException):
    status_code = 503

    def __init__(self) -> None:
        super().__init__(
            {"error": STORAGE_UNAVAILABLE_MESSAGE, "code": "storage_unavailable"}
        )


def anonymised_clerk_id(user: ClerkUser) -> str:
    return f"{DELETED_CLERK_ID_PREFIX}{user.id}"


def owns_active_hotel(user: ClerkUser) -> bool:
    return Membership.objects.filter(
        user=user,
        role=MembershipRole.OWNER,
        is_active=True,
        organization__is_active=True,
    ).exists()


def delete_account(
    user: ClerkUser,
    *,
    storage: PrivateObjectStorage,
    delete_clerk_user: bool,
    refuse_owner: bool = True,
) -> bool:
    """Purge the person's data and anonymise their row. Returns False if already done.

    Raises OwnerHasHotel when `refuse_owner` and the person still owns an active
    hotel. Raises AccountStorageUnavailable, with the database unchanged, when a
    private object could not be deleted.
    """
    if user.deleted_at is not None:
        return False
    if refuse_owner and owns_active_hotel(user):
        raise OwnerHasHotel()

    documents = IdentityDocument.objects.filter(user=user).prefetch_related("images")
    object_keys = sorted(
        {
            object_key
            for document in documents
            for image in document.images.all()
            for object_key in (image.object_key, image.pending_object_key)
            if object_key
        }
    )
    for object_key in object_keys:
        try:
            storage.delete_object(object_key=object_key)
        except Exception as exc:
            logger.warning("Account deletion could not remove a private object.")
            raise AccountStorageUnavailable() from exc

    with transaction.atomic():
        locked = ClerkUser.objects.select_for_update().get(id=user.id)
        if locked.deleted_at is not None:
            return False
        if refuse_owner and owns_active_hotel(locked):
            raise OwnerHasHotel()

        # Companions are PROTECTed by their documents, so documents go first.
        IdentityDocument.objects.filter(user=locked).delete()
        CompanionProfile.objects.filter(user=locked).delete()
        GuestProfile.objects.filter(user=locked).delete()
        PlatformRoleAssignment.objects.filter(user=locked).delete()
        memberships = Membership.objects.filter(user=locked, is_active=True)
        if not refuse_owner:
            # Clerk already removed this person; silently deactivating the only
            # owner would orphan the hotel, so leave those and tell Sentry.
            if memberships.filter(role=MembershipRole.OWNER).exists():
                sentry_sdk.capture_message(
                    "Deleted Clerk user still owns a hotel; owner membership kept",
                    level="warning",
                )
            memberships = memberships.exclude(role=MembershipRole.OWNER)
        memberships.update(is_active=False, updated_at=timezone.now())
        # Referral codes attributed to registrations are PROTECTed and carry
        # no personal data; unused ones are just the person's own artefact.
        HotelReferralCode.objects.filter(
            owner=locked, registrations__isnull=True
        ).delete()

        locked.email = ""
        locked.first_name = ""
        locked.last_name = ""
        locked.username = ""
        locked.image_url = ""
        locked.public_metadata = {}
        locked.private_metadata = {}
        locked.unsafe_metadata = {}
        locked.raw_data = {}
        locked.clerk_id = anonymised_clerk_id(locked)
        locked.deleted_at = timezone.now()
        locked.save()

    original_clerk_id = user.clerk_id
    user.refresh_from_db()
    if delete_clerk_user:
        _delete_clerk_user(original_clerk_id)
    return True


def _delete_clerk_user(clerk_id: str) -> None:
    try:
        get_clerk_client().users.delete(user_id=clerk_id, timeout_ms=5000)
    except Exception as exc:
        if getattr(exc, "status_code", None) == 404:
            return
        logger.warning("Clerk user deletion failed after local account deletion.")
        sentry_sdk.capture_message(
            "Clerk user deletion failed after local account deletion",
            level="error",
        )
