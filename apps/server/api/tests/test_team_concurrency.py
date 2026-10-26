from concurrent.futures import ThreadPoolExecutor
from queue import Queue
from threading import Barrier
from time import monotonic, sleep

from django.db import connection, connections, transaction
from django.http import Http404
from django.test import TransactionTestCase

from api.models import ClerkUser, Membership, MembershipRole, Organization, PlatformRole, PlatformRoleAssignment, Property
from api.platform_admin import PlatformOnboardingError, update_organization_member
from api.team import TeamError, add_team_member, update_team_member


class TeamConcurrencyTests(TransactionTestCase):
    """These tests require PostgreSQL row locks; do not replace with TestCase."""

    def setUp(self):
        self.assertEqual(connection.vendor, "postgresql", "Team concurrency requires PostgreSQL")
        self.owner_one = ClerkUser.objects.create(clerk_id="team-owner-one", email="one@example.com")
        self.owner_two = ClerkUser.objects.create(clerk_id="team-owner-two", email="two@example.com")
        self.staff = ClerkUser.objects.create(clerk_id="team-staff", email="staff@example.com")
        self.admin = ClerkUser.objects.create(clerk_id="team-admin", email="admin@example.com")
        PlatformRoleAssignment.objects.create(user=self.admin, role=PlatformRole.SUPER_ADMIN)
        self.org = Organization.objects.create(name="Concurrent", slug="concurrent")
        self.property = Property.objects.create(organization=self.org, name="Main", slug="main")
        self.first = Membership.objects.create(user=self.owner_one, organization=self.org, role=MembershipRole.OWNER, has_all_properties=True)
        self.second = Membership.objects.create(user=self.owner_two, organization=self.org, role=MembershipRole.OWNER, has_all_properties=True)

    def worker(self, operation):
        try:
            return operation()
        finally:
            connections.close_all()

    def test_concurrent_duplicate_add_creates_one_membership(self):
        barrier = Barrier(2)

        def add():
            barrier.wait(timeout=5)
            try:
                return add_team_member(organization=self.org, actor=self.owner_one, user_id=self.staff.id, role=MembershipRole.MANAGER, property_ids=[self.property.id]).id
            except TeamError as exc:
                return exc.code

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = [future.result(timeout=10) for future in [pool.submit(self.worker, add) for _ in range(2)]]
        self.assertEqual(Membership.objects.filter(organization=self.org, user=self.staff).count(), 1)
        self.assertEqual(sorted(type(result) is int for result in results), [False, True])
        self.assertIn("member_exists", results)

    def test_two_owner_deactivations_leave_one_active_owner(self):
        barrier = Barrier(2)

        def deactivate(actor, member):
            barrier.wait(timeout=5)
            try:
                update_team_member(organization=self.org, actor=actor, membership_id=member.id, is_active=False)
                return "updated"
            except TeamError as exc:
                return exc.code

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = [future.result(timeout=10) for future in [pool.submit(self.worker, lambda: deactivate(self.owner_one, self.first)), pool.submit(self.worker, lambda: deactivate(self.owner_two, self.second))]]
        self.assertEqual(results.count("updated"), 1)
        self.assertEqual(results.count("last_owner"), 1)
        self.assertEqual(Membership.objects.filter(organization=self.org, role=MembershipRole.OWNER, is_active=True).count(), 1)

    def test_platform_and_owner_deactivation_race_leaves_one_active_owner(self):
        barrier = Barrier(2)

        def owner_deactivate():
            barrier.wait(timeout=5)
            try:
                update_team_member(organization=self.org, actor=self.owner_one, membership_id=self.first.id, is_active=False)
                return "updated"
            except TeamError as exc:
                return exc.code

        def platform_deactivate():
            barrier.wait(timeout=5)
            try:
                update_organization_member(organization=self.org, membership=self.second, actor=self.admin, is_active=False)
                return "updated"
            except PlatformOnboardingError as exc:
                return exc.code

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = [future.result(timeout=10) for future in [pool.submit(self.worker, owner_deactivate), pool.submit(self.worker, platform_deactivate)]]
        self.assertEqual(results.count("updated"), 1)
        self.assertEqual(Membership.objects.filter(organization=self.org, role=MembershipRole.OWNER, is_active=True).count(), 1)

    def test_actor_revoked_while_waiting_on_organization_lock_cannot_write(self):
        ready = Queue()

        def add_after_lock():
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_backend_pid()")
                ready.put(cursor.fetchone()[0])
            try:
                add_team_member(organization=self.org, actor=self.owner_one, user_id=self.staff.id, role=MembershipRole.MANAGER, property_ids=[self.property.id])
                return "added"
            except Http404:
                return "forbidden"

        with ThreadPoolExecutor(max_workers=1) as pool:
            with transaction.atomic():
                Organization.objects.select_for_update().get(pk=self.org.pk)
                future = pool.submit(self.worker, add_after_lock)
                pid = ready.get(timeout=5)
                deadline = monotonic() + 5
                waiting = False
                while monotonic() < deadline and not future.done():
                    with connection.cursor() as cursor:
                        cursor.execute("SELECT wait_event_type FROM pg_stat_activity WHERE pid = %s", [pid])
                        row = cursor.fetchone()
                    if row and row[0] == "Lock":
                        waiting = True
                        break
                    sleep(0.01)
                self.assertTrue(waiting, "Team write did not wait for organization lock")
                Membership.objects.filter(pk=self.first.pk).update(is_active=False)
            self.assertEqual(future.result(timeout=10), "forbidden")
        self.assertFalse(Membership.objects.filter(organization=self.org, user=self.staff).exists())
