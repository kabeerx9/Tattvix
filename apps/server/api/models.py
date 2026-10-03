from uuid import uuid4

from django.db import models


class ClerkUser(models.Model):
    clerk_id = models.CharField(max_length=128, unique=True)
    email = models.EmailField(blank=True, default="", db_index=True)
    first_name = models.CharField(max_length=150, blank=True, default="")
    last_name = models.CharField(max_length=150, blank=True, default="")
    username = models.CharField(max_length=150, blank=True, default="")
    image_url = models.URLField(max_length=2048, blank=True, default="")
    public_metadata = models.JSONField(default=dict, blank=True)
    private_metadata = models.JSONField(default=dict, blank=True)
    unsafe_metadata = models.JSONField(default=dict, blank=True)
    raw_data = models.JSONField(default=dict, blank=True)
    last_synced_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["last_synced_at"]),
        ]

    def __str__(self) -> str:
        return self.email or self.username or self.clerk_id


class GuestProfile(models.Model):
    user = models.OneToOneField(
        ClerkUser,
        on_delete=models.CASCADE,
        related_name="guest_profile",
    )
    legal_first_name = models.CharField(max_length=150, blank=True, default="")
    legal_last_name = models.CharField(max_length=150, blank=True, default="")
    phone_number = models.CharField(max_length=32, blank=True, default="")
    date_of_birth = models.DateField(null=True, blank=True)
    nationality = models.CharField(max_length=2, blank=True, default="")
    address_line_1 = models.CharField(max_length=255, blank=True, default="")
    address_line_2 = models.CharField(max_length=255, blank=True, default="")
    city = models.CharField(max_length=120, blank=True, default="")
    state_region = models.CharField(max_length=120, blank=True, default="")
    postal_code = models.CharField(max_length=20, blank=True, default="")
    country = models.CharField(max_length=2, blank=True, default="")
    emergency_contact_name = models.CharField(max_length=150, blank=True, default="")
    emergency_contact_phone = models.CharField(max_length=32, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Guest profile — {self.user}"


class CompanionProfile(models.Model):
    user = models.ForeignKey(
        ClerkUser,
        on_delete=models.CASCADE,
        related_name="companion_profiles",
    )
    legal_first_name = models.CharField(max_length=150, blank=True, default="")
    legal_last_name = models.CharField(max_length=150, blank=True, default="")
    date_of_birth = models.DateField(null=True, blank=True)
    relationship = models.CharField(max_length=100, blank=True, default="")
    nationality = models.CharField(max_length=2, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        name = " ".join(
            part for part in (self.legal_first_name, self.legal_last_name) if part
        )
        return f"Companion — {name or self.user}"


class IdentityDocumentType(models.TextChoices):
    AADHAAR = "AADHAAR", "Aadhaar"
    PASSPORT = "PASSPORT", "Passport"
    DRIVING_LICENCE = "DRIVING_LICENCE", "Driving licence"
    VOTER_ID = "VOTER_ID", "Voter ID"


class IdentityDocument(models.Model):
    companion = models.ForeignKey(
        CompanionProfile,
        on_delete=models.PROTECT,
        related_name="identity_documents",
        null=True,
        blank=True,
    )
    user = models.ForeignKey(
        ClerkUser,
        on_delete=models.CASCADE,
        related_name="identity_documents",
    )
    document_type = models.CharField(
        max_length=32,
        choices=IdentityDocumentType.choices,
        blank=True,
        default="",
    )
    document_number = models.CharField(max_length=64, blank=True, default="")
    name_on_document = models.CharField(max_length=300, blank=True, default="")
    issuing_country = models.CharField(max_length=2, blank=True, default="")
    expiry_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self) -> str:
        return f"{self.get_document_type_display() or 'Identity document'} — {self.user}"


class IdentityDocumentImageSide(models.TextChoices):
    FRONT = "FRONT", "Front"
    BACK = "BACK", "Back"


class IdentityDocumentImage(models.Model):
    document = models.ForeignKey(
        IdentityDocument,
        on_delete=models.CASCADE,
        related_name="images",
    )
    side = models.CharField(max_length=8, choices=IdentityDocumentImageSide.choices)
    object_key = models.CharField(max_length=1024, blank=True, default="")
    content_type = models.CharField(max_length=100, blank=True, default="")
    content_length = models.PositiveBigIntegerField(null=True, blank=True)
    pending_object_key = models.CharField(max_length=1024, blank=True, default="")
    pending_content_type = models.CharField(max_length=100, blank=True, default="")
    pending_content_length = models.PositiveBigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["document", "side"],
                name="unique_identity_document_image_side",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.document} — {self.get_side_display()}"


