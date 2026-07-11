from django.core.management.base import BaseCommand, CommandError

from api.models import ClerkUser, PlatformRole, PlatformRoleAssignment


class Command(BaseCommand):
    help = "Grant the Tattvix super-admin platform role to an existing Clerk user."

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            required=True,
            help="Email address of an existing Clerk-synced Tattvix account.",
        )

    def handle(self, *args, **options):
        email = options["email"].strip().lower()
        if not email:
            raise CommandError("Email cannot be empty.")

        users = list(ClerkUser.objects.filter(email__iexact=email).order_by("id")[:2])
        if not users:
            raise CommandError(
                "No Tattvix account exists for this email. The user must sign in once "
                "before super-admin access can be granted."
            )
        if len(users) > 1:
            raise CommandError(
                "Multiple Tattvix accounts use this email; resolve the duplicate before "
                "granting privileged access."
            )

        assignment, created = PlatformRoleAssignment.objects.update_or_create(
            user=users[0],
            defaults={"role": PlatformRole.SUPER_ADMIN},
        )

        if created:
            message = f"Granted SUPER_ADMIN to {assignment.user.email}."
        else:
            message = f"{assignment.user.email} already has SUPER_ADMIN access."

        self.stdout.write(self.style.SUCCESS(message))
