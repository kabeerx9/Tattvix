import logging
from dataclasses import dataclass
from datetime import date
from uuid import uuid4

from django.db import transaction

from .models import (
    IdentityDocument,
    IdentityDocumentImage,
    IdentityDocumentImageSide,
    IdentityDocumentType,
)
from .object_storage import (
    ObjectMetadata,
    PresignedUpload,
    PrivateObjectStorage,
)


logger = logging.getLogger(__name__)

DOCUMENT_RULES = {
    IdentityDocumentType.AADHAAR: {
        "expiry_date_required": False,
        "back_image_required": True,
    },
    IdentityDocumentType.PASSPORT: {
        "expiry_date_required": True,
        "back_image_required": False,
    },
    IdentityDocumentType.DRIVING_LICENCE: {
        "expiry_date_required": True,
        "back_image_required": True,
    },
    IdentityDocumentType.VOTER_ID: {
        "expiry_date_required": False,
        "back_image_required": True,
    },
}

CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}


class IdentityDocumentUploadError(Exception):
    """Base error for a document image upload that cannot be completed."""


class IdentityDocumentUploadConflict(IdentityDocumentUploadError):
    """Raised when a stale or mismatched pending upload is finalized."""


class IdentityDocumentImageMissing(IdentityDocumentUploadError):
    """Raised when the requested document image is not available."""


@dataclass(frozen=True)
class PendingDocumentUpload:
    upload: PresignedUpload


def build_identity_document_list_payload(documents) -> dict:
    return {
        "documents": [
            build_identity_document_payload(document) for document in documents
        ],
    }


def build_identity_document_payload(document: IdentityDocument) -> dict:
    images = {image.side: image for image in _document_images(document)}
    rules = document_rules(document.document_type)
    missing_fields = identity_document_missing_fields(
        document,
        images=images,
        rules=rules,
    )

    return {
        "id": document.id,
        "documentType": document.document_type,
        "documentNumber": document.document_number,
        "nameOnDocument": document.name_on_document,
        "issuingCountry": document.issuing_country,
        "expiryDate": document.expiry_date.isoformat()
        if document.expiry_date
        else None,
        "requirements": {
            "expiryDateRequired": rules["expiry_date_required"],
            "backImageRequired": rules["back_image_required"],
        },
        "images": {
            "front": _image_payload(images.get(IdentityDocumentImageSide.FRONT)),
            "back": _image_payload(images.get(IdentityDocumentImageSide.BACK)),
        },
        "readiness": {
            "isReady": len(missing_fields) == 0,
            "missingFields": missing_fields,
        },
        "createdAt": _isoformat(document.created_at),
        "updatedAt": _isoformat(document.updated_at),
    }


def identity_document_missing_fields(
    document: IdentityDocument,
    *,
    images: dict[str, IdentityDocumentImage] | None = None,
    rules: dict[str, bool] | None = None,
) -> list[str]:
    images = images or {image.side: image for image in _document_images(document)}
    rules = rules or document_rules(document.document_type)
    missing_fields = []

    if not document.document_type:
        missing_fields.append("documentType")
    if not document.document_number:
        missing_fields.append("documentNumber")
    if not document.name_on_document:
        missing_fields.append("nameOnDocument")
    if not document.issuing_country:
        missing_fields.append("issuingCountry")
    if rules["expiry_date_required"] and (
        not document.expiry_date or document.expiry_date <= date.today()
    ):
        missing_fields.append("expiryDate")
    if not _has_ready_image(images.get(IdentityDocumentImageSide.FRONT)):
        missing_fields.append("frontImage")
    if rules["back_image_required"] and not _has_ready_image(
        images.get(IdentityDocumentImageSide.BACK)
    ):
        missing_fields.append("backImage")

    return missing_fields


def is_identity_document_ready(document: IdentityDocument) -> bool:
    return len(identity_document_missing_fields(document)) == 0


def document_rules(document_type: str) -> dict[str, bool]:
    return DOCUMENT_RULES.get(
        document_type,
        {
            "expiry_date_required": False,
            "back_image_required": False,
        },
    )


