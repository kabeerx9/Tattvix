from io import StringIO
from unittest.mock import MagicMock, patch

from django.core.management import call_command
from django.test import TestCase

from api.models import (
    ClerkUser,
    CompanionProfile,
    HotelQrToken,
    IdentityAccessAudit,
    IdentityDocument,
    Membership,
    MembershipPropertyAccess,
    MembershipRole,
    OperationalStayStatus,
    Organization,
    Property,
    Room,
    RoomStatus,
    Stay,
)


def _model_counts() -> dict:
    return {
        "users": ClerkUser.objects.count(),
        "organizations": Organization.objects.count(),
        "properties": Property.objects.count(),
        "rooms": Room.objects.count(),
        "qr_tokens": HotelQrToken.objects.count(),
        "stays": Stay.objects.count(),
        "identity_documents": IdentityDocument.objects.count(),
        "companions": CompanionProfile.objects.count(),
        "audits": IdentityAccessAudit.objects.count(),
        "memberships": Membership.objects.count(),
        "property_accesses": MembershipPropertyAccess.objects.count(),
    }


class SeedDevCommandTests(TestCase):
    def _run_seed(self) -> str:
        output = StringIO()
        # PrivateObjectStorage is fully mocked so the command never touches
        # the network: check_bucket_access/put_object/copy_object all
        # resolve as no-op Mock calls instead of real S3/MinIO requests.
        with patch(
            "api.management.commands.seed_dev.PrivateObjectStorage"
        ) as mock_storage_cls:
            mock_storage = MagicMock()
            mock_storage.bucket_name = "seed-test-bucket"
            mock_storage_cls.return_value = mock_storage
            call_command("seed_dev", stdout=output)
        return output.getvalue()

    def test_seed_is_idempotent(self):
        self._run_seed()
        first_counts = _model_counts()

        self._run_seed()
        second_counts = _model_counts()

        self.assertEqual(first_counts, second_counts)
        self.assertGreater(second_counts["stays"], 0)

    def test_every_operational_stay_status_is_represented(self):
        self._run_seed()

        statuses = set(Stay.objects.values_list("operational_status", flat=True))
        self.assertEqual(
            statuses,
            {
                OperationalStayStatus.PENDING_CHECK_IN,
                OperationalStayStatus.CHECKED_IN,
                OperationalStayStatus.CHECKED_OUT,
            },
        )

    def test_reception_membership_is_property_scoped(self):
        self._run_seed()

        reception_user = ClerkUser.objects.get(clerk_id="seed_reception")
        membership = Membership.objects.get(
            user=reception_user, role=MembershipRole.RECEPTION
        )
        self.assertFalse(membership.has_all_properties)

        scoped_properties = set(
            MembershipPropertyAccess.objects.filter(
                membership=membership
            ).values_list("property__slug", flat=True)
        )
        self.assertEqual(scoped_properties, {"jaipur"})

    def test_rooms_cover_every_status(self):
        self._run_seed()

        statuses = set(Room.objects.values_list("status", flat=True))
        self.assertEqual(
            statuses,
            {
                RoomStatus.VACANT,
                RoomStatus.OCCUPIED,
                RoomStatus.CLEANING,
                RoomStatus.MAINTENANCE,
            },
        )

    def test_checked_in_stay_room_is_occupied(self):
        self._run_seed()

        checked_in_stay = Stay.objects.get(
            operational_status=OperationalStayStatus.CHECKED_IN,
            property__slug="jaipur",
        )
        self.assertIsNotNone(checked_in_stay.room)
        self.assertEqual(checked_in_stay.room.status, RoomStatus.OCCUPIED)

    def test_prints_check_in_urls_and_dev_access_hint(self):
        output = self._run_seed()

        self.assertIn("http://localhost:3001/check-in/", output)
        self.assertIn("cannot", output.lower())
