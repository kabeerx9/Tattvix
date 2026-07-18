from django.core.management.base import BaseCommand, CommandError

from api.check_in import purge_expired_shared_identity_images
from api.object_storage import PrivateObjectStorage


class Command(BaseCommand):
    help = (
        "Delete copied identity-document images after their hotel access window "
        "ends, while retaining stay and audit metadata."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Maximum number of expired images to process.",
        )

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        if batch_size < 1 or batch_size > 5000:
            raise CommandError("Batch size must be between 1 and 5000.")

        deleted_count, failed_count = purge_expired_shared_identity_images(
            storage=PrivateObjectStorage(),
            batch_size=batch_size,
        )
        self.stdout.write(
            self.style.SUCCESS(
                f"Expired identity image cleanup complete: "
                f"{deleted_count} deleted, {failed_count} deferred."
            )
        )
        if failed_count:
            raise CommandError(
                "Some expired images could not be deleted; rerun the command."
            )
