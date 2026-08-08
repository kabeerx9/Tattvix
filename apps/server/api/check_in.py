from dataclasses import dataclass
from datetime import timedelta
from hashlib import sha256
from secrets import token_urlsafe
from uuid import uuid4

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from .companion_profile import build_companion_profile_payload
from .guest_profile import build_guest_profile_payload
from .identity_documents import (
    build_identity_document_payload,
    is_identity_document_ready,
)
from .models import (
    ClerkUser,
    CompanionProfile,
    ConsentGrant,
    GuestProfile,
    HotelQrToken,
    IdentityAccessAction,
    IdentityAccessAudit,
    IdentityDocument,
    SharedIdentityDocumentImage,
    SharedIdentitySnapshot,
    Stay,
    StayStatus,
)
from .object_storage import PrivateObjectStorage


CONSENT_VERSION = "2026-07-18"
CONSENT_DATA_CATEGORIES = [
    "guest_profile",
    "identity_document",
    "document_images",
    "selected_companions",
]
CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


@dataclass(frozen=True)
class CheckInError(Exception):
    code: str
    message: str


def generate_hotel_qr_token(*, property_, actor: ClerkUser) -> dict:
    raw_token = token_urlsafe(32)
    now = timezone.now()
    expires_at = now + timedelta(days=settings.HOTEL_QR_TOKEN_TTL_DAYS)

    with transaction.atomic():
        HotelQrToken.objects.filter(
            property=property_,
            revoked_at__isnull=True,
        ).update(revoked_at=now)
        qr_token = HotelQrToken.objects.create(
            property=property_,
            token_digest=_token_digest(raw_token),
            token_hint=raw_token[:12],
            created_by=actor,
            expires_at=expires_at,
        )

    return {
        "token": raw_token,
        "checkInPath": f"/check-in/{raw_token}",
        "expiresAt": _isoformat(qr_token.expires_at),
        "property": _property_payload(property_),
    }


def get_valid_hotel_qr_token(raw_token: str) -> HotelQrToken:
    if not raw_token or len(raw_token) > 256:
        raise CheckInError("invalid_qr", "This check-in code is invalid.")

    qr_token = (
        HotelQrToken.objects.filter(
            token_digest=_token_digest(raw_token),
            revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
            property__is_active=True,
            property__organization__is_active=True,
        )
        .select_related("property__organization")
        .first()
    )
    if qr_token is None:
        raise CheckInError(
            "invalid_qr",
            "This check-in code is invalid, expired, or no longer active.",
        )
    return qr_token


def build_check_in_context(
    *,
    qr_token: HotelQrToken,
    guest: ClerkUser | None,
) -> dict:
    existing_stay = None
    if guest is not None:
        stay = (
            Stay.objects.filter(qr_token=qr_token, guest=guest)
            .exclude(status=StayStatus.DRAFT)
            .order_by("-submitted_at", "-created_at")
            .first()
        )
        if stay is not None:
            existing_stay = build_guest_stay_payload(stay)

    return {
        "property": _property_payload(qr_token.property),
        "tokenExpiresAt": _isoformat(qr_token.expires_at),
        "accessPolicy": {
            "maximumDays": settings.HOTEL_IDENTITY_MAX_ACCESS_DAYS,
            "postCheckoutGraceHours": settings.HOTEL_IDENTITY_POST_CLOSE_GRACE_HOURS,
        },
        "existingStay": existing_stay,
    }


