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
    submitted_at = models.DateTimeField(null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    hotel_access_expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-submitted_at", "-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["guest", "qr_token"],
                condition=models.Q(status=StayStatus.DRAFT),
                name="unique_draft_stay_per_guest_qr",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.property} — {self.public_id}"


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
                fields=["snapshot", "side"],
                name="unique_shared_identity_image_side",
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