class PlatformRole(models.TextChoices):
    SUPER_ADMIN = "SUPER_ADMIN", "Super admin"


class MembershipRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    MANAGER = "MANAGER", "Manager"
    RECEPTION = "RECEPTION", "Reception"


class PlatformRoleAssignment(models.Model):
    user = models.OneToOneField(
        ClerkUser,
        on_delete=models.CASCADE,
        related_name="platform_role_assignment",
    )
    role = models.CharField(
        max_length=32,
        choices=PlatformRole.choices,
        default=PlatformRole.SUPER_ADMIN,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.user} — {self.get_role_display()}"


class Organization(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.name


class Property(models.Model):
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="properties",
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    address = models.CharField(max_length=1000, blank=True, default="")
    contact_phone = models.CharField(max_length=32, blank=True, default="")
    description = models.CharField(max_length=2000, blank=True, default="")
    amenities = models.JSONField(default=list)
    check_in_time = models.CharField(max_length=5, blank=True, default="")
    check_out_time = models.CharField(max_length=5, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["organization", "slug"],
                name="unique_property_slug_per_organization",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.organization.name} — {self.name}"


class Membership(models.Model):
    user = models.ForeignKey(
        ClerkUser,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(max_length=32, choices=MembershipRole.choices)
    has_all_properties = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "organization"],
                name="unique_user_membership_per_organization",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user} — {self.organization.name} ({self.get_role_display()})"


class MembershipPropertyAccess(models.Model):
    membership = models.ForeignKey(
        Membership,
        on_delete=models.CASCADE,
        related_name="property_accesses",
    )
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="membership_accesses",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["membership", "property"],
                name="unique_membership_property_access",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if (
            self.membership_id
            and self.property_id
            and self.membership.organization_id != self.property.organization_id
        ):
            from django.core.exceptions import ValidationError

            raise ValidationError(
                {"property": "Property must belong to the membership organization."}
            )

    def __str__(self) -> str:
        return f"{self.membership} — {self.property.name}"


class HotelQrToken(models.Model):
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="check_in_tokens",
    )
    token_digest = models.CharField(max_length=64, unique=True)
    token_hint = models.CharField(max_length=12)
    created_by = models.ForeignKey(
        ClerkUser,
        on_delete=models.PROTECT,
        related_name="created_hotel_qr_tokens",
    )
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.property} — QR {self.token_hint}"


class StayStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    SUBMITTED = "SUBMITTED", "Submitted to hotel"
    CLOSED = "CLOSED", "Closed"
    REVOKED = "REVOKED", "Consent revoked"


class RoomStatus(models.TextChoices):
    VACANT = "VACANT", "Vacant"
    OCCUPIED = "OCCUPIED", "Occupied"
    CLEANING = "CLEANING", "Cleaning"
    MAINTENANCE = "MAINTENANCE", "Maintenance"


class Room(models.Model):
    property = models.ForeignKey(
        Property,
        on_delete=models.PROTECT,
        related_name="rooms",
    )
    number = models.CharField(max_length=32)
    floor = models.CharField(max_length=32, blank=True, default="")
    room_type = models.CharField(max_length=100, blank=True, default="")
    nightly_rate_minor = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        choices=RoomStatus.choices,
        default=RoomStatus.VACANT,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["number", "id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(nightly_rate_minor__lte=100000000),
                name="room_rate_limit",
            ),
            models.UniqueConstraint(
                fields=["property", "number"],
                name="unique_room_number_per_property",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.property} — Room {self.number}"


class OperationalStayStatus(models.TextChoices):
    PENDING_CHECK_IN = "PENDING_CHECK_IN", "Pending check-in"
    CHECKED_IN = "CHECKED_IN", "Checked in"
    CHECKED_OUT = "CHECKED_OUT", "Checked out"


