"""Rich, idempotent local dev-data seed.

Creates one organization with two properties, a full roster of staff and
guest accounts, rooms covering every housekeeping status, valid QR check-in
tokens, and stays covering every point in the guest lifecycle (submitted and
awaiting review, checked in, checked out within the access grace window, and
checked out with access already expired) — including identity snapshots,
document images, and a few audit events — so every screen in the product has
something to show locally.

Safe to run repeatedly: every write is keyed on a stable slug/email/clerk_id
and goes through `get_or_create`/`update_or_create`, or through the same
domain functions the API uses (`submit_guest_identity`,
`confirm_hotel_check_in`, `checkout_hotel_stay`), which are themselves
idempotent (re-submitting/re-checking-in/re-checking-out a stay that is
already in that state is a no-op).
"""

import base64
from datetime import date, timedelta
from hashlib import sha256

from django.core.management.base import BaseCommand
from django.utils import timezone

from api.check_in import CheckInError, submit_guest_identity
from api.hotel_operations import checkout_hotel_stay, confirm_hotel_check_in
from api.models import (
    ClerkUser,
    CompanionProfile,
    GuestProfile,
    HotelQrToken,
    IdentityAccessAction,
    IdentityAccessAudit,
    IdentityDocument,
    IdentityDocumentImage,
    IdentityDocumentImageSide,
    Membership,
    MembershipPropertyAccess,
    MembershipRole,
    OperationalStayStatus,
    Organization,
    PlatformRole,
    PlatformRoleAssignment,
    Property,
    Room,
    RoomStatus,
    Stay,
    StayStatus,
)
from api.object_storage import PrivateObjectStorage
from api.user_lookup import (
    AmbiguousExistingUser,
    ExistingUserNotFound,
    get_unique_existing_user_by_email,
)

WEB_APP_BASE_URL = "http://localhost:3001"

# 1x1 transparent PNG. Real bytes, real content-length, so uploaded objects
# are actually valid images when opened in a browser — just tiny ones.
_PLACEHOLDER_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk"
    "+A8AAQUBAScY42YAAAAASUVORK5CYII="
)
PLACEHOLDER_PNG_BYTES = base64.b64decode(_PLACEHOLDER_PNG_BASE64)

GUESTS = [
    {
        "key": "guest_1",
        "first_name": "Priya",
        "last_name": "Sharma",
        "email": "priya.sharma@example.com",
        "phone": "+919812345601",
        "dob": date(1990, 5, 14),
        "city": "Jaipur",
        "state": "Rajasthan",
        "postal": "302001",
        "doc_type": "AADHAAR",
        "doc_number": "XXXX-SEED-0001",
        "companion": {
            "first_name": "Rahul",
            "last_name": "Sharma",
            "relationship": "Spouse",
            "dob": date(1988, 2, 20),
        },
    },
    {
        "key": "guest_2",
        "first_name": "Arjun",
        "last_name": "Nair",
        "email": "arjun.nair@example.com",
        "phone": "+919812345602",
        "dob": date(1985, 11, 2),
        "city": "Kochi",
        "state": "Kerala",
        "postal": "682001",
        "doc_type": "PASSPORT",
        "doc_number": "XXXX-SEED-0002",
        "companion": None,
    },
    {
        "key": "guest_3",
        "first_name": "Sneha",
        "last_name": "Iyer",
        "email": "sneha.iyer@example.com",
        "phone": "+919812345603",
        "dob": date(1992, 7, 9),
        "city": "Bengaluru",
        "state": "Karnataka",
        "postal": "560001",
        "doc_type": "DRIVING_LICENCE",
        "doc_number": "XXXX-SEED-0003",
        "companion": {
            "first_name": "Aadhya",
            "last_name": "Iyer",
            "relationship": "Daughter",
            "dob": None,  # filled in as "8 years ago" below, a real minor.
        },
    },
    {
        "key": "guest_4",
        "first_name": "Vikram",
        "last_name": "Singh",
        "email": "vikram.singh@example.com",
        "phone": "+919812345604",
        "dob": date(1983, 3, 30),
        "city": "Lucknow",
        "state": "Uttar Pradesh",
        "postal": "226001",
        "doc_type": "VOTER_ID",
        "doc_number": "XXXX-SEED-0004",
        "companion": None,
    },
    {
        "key": "guest_5",
        "first_name": "Ananya",
        "last_name": "Gupta",
        "email": "ananya.gupta@example.com",
        "phone": "+919812345605",
        "dob": date(1995, 9, 18),
        "city": "Delhi",
        "state": "Delhi",
        "postal": "110001",
        "doc_type": "AADHAAR",
        "doc_number": "XXXX-SEED-0005",
        "companion": {
            "first_name": "Suresh",
            "last_name": "Gupta",
            "relationship": "Parent",
            "dob": date(1960, 1, 1),
        },
    },
    {
        "key": "guest_6",
        "first_name": "Karan",
        "last_name": "Malhotra",
        "email": "karan.malhotra@example.com",
        "phone": "+919812345606",
        "dob": date(1991, 12, 25),
        "city": "Chandigarh",
        "state": "Chandigarh",
        "postal": "160001",
        "doc_type": "PASSPORT",
        "doc_number": "XXXX-SEED-0006",
        "companion": None,
    },
]