def create_pending_upload(
    *,
    document: IdentityDocument,
    side: str,
    content_type: str,
    content_length: int,
    storage: PrivateObjectStorage,
) -> PendingDocumentUpload:
    extension = CONTENT_TYPE_EXTENSIONS.get(content_type, "bin")
    object_key = (
        f"users/{document.user_id}/identity-documents/{document.id}/"
        f"{side.lower()}/{uuid4().hex}.{extension}"
    )
    upload = storage.create_upload_url(
        object_key=object_key,
        content_type=content_type,
        content_length=content_length,
    )

    with transaction.atomic():
        image, _created = (
            IdentityDocumentImage.objects.select_for_update().get_or_create(
                document=document,
                side=side,
            )
        )
        replaced_pending_key = image.pending_object_key
        image.pending_object_key = object_key
        image.pending_content_type = content_type
        image.pending_content_length = content_length
        image.save(
            update_fields=[
                "pending_object_key",
                "pending_content_type",
                "pending_content_length",
                "updated_at",
            ]
        )

    if replaced_pending_key and replaced_pending_key != object_key:
        _delete_without_interrupting(storage, replaced_pending_key)

    return PendingDocumentUpload(upload=upload)


def finalize_pending_upload(
    *,
    document: IdentityDocument,
    side: str,
    object_key: str,
    storage: PrivateObjectStorage,
) -> IdentityDocument:
    image = IdentityDocumentImage.objects.filter(
        document=document,
        side=side,
    ).first()
    if not image or image.pending_object_key != object_key:
        raise IdentityDocumentUploadConflict(
            "This upload is no longer current. Please select the file again."
        )

    metadata = storage.get_object_metadata(object_key=object_key)
    _validate_uploaded_object(image=image, metadata=metadata)

    with transaction.atomic():
        locked_image = IdentityDocumentImage.objects.select_for_update().get(
            document=document,
            side=side,
        )
        if locked_image.pending_object_key != object_key:
            raise IdentityDocumentUploadConflict(
                "This upload is no longer current. Please select the file again."
            )

        replaced_object_key = locked_image.object_key
        locked_image.object_key = locked_image.pending_object_key
        locked_image.content_type = locked_image.pending_content_type
        locked_image.content_length = locked_image.pending_content_length
        locked_image.pending_object_key = ""
        locked_image.pending_content_type = ""
        locked_image.pending_content_length = None
        locked_image.save(
            update_fields=[
                "object_key",
                "content_type",
                "content_length",
                "pending_object_key",
                "pending_content_type",
                "pending_content_length",
                "updated_at",
            ]
        )

    if replaced_object_key and replaced_object_key != object_key:
        _delete_without_interrupting(storage, replaced_object_key)

    return (
        IdentityDocument.objects.prefetch_related("images")
        .select_related("user")
        .get(id=document.id)
    )


def create_image_access_url(
    *,
    document: IdentityDocument,
    side: str,
    storage: PrivateObjectStorage,
) -> str:
    image = IdentityDocumentImage.objects.filter(
        document=document,
        side=side,
    ).first()
    if not image or not image.object_key:
        raise IdentityDocumentImageMissing("This document image has not been uploaded.")
    return storage.create_download_url(object_key=image.object_key)


def delete_identity_document(
    *,
    document: IdentityDocument,
    storage: PrivateObjectStorage,
) -> None:
    object_keys = {
        object_key
        for image in document.images.all()
        for object_key in (image.object_key, image.pending_object_key)
        if object_key
    }
    for object_key in object_keys:
        storage.delete_object(object_key=object_key)
    document.delete()


def _validate_uploaded_object(
    *,
    image: IdentityDocumentImage,
    metadata: ObjectMetadata,
) -> None:
    if (
        metadata.content_type != image.pending_content_type
        or metadata.content_length != image.pending_content_length
    ):
        raise IdentityDocumentUploadConflict(
            "The uploaded file does not match the authorized upload."
        )


def _delete_without_interrupting(
    storage: PrivateObjectStorage,
    object_key: str,
) -> None:
    try:
        storage.delete_object(object_key=object_key)
    except Exception:
        logger.warning("Could not clean up a replaced identity-document object.")


def _document_images(document: IdentityDocument):
    prefetched_images = getattr(document, "_prefetched_objects_cache", {}).get("images")
    if prefetched_images is not None:
        return prefetched_images
    return document.images.all()


def _has_ready_image(image: IdentityDocumentImage | None) -> bool:
    return bool(
        image
        and image.object_key
        and image.content_type
        and image.content_length
    )


def _image_payload(image: IdentityDocumentImage | None) -> dict:
    return {
        "isUploaded": _has_ready_image(image),
        "contentType": image.content_type if image and image.object_key else "",
        "contentLength": image.content_length
        if image and image.object_key
        else None,
    }


def _isoformat(value) -> str:
    return value.isoformat().replace("+00:00", "Z")