class Stay(models.Model):
    public_id = models.UUIDField(default=uuid4, unique=True, editable=False)
    property = models.ForeignKey(
        Property,
        on_delete=models.PROTECT,
        related_name="stays",
    )
    guest = models.ForeignKey(
        ClerkUser,
        on_delete=models.PROTECT,
        related_name="guest_stays",
    )
    qr_token = models.ForeignKey(
        HotelQrToken,
        on_delete=models.PROTECT,
        related_name="stays",
    )
    status = models.CharField(
        max_length=16,
        choices=StayStatus.choices,
        default=StayStatus.DRAFT,
    )
    operational_status = models.CharField(
        max_length=24,
        choices=OperationalStayStatus.choices,
        default=OperationalStayStatus.PENDING_CHECK_IN,
        db_default=OperationalStayStatus.PENDING_CHECK_IN,
    )
    room = models.ForeignKey(
        Room,
        on_delete=models.PROTECT,
        related_name="stays",
        null=True,
        blank=True,
        db_constraint=False,
    )
    billing_nights = models.PositiveSmallIntegerField(null=True, blank=True)
    nightly_rate_minor = models.PositiveIntegerField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_out_at = models.DateTimeField(null=True, blank=True)
    hotel_access_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-submitted_at", "-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(billing_nights__gte=1, billing_nights__lte=365),
                name="stay_billing_nights_limit",
            ),
            models.CheckConstraint(
                condition=models.Q(nightly_rate_minor__lte=100000000),
                name="stay_rate_limit",
            ),
            models.UniqueConstraint(
                fields=["guest", "qr_token"],
                condition=models.Q(status=StayStatus.DRAFT),
                name="unique_draft_stay_per_guest_qr",
            ),
            models.UniqueConstraint(
                fields=["room"],
                condition=models.Q(operational_status=OperationalStayStatus.CHECKED_IN),
                name="unique_checked_in_stay_per_room",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.property} — {self.public_id}"


class StayCharge(models.Model):
    class Kind(models.TextChoices):
        ROOM = "ROOM", "Room"
        EXTRA = "EXTRA", "Extra"

    public_id = models.UUIDField(default=uuid4, unique=True, editable=False)
    stay = models.ForeignKey(Stay, on_delete=models.PROTECT, related_name="charges")
    kind = models.CharField(max_length=5, choices=Kind.choices)
    description = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField()
    unit_price_minor = models.PositiveIntegerField()
    request_id = models.UUIDField(default=uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        ClerkUser, on_delete=models.PROTECT, related_name="created_stay_charges"
    )
    voided_at = models.DateTimeField(null=True, blank=True)
    voided_by = models.ForeignKey(
        ClerkUser,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="voided_stay_charges",
    )
    void_reason = models.CharField(max_length=500, blank=True, default="")

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["stay", "request_id"], name="unique_stay_charge_request"
            ),
            models.UniqueConstraint(
                fields=["stay"],
                condition=models.Q(kind="ROOM"),
                name="unique_stay_room_charge",
            ),
            models.CheckConstraint(
                condition=models.Q(quantity__gte=1, quantity__lte=9999),
                name="charge_quantity_limit",
            ),
            models.CheckConstraint(
                condition=models.Q(unit_price_minor__lte=100000000),
                name="charge_price_limit",
            ),
            models.CheckConstraint(
                condition=models.Q(kind__in=["ROOM", "EXTRA"]), name="charge_kind_valid"
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        voided_at__isnull=True, voided_by__isnull=True, void_reason=""
                    )
                    | (
                        models.Q(
                            kind="EXTRA",
                            voided_at__isnull=False,
                            voided_by__isnull=False,
                        )
                        & ~models.Q(void_reason="")
                    )
                ),
                name="charge_void_audit_consistent",
            ),
        ]


class ConsentGrant(models.Model):
    stay = models.OneToOneField(
        Stay,
        on_delete=models.CASCADE,
        related_name="consent_grant",
    )
    granted_by = models.ForeignKey(
        ClerkUser,
        on_delete=models.PROTECT,
        related_name="identity_consent_grants",
    )
    consent_version = models.CharField(max_length=32)
    data_categories = models.JSONField(default=list)
    granted_at = models.DateTimeField()
    revoked_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"Consent — {self.stay.public_id}"


class SharedIdentitySnapshot(models.Model):
    stay = models.OneToOneField(
        Stay,
        on_delete=models.CASCADE,
        related_name="identity_snapshot",
    )
    guest_data = models.JSONField()
    companion_data = models.JSONField(default=list)
    document_data = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Identity snapshot — {self.stay.public_id}"


class SharedIdentityDocumentImage(models.Model):
    # Snapshot discriminator, not a FK: shared copies outlive saved companions.
    companion_id = models.PositiveBigIntegerField(default=0)
    snapshot = models.ForeignKey(
        SharedIdentitySnapshot,
        on_delete=models.CASCADE,
        related_name="document_images",
    )
    side = models.CharField(max_length=8, choices=IdentityDocumentImageSide.choices)
    object_key = models.CharField(max_length=1024)
    content_type = models.CharField(max_length=100)
    content_length = models.PositiveBigIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["snapshot", "companion_id", "side"],
                name="unique_shared_identity_participant_side",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.snapshot} — {self.get_side_display()}"