class Command(BaseCommand):
    help = (
        "Seed a full local dataset — org, properties, staff, guests, rooms, "
        "QR tokens, and stays in every lifecycle state — so the app has "
        "something to show in every screen. Safe to re-run."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--email",
            default="",
            help=(
                "Email of your real Clerk-synced dev account. If it exists, "
                "grants it SUPER_ADMIN and an OWNER membership in the seeded "
                "organization so your own login sees everything seeded here."
            ),
        )

    def handle(self, *args, **options):
        now = timezone.now()

        storage = PrivateObjectStorage()
        storage_ok = self._check_storage(storage)

        platform_admin = self._get_or_create_user(
            clerk_id="seed_platform_admin",
            email="seed-admin@tattvix.dev",
            first_name="Admin",
            last_name="Seed",
        )
        PlatformRoleAssignment.objects.get_or_create(
            user=platform_admin,
            defaults={"role": PlatformRole.SUPER_ADMIN},
        )

        owner = self._get_or_create_user(
            clerk_id="seed_owner",
            email="seed-owner@tattvix.dev",
            first_name="Aditya",
            last_name="Verma",
        )
        manager = self._get_or_create_user(
            clerk_id="seed_manager",
            email="seed-manager@tattvix.dev",
            first_name="Neha",
            last_name="Kapoor",
        )
        reception = self._get_or_create_user(
            clerk_id="seed_reception",
            email="seed-reception@tattvix.dev",
            first_name="Ravi",
            last_name="Patel",
        )

        organization, _ = Organization.objects.get_or_create(
            slug="sunrise-hospitality",
            defaults={"name": "Sunrise Hospitality"},
        )
        jaipur, _ = Property.objects.get_or_create(
            organization=organization,
            slug="jaipur",
            defaults={"name": "Sunrise Jaipur"},
        )
        udaipur, _ = Property.objects.get_or_create(
            organization=organization,
            slug="udaipur",
            defaults={"name": "Sunrise Udaipur"},
        )

        Membership.objects.get_or_create(
            user=owner,
            organization=organization,
            defaults={"role": MembershipRole.OWNER, "has_all_properties": True},
        )
        Membership.objects.get_or_create(
            user=manager,
            organization=organization,
            defaults={"role": MembershipRole.MANAGER, "has_all_properties": True},
        )
        reception_membership, _ = Membership.objects.get_or_create(
            user=reception,
            organization=organization,
            defaults={"role": MembershipRole.RECEPTION, "has_all_properties": False},
        )
        # Reception is scoped to Jaipur only — this is the property-scoping
        # path (MembershipPropertyAccess), distinct from has_all_properties.
        MembershipPropertyAccess.objects.get_or_create(
            membership=reception_membership,
            property=jaipur,
        )

        rooms = self._create_rooms(jaipur, udaipur)

        jaipur_token, jaipur_raw_token = self._get_or_create_qr_token(
            property_=jaipur, actor=owner, seed_key="jaipur"
        )
        udaipur_token, udaipur_raw_token = self._get_or_create_qr_token(
            property_=udaipur, actor=owner, seed_key="udaipur"
        )

        guest_users = {}
        for guest_data in GUESTS:
            guest_users[guest_data["key"]] = self._create_guest(
                guest_data, storage=storage, storage_ok=storage_ok
            )

        stays_created = {}
        if storage_ok:
            stays_created = self._create_stays(
                guest_users=guest_users,
                jaipur=jaipur,
                udaipur=udaipur,
                jaipur_token=jaipur_token,
                udaipur_token=udaipur_token,
                rooms=rooms,
                reception=reception,
                now=now,
                storage=storage,
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "Skipping stay creation: identity documents have no "
                    "images without working object storage, so guests "
                    "cannot submit a check-in."
                )
            )

        dev_user = self._grant_dev_access(options["email"], organization=organization)

        self._print_summary(
            organization=organization,
            properties=[jaipur, udaipur],
            tokens={"jaipur": jaipur_raw_token, "udaipur": udaipur_raw_token},
            stays_created=stays_created,
            storage_ok=storage_ok,
            dev_user=dev_user,
            requested_email=options["email"],
        )

    # -- storage -----------------------------------------------------------

    def _check_storage(self, storage: PrivateObjectStorage) -> bool:
        try:
            storage.check_bucket_access()
        except Exception as exc:  # pragma: no cover - network/env dependent
            self.stdout.write(
                self.style.WARNING(
                    "Object storage is unreachable "
                    f"({exc}); skipping document images and stays. "
                    "Run `pnpm run storage:up` and re-run this command."
                )
            )
            return False
        return True

    # -- users ---------------------------------------------------------------

    def _get_or_create_user(
        self, *, clerk_id: str, email: str, first_name: str, last_name: str
    ) -> ClerkUser:
        user, _ = ClerkUser.objects.get_or_create(
            clerk_id=clerk_id,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
            },
        )
        return user

    def _create_guest(
        self, guest_data: dict, *, storage: PrivateObjectStorage, storage_ok: bool
    ) -> ClerkUser:
        user = self._get_or_create_user(
            clerk_id=f"seed_{guest_data['key']}",
            email=guest_data["email"],
            first_name=guest_data["first_name"],
            last_name=guest_data["last_name"],
        )
        GuestProfile.objects.get_or_create(
            user=user,
            defaults={
                "legal_first_name": guest_data["first_name"],
                "legal_last_name": guest_data["last_name"],
                "phone_number": guest_data["phone"],
                "date_of_birth": guest_data["dob"],
                "nationality": "in",
                "address_line_1": "12 MG Road",
                "city": guest_data["city"],
                "state_region": guest_data["state"],
                "postal_code": guest_data["postal"],
                "country": "in",
                "emergency_contact_name": "Family Contact",
                "emergency_contact_phone": "+919800000000",
            },
        )

        companion_data = guest_data["companion"]
        if companion_data:
            dob = companion_data["dob"] or self._years_ago(8)
            CompanionProfile.objects.get_or_create(
                user=user,
                legal_first_name=companion_data["first_name"],
                legal_last_name=companion_data["last_name"],
                defaults={
                    "date_of_birth": dob,
                    "relationship": companion_data["relationship"],
                    "nationality": "in",
                },
            )

        doc_type = guest_data["doc_type"]
        expiry_date = None
        if doc_type in ("PASSPORT", "DRIVING_LICENCE"):
            expiry_date = date.today() + timedelta(days=1825)
        document, _ = IdentityDocument.objects.get_or_create(
            user=user,
            document_type=doc_type,
            defaults={
                "document_number": guest_data["doc_number"],
                "name_on_document": f"{guest_data['first_name']} {guest_data['last_name']}",
                "issuing_country": "in",
                "expiry_date": expiry_date,
            },
        )

        if storage_ok:
            back_required = doc_type in ("AADHAAR", "DRIVING_LICENCE", "VOTER_ID")
            sides = [IdentityDocumentImageSide.FRONT]
            if back_required:
                sides.append(IdentityDocumentImageSide.BACK)
            for side in sides:
                self._upload_document_image(
                    storage=storage, document=document, side=side
                )

        return user

    def _upload_document_image(
        self,
        *,
        storage: PrivateObjectStorage,
        document: IdentityDocument,
        side: str,
    ) -> None:
        object_key = (
            f"users/{document.user_id}/identity-documents/"
            f"{document.id}/{side.lower()}/seed.png"
        )
        try:
            storage.client.put_object(
                Bucket=storage.bucket_name,
                Key=object_key,
                Body=PLACEHOLDER_PNG_BYTES,
                ContentType="image/png",
            )
        except Exception as exc:  # pragma: no cover - network/env dependent
            self.stdout.write(
                self.style.WARNING(f"Could not upload {object_key}: {exc}")
            )
            return
        IdentityDocumentImage.objects.update_or_create(
            document=document,
            side=side,
            defaults={
                "object_key": object_key,
                "content_type": "image/png",
                "content_length": len(PLACEHOLDER_PNG_BYTES),
            },
        )

    # -- rooms -----------------------------------------------------------------

    def _create_rooms(self, jaipur: Property, udaipur: Property) -> dict:
        def room(property_, number, floor, room_type, status):
            obj, _ = Room.objects.get_or_create(
                property=property_,
                number=number,
                defaults={
                    "floor": floor,
                    "room_type": room_type,
                    "status": status,
                },
            )
            return obj

        return {
            # Jaipur — six rooms across two floors, one of every RoomStatus.
            # 101/102/104 are driven into their final status by the stay
            # lifecycle functions below; 103 is set directly (out of
            # service, no guest involved) to guarantee MAINTENANCE coverage.
            "jaipur_101": room(jaipur, "101", "1", "Deluxe", RoomStatus.VACANT),
            "jaipur_102": room(jaipur, "102", "1", "Deluxe", RoomStatus.VACANT),
            "jaipur_103": room(
                jaipur, "103", "1", "Deluxe", RoomStatus.MAINTENANCE
            ),
            "jaipur_104": room(jaipur, "104", "1", "Suite", RoomStatus.VACANT),
            "jaipur_201": room(jaipur, "201", "2", "Suite", RoomStatus.VACANT),
            "jaipur_202": room(jaipur, "202", "2", "Suite", RoomStatus.VACANT),
            "udaipur_101": room(udaipur, "101", "1", "Lake View", RoomStatus.VACANT),
            "udaipur_102": room(udaipur, "102", "1", "Lake View", RoomStatus.VACANT),
        }

    # -- QR tokens ---------------------------------------------------------

    def _get_or_create_qr_token(
        self, *, property_: Property, actor: ClerkUser, seed_key: str
    ) -> tuple[HotelQrToken, str]:
        # A hand-rolled, deterministic token (rather than
        # `generate_hotel_qr_token`) so re-running the seed always resolves
        # to the same digest instead of revoking the previous run's token.
        raw_token = f"seed-{seed_key}-token"
        digest = sha256(raw_token.encode("utf-8")).hexdigest()
        token, _ = HotelQrToken.objects.get_or_create(
            token_digest=digest,
            defaults={
                "property": property_,
                "token_hint": raw_token[:12],
                "created_by": actor,
                "expires_at": timezone.now() + timedelta(days=3650),
            },
        )
        return token, raw_token

    # -- stays ---------------------------------------------------------------

    def _create_stays(
        self,
        *,
        guest_users: dict,
        jaipur: Property,
        udaipur: Property,
        jaipur_token: HotelQrToken,
        udaipur_token: HotelQrToken,
        rooms: dict,
        reception: ClerkUser,
        now,
        storage: PrivateObjectStorage,
    ) -> dict:
        created = {}

        def submit(guest_key: str, qr_token: HotelQrToken) -> Stay | None:
            guest = guest_users[guest_key]
            # `submit_guest_identity` only short-circuits on an existing
            # SUBMITTED stay — once a re-run's stay has moved on to
            # CHECKED_IN/CLOSED it would otherwise open a second DRAFT stay
            # for the same guest+token and duplicate the snapshot/images.
            # Any non-draft stay at all means "already seeded"; reuse it.
            existing_stay = (
                Stay.objects.filter(qr_token=qr_token, guest=guest)
                .exclude(status=StayStatus.DRAFT)
                .order_by("-created_at")
                .first()
            )
            if existing_stay is not None:
                return existing_stay

            guest_data = next(g for g in GUESTS if g["key"] == guest_key)
            document = IdentityDocument.objects.get(
                user=guest, document_type=guest_data["doc_type"]
            )
            companion_ids = list(
                CompanionProfile.objects.filter(user=guest).values_list(
                    "id", flat=True
                )
            )
            try:
                return submit_guest_identity(
                    qr_token=qr_token,
                    guest=guest,
                    identity_document_id=document.id,
                    companion_ids=companion_ids,
                    storage=storage,
                )
            except CheckInError as exc:
                self.stdout.write(
                    self.style.WARNING(
                        f"Could not submit check-in for {guest_key}: {exc.message}"
                    )
                )
                return None

        # (a) Two SUBMITTED + PENDING_CHECK_IN stays awaiting hotel review.
        created["guest_1_submitted"] = submit("guest_1", jaipur_token)
        created["guest_2_submitted"] = submit("guest_2", jaipur_token)

        # (b) CHECKED_IN with an occupied room.
        stay = submit("guest_3", jaipur_token)
        if stay is not None:
            stay = self._ensure_checked_in(
                property_=jaipur, stay=stay, room_id=rooms["jaipur_101"].id
            )
            self._record_audit_views(stay=stay, actor=reception)
        created["guest_3_checked_in"] = stay

        # (c) CHECKED_OUT + CLOSED recently (still within the access grace
        # window, so shared images remain viewable).
        stay = submit("guest_4", jaipur_token)
        if stay is not None:
            stay = self._ensure_checked_out(
                property_=jaipur,
                stay=stay,
                room_id=rooms["jaipur_102"].id,
                actor=reception,
            )
            self._record_audit_views(stay=stay, actor=reception)
        created["guest_4_checked_out_recent"] = stay

        # (d) CHECKED_OUT + CLOSED with access already expired.
        stay = submit("guest_5", jaipur_token)
        if stay is not None:
            stay = self._ensure_checked_out(
                property_=jaipur,
                stay=stay,
                room_id=rooms["jaipur_104"].id,
                actor=reception,
            )
            expired_at = now - timedelta(days=1)
            if stay.hotel_access_expires_at != expired_at:
                stay.hotel_access_expires_at = expired_at
                stay.save(update_fields=["hotel_access_expires_at", "updated_at"])
        created["guest_5_checked_out_expired"] = stay

        # (e) A stay at the second property, Udaipur.
        stay = submit("guest_6", udaipur_token)
        if stay is not None:
            stay = self._ensure_checked_in(
                property_=udaipur, stay=stay, room_id=rooms["udaipur_101"].id
            )
        created["guest_6_udaipur_checked_in"] = stay

        return created

    def _ensure_checked_in(
        self, *, property_: Property, stay: Stay, room_id: int
    ) -> Stay:
        # Guarded because `confirm_hotel_check_in` rejects a stay that has
        # already moved to CHECKED_IN (different room) or CHECKED_OUT — on
        # a re-run the stay is already wherever the first run left it.
        if stay.operational_status in (
            OperationalStayStatus.CHECKED_IN,
            OperationalStayStatus.CHECKED_OUT,
        ):
            return stay
        return confirm_hotel_check_in(property_=property_, stay=stay, room_id=room_id)

    def _ensure_checked_out(
        self, *, property_: Property, stay: Stay, room_id: int, actor: ClerkUser
    ) -> Stay:
        stay = self._ensure_checked_in(property_=property_, stay=stay, room_id=room_id)
        if stay.operational_status == OperationalStayStatus.CHECKED_OUT:
            return stay
        return checkout_hotel_stay(property_=property_, stay=stay, actor=actor)

    def _record_audit_views(self, *, stay: Stay, actor: ClerkUser) -> None:
        IdentityAccessAudit.objects.get_or_create(
            stay=stay,
            actor=actor,
            action=IdentityAccessAction.DETAILS_VIEWED,
            image_side="",
        )
        IdentityAccessAudit.objects.get_or_create(
            stay=stay,
            actor=actor,
            action=IdentityAccessAction.DOCUMENT_VIEWED,
            image_side=IdentityDocumentImageSide.FRONT,
        )

    # -- dev access ----------------------------------------------------------

    def _grant_dev_access(
        self, email: str, *, organization: Organization
    ) -> ClerkUser | None:
        email = (email or "").strip().lower()
        if not email:
            return None

        try:
            dev_user = get_unique_existing_user_by_email(email)
        except ExistingUserNotFound:
            self.stdout.write(
                self.style.WARNING(
                    f"No account exists yet for {email}. Sign in once at "
                    f"{WEB_APP_BASE_URL}, then re-run: "
                    f"pnpm run seed -- --email {email}"
                )
            )
            return None
        except AmbiguousExistingUser:
            self.stdout.write(
                self.style.WARNING(
                    f"Multiple accounts use {email}; resolve the duplicate "
                    "before granting seeded access."
                )
            )
            return None

        PlatformRoleAssignment.objects.update_or_create(
            user=dev_user, defaults={"role": PlatformRole.SUPER_ADMIN}
        )
        Membership.objects.update_or_create(
            user=dev_user,
            organization=organization,
            defaults={"role": MembershipRole.OWNER, "has_all_properties": True},
        )
        return dev_user

    # -- summary ---------------------------------------------------------------

    def _print_summary(
        self,
        *,
        organization: Organization,
        properties: list[Property],
        tokens: dict,
        stays_created: dict,
        storage_ok: bool,
        dev_user: ClerkUser | None,
        requested_email: str,
    ) -> None:
        self.stdout.write(self.style.SUCCESS("\nSeed complete."))
        self.stdout.write(f"Organization: {organization.name} ({organization.slug})")
        for property_ in properties:
            self.stdout.write(f"  Property: {property_.name} ({property_.slug})")

        self.stdout.write("\nCheck-in QR URLs:")
        for key, raw_token in tokens.items():
            self.stdout.write(f"  {key}: {WEB_APP_BASE_URL}/check-in/{raw_token}")

        if storage_ok:
            landed = sum(1 for stay in stays_created.values() if stay is not None)
            self.stdout.write(f"\nStays seeded: {landed}/{len(stays_created)}")
            for key, stay in stays_created.items():
                if stay is None:
                    self.stdout.write(f"  {key}: skipped")
                else:
                    self.stdout.write(
                        f"  {key}: status={stay.status} "
                        f"operational={stay.operational_status}"
                    )
        else:
            self.stdout.write(
                "\nStays: skipped — object storage was unreachable this run."
            )

        if dev_user is not None:
            self.stdout.write(
                self.style.SUCCESS(
                    f"\nGranted SUPER_ADMIN + OWNER access to {dev_user.email}."
                )
            )
        elif requested_email:
            self.stdout.write(
                "\n(No dev account was granted access — see the warning above.)"
            )
        else:
            self.stdout.write(
                "\nNo --email given: your own login was not granted access. "
                "Sign in once at "
                f"{WEB_APP_BASE_URL}, then run: "
                "pnpm run seed -- --email you@example.com"
            )

        self.stdout.write(
            self.style.WARNING(
                "\nSeeded staff/guest accounts (seed_owner, seed_reception, "
                "seed_guest_1, ...) are not real Clerk accounts and cannot "
                "be logged into. Use --email with your own Clerk login to "
                "see this data in the app."
            )
        )

    @staticmethod
    def _years_ago(years: int) -> date:
        today = date.today()
        try:
            return today.replace(year=today.year - years)
        except ValueError:
            return today.replace(year=today.year - years, day=28)
