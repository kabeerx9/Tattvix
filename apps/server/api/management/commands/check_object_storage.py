from botocore.exceptions import BotoCoreError, ClientError
from django.core.management.base import BaseCommand, CommandError

from api.object_storage import PrivateObjectStorage


class Command(BaseCommand):
    help = "Verify that Django can access the configured private object-storage bucket."

    def handle(self, *args, **options):
        try:
            PrivateObjectStorage().check_bucket_access()
        except (BotoCoreError, ClientError, OSError) as exc:
            raise CommandError(
                "Object storage is unavailable. Check that MinIO is running and "
                "that the endpoint, bucket, and credentials are configured."
            ) from exc

        self.stdout.write(
            self.style.SUCCESS("Private object-storage bucket is accessible.")
        )