class IdentityAccessAction(models.TextChoices):
    DETAILS_VIEWED = "DETAILS_VIEWED", "Identity details viewed"
    DOCUMENT_VIEWED = "DOCUMENT_VIEWED", "Document image viewed"
    STAY_CLOSED = "STAY_CLOSED", "Stay closed"
    CONSENT_REVOKED = "CONSENT_REVOKED", "Consent revoked"


class IdentityAccessAudit(models.Model):
    # Immutable participant reference; zero identifies the primary guest.
    companion_id = models.PositiveBigIntegerField(default=0)
    stay = models.ForeignKey(
        Stay,
        on_delete=models.CASCADE,
        related_name="identity_access_events",
    )
    actor = models.ForeignKey(
        ClerkUser,
        on_delete=models.PROTECT,
        related_name="identity_access_events",
    )
    action = models.CharField(max_length=32, choices=IdentityAccessAction.choices)
    image_side = models.CharField(
        max_length=8,
        choices=IdentityDocumentImageSide.choices,
        blank=True,
        default="",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.stay.public_id} — {self.get_action_display()}"


class PlatformAuditAction(models.TextChoices):
    PROPERTY_CREATED = "PROPERTY_CREATED", "Property created"
    MEMBER_ADDED = "MEMBER_ADDED", "Member added"
    MEMBER_ROLE_CHANGED = "MEMBER_ROLE_CHANGED", "Member role changed"
    MEMBER_DEACTIVATED = "MEMBER_DEACTIVATED", "Member deactivated"
    MEMBER_REACTIVATED = "MEMBER_REACTIVATED", "Member reactivated"


class PlatformAuditLog(models.Model):
    actor = models.ForeignKey(
        ClerkUser,
        on_delete=models.PROTECT,
        related_name="platform_audit_events",
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.PROTECT,
        related_name="platform_audit_events",
    )
    action = models.CharField(max_length=32, choices=PlatformAuditAction.choices)
    target = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.organization.slug} — {self.get_action_display()} ({self.target})"


class HotelRegistrationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class HotelRegistrationRequest(models.Model):
    applicant = models.ForeignKey(
        ClerkUser, on_delete=models.PROTECT, related_name="hotel_requests"
    )
    hotel_name = models.CharField(max_length=255)
    address = models.CharField(max_length=1000)
    contact_phone = models.CharField(max_length=32)
    status = models.CharField(
        max_length=16,
        choices=HotelRegistrationStatus.choices,
        default=HotelRegistrationStatus.PENDING,
    )
    rejection_reason = models.CharField(max_length=1000, blank=True, default="")
    submitted_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewer = models.ForeignKey(
        ClerkUser,
        on_delete=models.PROTECT,
        related_name="reviewed_hotel_requests",
        null=True,
        blank=True,
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.PROTECT, null=True, blank=True
    )
    property = models.ForeignKey(
        Property, on_delete=models.PROTECT, null=True, blank=True
    )

    class Meta:
        ordering = ["-submitted_at", "-id"]
        indexes = [
            models.Index(
                fields=["status", "submitted_at"], name="hotel_request_queue_idx"
            )
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["applicant"],
                condition=models.Q(status="PENDING"),
                name="one_pending_hotel_request",
            ),
            models.CheckConstraint(
                condition=(
                    models.Q(
                        status="PENDING",
                        reviewer__isnull=True,
                        reviewed_at__isnull=True,
                        organization__isnull=True,
                        property__isnull=True,
                        rejection_reason="",
                    )
                    | models.Q(
                        status="APPROVED",
                        reviewer__isnull=False,
                        reviewed_at__isnull=False,
                        organization__isnull=False,
                        property__isnull=False,
                        rejection_reason="",
                    )
                    | (
                        models.Q(
                            status="REJECTED",
                            reviewer__isnull=False,
                            reviewed_at__isnull=False,
                            organization__isnull=True,
                            property__isnull=True,
                        )
                        & ~models.Q(rejection_reason="")
                    )
                ),
                name="hotel_request_review_state",
            ),
        ]


class PropertyPhoto(models.Model):
    class Kind(models.TextChoices):
        COVER = "COVER", "Cover"
        ROOM_TYPE = "ROOM_TYPE", "Room type"

    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="photos")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    room_type = models.CharField(max_length=100, blank=True, default="")
    object_key = models.CharField(max_length=512, blank=True, default="")
    pending_object_key = models.CharField(max_length=512, blank=True, default="")
    pending_content_type = models.CharField(max_length=100, blank=True, default="")
    pending_content_length = models.PositiveIntegerField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["property", "kind", "room_type"],
                name="unique_property_photo_slot",
            ),
        ]