def submit_guest_identity(
    *,
    qr_token: HotelQrToken,
    guest: ClerkUser,
    identity_document_id: int,
    companion_ids: list[int],
    storage: PrivateObjectStorage,
) -> Stay:
    existing_stay = (
        Stay.objects.filter(
            qr_token=qr_token,
            guest=guest,
            status=StayStatus.SUBMITTED,
        )
        .select_related("property")
        .first()
    )
    if existing_stay is not None:
        return existing_stay

    profile = GuestProfile.objects.filter(user=guest).first()
    document = (
        IdentityDocument.objects.filter(
            id=identity_document_id,
            user=guest,
        )
        .prefetch_related("images")
        .first()
    )
    if profile is None or document is None:
        raise CheckInError(
            "profile_not_ready",
            "Complete your guest profile and choose a valid identity document.",
        )
    if not is_identity_document_ready(document):
        raise CheckInError(
            "document_not_ready",
            "The selected identity document is incomplete or expired.",
        )

    profile_payload = build_guest_profile_payload(
        profile,
        has_complete_identity_document=True,
    )
    if not profile_payload["readiness"]["isReady"]:
        raise CheckInError(
            "profile_not_ready",
            "Complete your guest profile before sharing it with the hotel.",
        )

    unique_companion_ids = list(dict.fromkeys(companion_ids))
    companions = list(
        CompanionProfile.objects.filter(
            id__in=unique_companion_ids,
            user=guest,
        ).order_by("id")
    )
    if len(companions) != len(unique_companion_ids):
        raise CheckInError(
            "invalid_companions",
            "One or more selected companions are unavailable.",
        )
    companion_payloads = [
        build_companion_profile_payload(companion) for companion in companions
    ]
    if any(not payload["readiness"]["isReady"] for payload in companion_payloads):
        raise CheckInError(
            "companion_not_ready",
            "Complete every selected companion before sharing.",
        )

    try:
        stay, _created = Stay.objects.get_or_create(
            qr_token=qr_token,
            guest=guest,
            status=StayStatus.DRAFT,
            defaults={"property": qr_token.property},
        )
    except IntegrityError:
        stay = Stay.objects.get(
            qr_token=qr_token,
            guest=guest,
            status=StayStatus.DRAFT,
        )

    source_images = [
        image
        for image in document.images.all()
        if image.object_key and image.content_type and image.content_length
    ]
    copied_images = []
    copy_batch_id = uuid4().hex
    try:
        for image in source_images:
            extension = CONTENT_TYPE_EXTENSIONS.get(image.content_type, "bin")
            destination_key = (
                f"stays/{stay.public_id}/shared-identity/"
                f"{copy_batch_id}/{image.side.lower()}.{extension}"
            )
            storage.copy_object(
                source_key=image.object_key,
                destination_key=destination_key,
                content_type=image.content_type,
            )
            copied_images.append(
                {
                    "side": image.side,
                    "object_key": destination_key,
                    "content_type": image.content_type,
                    "content_length": image.content_length,
                }
            )

        now = timezone.now()
        already_submitted_stay = None
        with transaction.atomic():
            locked_stay = Stay.objects.select_for_update().get(id=stay.id)
            if locked_stay.status != StayStatus.DRAFT:
                already_submitted_stay = locked_stay
            else:
                consent = ConsentGrant.objects.create(
                    stay=locked_stay,
                    granted_by=guest,
                    consent_version=CONSENT_VERSION,
                    data_categories=CONSENT_DATA_CATEGORIES,
                    granted_at=now,
                )
                snapshot = SharedIdentitySnapshot.objects.create(
                    stay=locked_stay,
                    guest_data=profile_payload["profile"],
                    companion_data=[
                        {
                            key: value
                            for key, value in payload.items()
                            if key
                            in {
                                "legalFirstName",
                                "legalLastName",
                                "dateOfBirth",
                                "relationship",
                                "nationality",
                                "isMinor",
                            }
                        }
                        for payload in companion_payloads
                    ],
                    document_data=_document_snapshot_payload(document),
                )
                SharedIdentityDocumentImage.objects.bulk_create(
                    [
                        SharedIdentityDocumentImage(snapshot=snapshot, **image)
                        for image in copied_images
                    ]
                )
                locked_stay.status = StayStatus.SUBMITTED
                locked_stay.submitted_at = consent.granted_at
                locked_stay.hotel_access_expires_at = now + timedelta(
                    days=settings.HOTEL_IDENTITY_MAX_ACCESS_DAYS
                )
                locked_stay.save(
                    update_fields=[
                        "status",
                        "submitted_at",
                        "hotel_access_expires_at",
                        "updated_at",
                    ]
                )

        if already_submitted_stay is not None:
            for image in copied_images:
                try:
                    storage.delete_object(object_key=image["object_key"])
                except Exception:
                    pass
            return already_submitted_stay
        return locked_stay
    except Exception:
        for image in copied_images:
            try:
                storage.delete_object(object_key=image["object_key"])
            except Exception:
                pass
        raise


def revoke_guest_consent(*, stay: Stay, guest: ClerkUser) -> Stay:
    now = timezone.now()
    with transaction.atomic():
        locked_stay = Stay.objects.select_for_update().get(id=stay.id, guest=guest)
        if locked_stay.status == StayStatus.REVOKED:
            return locked_stay
        if locked_stay.status == StayStatus.DRAFT:
            raise CheckInError(
                "stay_not_submitted",
                "This check-in has not been submitted.",
            )

        locked_stay.status = StayStatus.REVOKED
        locked_stay.hotel_access_expires_at = now
        locked_stay.save(
            update_fields=["status", "hotel_access_expires_at", "updated_at"]
        )
        consent = ConsentGrant.objects.get(stay=locked_stay)
        consent.revoked_at = now
        consent.save(update_fields=["revoked_at"])
        IdentityAccessAudit.objects.create(
            stay=locked_stay,
            actor=guest,
            action=IdentityAccessAction.CONSENT_REVOKED,
        )
        return locked_stay


def close_hotel_stay(*, stay: Stay, actor: ClerkUser) -> Stay:
    now = timezone.now()
    grace_expires_at = now + timedelta(
        hours=settings.HOTEL_IDENTITY_POST_CLOSE_GRACE_HOURS
    )
    with transaction.atomic():
        locked_stay = Stay.objects.select_for_update().get(id=stay.id)
        if locked_stay.status == StayStatus.REVOKED:
            raise CheckInError(
                "consent_revoked",
                "The guest has revoked hotel access.",
            )
        if locked_stay.status == StayStatus.DRAFT:
            raise CheckInError(
                "stay_not_submitted",
                "This check-in has not been submitted.",
            )
        if locked_stay.status != StayStatus.CLOSED:
            locked_stay.status = StayStatus.CLOSED
            locked_stay.closed_at = now
            if (
                locked_stay.hotel_access_expires_at is None
                or locked_stay.hotel_access_expires_at > grace_expires_at
            ):
                locked_stay.hotel_access_expires_at = grace_expires_at
            locked_stay.save(
                update_fields=[
                    "status",
                    "closed_at",
                    "hotel_access_expires_at",
                    "updated_at",
                ]
            )
            IdentityAccessAudit.objects.create(
                stay=locked_stay,
                actor=actor,
                action=IdentityAccessAction.STAY_CLOSED,
            )
        return locked_stay


