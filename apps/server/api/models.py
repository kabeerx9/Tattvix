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
