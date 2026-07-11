from io import StringIO

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from api.models import ClerkUser, PlatformRole, PlatformRoleAssignment


class GrantSuperAdminCommandTests(TestCase):
    def test_grants_super_admin_to_existing_user_case_insensitively(self):
        user = ClerkUser.objects.create(
            clerk_id="user_1",
            email="admin@example.com",
        )
        output = StringIO()

        call_command(
            "grant_super_admin",
            email="ADMIN@EXAMPLE.COM",
            stdout=output,
        )

        assignment = PlatformRoleAssignment.objects.get(user=user)
        self.assertEqual(assignment.role, PlatformRole.SUPER_ADMIN)
        self.assertIn("Granted SUPER_ADMIN", output.getvalue())

    def test_is_idempotent(self):
        user = ClerkUser.objects.create(
            clerk_id="user_1",
            email="admin@example.com",
        )
        PlatformRoleAssignment.objects.create(
            user=user,
            role=PlatformRole.SUPER_ADMIN,
        )
        output = StringIO()

        call_command(
            "grant_super_admin",
            email="admin@example.com",
            stdout=output,
        )

        self.assertEqual(PlatformRoleAssignment.objects.filter(user=user).count(), 1)
        self.assertIn("already has SUPER_ADMIN", output.getvalue())

    def test_rejects_an_email_without_an_existing_account(self):
        with self.assertRaisesMessage(CommandError, "must sign in once"):
            call_command("grant_super_admin", email="missing@example.com")

    def test_rejects_duplicate_email_matches(self):
        ClerkUser.objects.create(clerk_id="user_1", email="duplicate@example.com")
        ClerkUser.objects.create(clerk_id="user_2", email="DUPLICATE@example.com")

        with self.assertRaisesMessage(CommandError, "Multiple Tattvix accounts"):
            call_command("grant_super_admin", email="duplicate@example.com")
