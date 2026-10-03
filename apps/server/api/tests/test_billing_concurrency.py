from concurrent.futures import ThreadPoolExecutor
from queue import Queue
from threading import Barrier
from time import monotonic, sleep
from uuid import uuid4

from django.db import connection, connections, transaction
from django.test import TransactionTestCase
from api.billing import add_extra_charge, void_extra_charge
from api.check_in import CheckInError
from api.hotel_operations import confirm_hotel_check_in, checkout_hotel_stay
from api.models import Stay, StayCharge
from api.tests import test_hotel_operations_api as fixtures


class BillingConcurrencyTests(TransactionTestCase):
    def setUp(self):
        fixtures.HotelOperationsApiTests.setUp(self)
        self.assertEqual(
            connection.vendor, "postgresql", "Billing concurrency requires PostgreSQL"
        )

    def worker(self, operation):
        try:
            return operation()
        finally:
            connections.close_all()

    def check_in(self):
        return confirm_hotel_check_in(
            property_=self.property,
            stay=self.stay,
            room_id=self.room.pk,
            actor=self.reception,
            nights=2,
        )

    def test_concurrent_confirmation_creates_one_room_charge(self):
        barrier = Barrier(2)

        def confirm():
            barrier.wait(timeout=5)
            return self.check_in().pk

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(self.worker, confirm) for _ in range(2)]
            self.assertEqual(
                [future.result(timeout=10) for future in futures],
                [self.stay.pk, self.stay.pk],
            )
        self.assertEqual(self.stay.charges.filter(kind="ROOM").count(), 1)

    def test_concurrent_extra_replay_creates_one_charge(self):
        self.check_in()
        barrier = Barrier(2)
        request_id = uuid4()

        def add():
            barrier.wait(timeout=5)
            return add_extra_charge(
                stay=self.stay,
                actor=self.owner,
                request_id=request_id,
                description="Dinner",
                quantity=1,
                unit_price_minor=50000,
            )

        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(self.worker, add) for _ in range(2)]
            bills = [future.result(timeout=10) for future in futures]
        self.assertEqual(bills[0], bills[1])
        self.assertEqual(self.stay.charges.filter(kind="EXTRA").count(), 1)

    def assert_checkout_wins(self, mutation):
        """Observe the competing PostgreSQL connection waiting on the stay lock."""
        ready = Queue()

        def mutate():
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_backend_pid()")
                ready.put(cursor.fetchone()[0])
            try:
                mutation()
                return "mutated"
            except CheckInError as exc:
                return exc.code

        with ThreadPoolExecutor(max_workers=1) as pool:
            with transaction.atomic():
                Stay.objects.select_for_update().get(pk=self.stay.pk)
                future = pool.submit(self.worker, mutate)
                pid = ready.get(timeout=5)
                deadline = monotonic() + 5
                waiting = False
                while monotonic() < deadline and not future.done():
                    with connection.cursor() as cursor:
                        cursor.execute(
                            "SELECT wait_event_type FROM pg_stat_activity WHERE pid = %s",
                            [pid],
                        )
                        row = cursor.fetchone()
                    if row and row[0] == "Lock":
                        waiting = True
                        break
                    sleep(0.01)
                self.assertTrue(
                    waiting, "Billing mutation did not wait for the checkout lock"
                )
                checkout_hotel_stay(
                    property_=self.property, stay=self.stay, actor=self.owner
                )
            self.assertEqual(future.result(timeout=10), "bill_not_open")

    def test_extra_waits_for_checkout_then_is_rejected(self):
        self.check_in()
        self.assert_checkout_wins(
            lambda: add_extra_charge(
                stay=self.stay,
                actor=self.owner,
                request_id=uuid4(),
                description="Late extra",
                quantity=1,
                unit_price_minor=100,
            )
        )
        self.assertEqual(self.stay.charges.filter(kind="EXTRA").count(), 0)

    def test_void_waits_for_checkout_then_is_rejected(self):
        self.check_in()
        extra = StayCharge.objects.create(
            stay=self.stay,
            kind="EXTRA",
            description="Dinner",
            quantity=1,
            unit_price_minor=100,
            created_by=self.owner,
        )
        self.assert_checkout_wins(
            lambda: void_extra_charge(
                stay=self.stay,
                actor=self.owner,
                item_id=extra.public_id,
                reason="Late cancellation",
            )
        )
        extra.refresh_from_db()
        self.assertIsNone(extra.voided_at)