def hotel_identity_access_state(stay: Stay) -> dict:
    if stay.status == StayStatus.REVOKED:
        return {"isActive": False, "reason": "REVOKED"}
    if stay.status == StayStatus.DRAFT or stay.submitted_at is None:
        return {"isActive": False, "reason": "NOT_SUBMITTED"}
    if (
        stay.hotel_access_expires_at is None
        or stay.hotel_access_expires_at <= timezone.now()
    ):
        return {"isActive": False, "reason": "EXPIRED"}
    return {"isActive": True, "reason": "ACTIVE"}


def build_guest_stay_payload(stay: Stay) -> dict:
    return {
        "id": str(stay.public_id),
        "status": stay.status,
        "operationalStatus": stay.operational_status,
        "room": _room_payload(stay.room) if stay.room_id else None,
        "submittedAt": _isoformat(stay.submitted_at),
        "closedAt": _isoformat(stay.closed_at),
        "checkedInAt": _isoformat(stay.checked_in_at),
        "checkedOutAt": _isoformat(stay.checked_out_at),
        "hotelAccessExpiresAt": _isoformat(stay.hotel_access_expires_at),
    }


def build_guest_share_payload(stay: Stay) -> dict:
    return {
        **build_guest_stay_payload(stay),
        "property": _property_payload(stay.property),
        "accessEvents": [
            {
                "action": event.action,
                "imageSide": event.image_side or None,
                "createdAt": _isoformat(event.created_at),
            }
            for event in stay.identity_access_events.all()
        ],
    }


def build_hotel_stay_list_item(stay: Stay) -> dict:
    snapshot = getattr(stay, "identity_snapshot", None)
    guest_data = snapshot.guest_data if snapshot is not None else {}
    return {
        **build_guest_stay_payload(stay),
        "guestName": " ".join(
            value
            for value in (
                guest_data.get("legalFirstName", ""),
                guest_data.get("legalLastName", ""),
            )
            if value
        )
        or "Guest",
        "companionCount": len(snapshot.companion_data) if snapshot else 0,
        "identityAccess": {
            **hotel_identity_access_state(stay),
            "expiresAt": _isoformat(stay.hotel_access_expires_at),
        },
    }


def build_hotel_stay_detail(stay: Stay) -> dict:
    item = build_hotel_stay_list_item(stay)
    access = item["identityAccess"]
    if not access["isActive"]:
        return {**item, "snapshot": None}

    snapshot = stay.identity_snapshot
    images = sorted(
        snapshot.document_images.all(),
        key=lambda image: image.side,
    )
    return {
        **item,
        "snapshot": {
            "guest": snapshot.guest_data,
            "companions": snapshot.companion_data,
            "document": snapshot.document_data,
            "images": [{"side": image.side} for image in images],
            "sharedAt": _isoformat(snapshot.created_at),
        },
    }


def purge_expired_shared_identity_images(
    *,
    storage: PrivateObjectStorage,
    batch_size: int,
) -> tuple[int, int]:
    images = list(
        SharedIdentityDocumentImage.objects.filter(
            snapshot__stay__hotel_access_expires_at__lte=timezone.now(),
        )
        .order_by("id")[:batch_size]
    )
    deleted_count = 0
    failed_count = 0
    for image in images:
        try:
            storage.delete_object(object_key=image.object_key)
        except Exception:
            failed_count += 1
            continue
        image.delete()
        deleted_count += 1
    return deleted_count, failed_count


def _document_snapshot_payload(document: IdentityDocument) -> dict:
    payload = build_identity_document_payload(document)
    return {
        key: payload[key]
        for key in (
            "documentType",
            "documentNumber",
            "nameOnDocument",
            "issuingCountry",
            "expiryDate",
        )
    }


def _property_payload(property_) -> dict:
    return {
        "id": property_.id,
        "name": property_.name,
        "slug": property_.slug,
        "organization": {
            "id": property_.organization.id,
            "name": property_.organization.name,
            "slug": property_.organization.slug,
        },
    }


def _room_payload(room) -> dict:
    return {
        "id": room.id,
        "number": room.number,
        "floor": room.floor,
        "roomType": room.room_type,
        "status": room.status,
        "isActive": room.is_active,
    }


def _token_digest(raw_token: str) -> str:
    return sha256(raw_token.encode("utf-8")).hexdigest()


def _isoformat(value):
    if value is None:
        return None
    return value.isoformat().replace("+00:00", "Z")
