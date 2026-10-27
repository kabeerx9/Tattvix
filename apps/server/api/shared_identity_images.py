"""Private snapshot rendering; guest-owned upload keys are read-only here."""

from .image_watermark import watermark_identity_image
from .models import PendingIdentityImageCleanup

WATERMARK_METADATA_KEY = "tattwix-watermark-version"
WATERMARK_VERSION = "1"


def prepare_shared_image(*, storage, source_key, destination_key, property_name, shared_at):
    data = storage.read_image_bytes(object_key=source_key)
    rendered = watermark_identity_image(data, property_name=property_name, shared_at=shared_at)
    storage.put_image_bytes(
        object_key=destination_key,
        data=rendered,
        metadata={WATERMARK_METADATA_KEY: WATERMARK_VERSION},
    )
    return len(rendered)


def ensure_shared_image_watermarked(*, storage, image, property_name, shared_at):
    """Caller holds stay/image locks, including against retention purge.

    Metadata, rather than DB state, makes a successful object write idempotent
    even when the following database commit fails. Conversion reuses the private
    snapshot key so purge cannot lose track of a legacy raw object.
    """
    metadata = storage.get_object_metadata(object_key=image.object_key)
    if metadata.metadata.get(WATERMARK_METADATA_KEY) == WATERMARK_VERSION:
        # A previous successful PUT may have outlived a DB rollback.
        if (image.content_type, image.content_length) != (metadata.content_type, metadata.content_length):
            image.content_type = metadata.content_type
            image.content_length = metadata.content_length
            image.save(update_fields=["content_type", "content_length"])
        return
    size = prepare_shared_image(
        storage=storage,
        source_key=image.object_key,
        destination_key=image.object_key,
        property_name=property_name,
        shared_at=shared_at,
    )
    image.content_type = "image/jpeg"
    image.content_length = size
    image.save(update_fields=["content_type", "content_length"])


def cleanup_prepared_images(*, storage, preparations):
    """Failed deletes retain a durable key for the existing retention job."""
    for preparation in preparations:
        try:
            storage.delete_object(object_key=preparation.object_key)
        except Exception:
            continue
        PendingIdentityImageCleanup.objects.filter(id=preparation.id).delete()
