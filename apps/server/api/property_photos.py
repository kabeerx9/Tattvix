import logging
from uuid import uuid4

from django.db import transaction

from .identity_documents import CONTENT_TYPE_EXTENSIONS
from .models import PropertyPhoto, Room
from .object_storage import PresignedUpload, PrivateObjectStorage

logger = logging.getLogger(__name__)


class PropertyPhotoError(ValueError):
    """A photo slot or pending upload is invalid."""


def _validate_slot(property_, kind, room_type):
    if kind == PropertyPhoto.Kind.COVER:
        if room_type:
            raise PropertyPhotoError("A cover photo cannot have a room type.")
    elif kind == PropertyPhoto.Kind.ROOM_TYPE:
        if not Room.objects.filter(property=property_, room_type=room_type).exists():
            raise PropertyPhotoError("Unknown room type.")
    else:
        raise PropertyPhotoError("Unknown photo kind.")


def _clear_pending(photo):
    photo.pending_object_key = ""
    photo.pending_content_type = ""
    photo.pending_content_length = None


def _delete_without_interrupting(storage, object_key):
    if not object_key:
        return
    try:
        storage.delete_object(object_key=object_key)
    except Exception:
        logger.warning("Could not clean up a property photo object.")


def create_pending_photo_upload(
    *, property_, kind, room_type, content_type, content_length,
    storage: PrivateObjectStorage,
) -> PresignedUpload:
    _validate_slot(property_, kind, room_type)
    extension = CONTENT_TYPE_EXTENSIONS.get(content_type, "bin")
    key = f"properties/{property_.id}/photos/{kind.lower()}/{uuid4().hex}.{extension}"
    upload = storage.create_upload_url(
        object_key=key, content_type=content_type, content_length=content_length,
    )
    with transaction.atomic():
        photo, _ = PropertyPhoto.objects.select_for_update().get_or_create(
            property=property_, kind=kind, room_type=room_type,
        )
        replaced_pending = photo.pending_object_key
        photo.pending_object_key = key
        photo.pending_content_type = content_type
        photo.pending_content_length = content_length
        photo.save()
    _delete_without_interrupting(storage, replaced_pending)
    return upload


def finalize_photo_upload(*, property_, kind, room_type, storage) -> PropertyPhoto:
    _validate_slot(property_, kind, room_type)
    # Raise validation errors after the transaction so clearing a rejected
    # pending upload is committed rather than rolled back with the exception.
    mismatch = False
    with transaction.atomic():
        photo = PropertyPhoto.objects.select_for_update().filter(
            property=property_, kind=kind, room_type=room_type,
        ).first()
        if not photo or not photo.pending_object_key:
            raise PropertyPhotoError("There is no pending photo upload.")
        pending = photo.pending_object_key
        metadata = storage.get_object_metadata(object_key=pending)
        mismatch = (
            metadata.content_type != photo.pending_content_type
            or metadata.content_length != photo.pending_content_length
        )
        previous = photo.object_key
        if not mismatch:
            photo.object_key = pending
        _clear_pending(photo)
        photo.save()
    if mismatch:
        _delete_without_interrupting(storage, pending)
        raise PropertyPhotoError("The uploaded file does not match the authorized upload.")
    _delete_without_interrupting(storage, previous)
    return photo


def remove_photo(*, property_, kind, room_type, storage):
    _validate_slot(property_, kind, room_type)
    keys = set()
    with transaction.atomic():
        photo = PropertyPhoto.objects.select_for_update().filter(
            property=property_, kind=kind, room_type=room_type,
        ).first()
        if photo:
            keys = {photo.object_key, photo.pending_object_key} - {""}
            photo.delete()
        # The DB no longer references these objects. Cleanup is best-effort:
        # a storage outage must not roll back a row to point at a deleted file.
        def cleanup():
            for key in keys:
                _delete_without_interrupting(storage, key)

        transaction.on_commit(cleanup)


def build_photo_payload(*, property_, storage) -> dict:
    payload = {"cover": None, "roomTypes": []}
    photos = PropertyPhoto.objects.filter(property=property_).exclude(object_key="").order_by("room_type")
    for photo in photos:
        url = storage.create_download_url(object_key=photo.object_key)
        if photo.kind == PropertyPhoto.Kind.COVER:
            payload["cover"] = {"url": url}
        else:
            payload["roomTypes"].append({"roomType": photo.room_type, "url": url})
    return payload
