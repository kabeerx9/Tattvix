from django.contrib import admin

from .models import ClerkOrganization, ClerkOrganizationMembership, ClerkUser


@admin.register(ClerkUser)
class ClerkUserAdmin(admin.ModelAdmin):
    list_display = ("clerk_id", "email", "username", "last_synced_at", "updated_at")
    search_fields = ("clerk_id", "email", "username")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ClerkOrganization)
class ClerkOrganizationAdmin(admin.ModelAdmin):
    list_display = ("clerk_id", "name", "slug", "last_synced_at", "updated_at")
    search_fields = ("clerk_id", "name", "slug")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ClerkOrganizationMembership)
class ClerkOrganizationMembershipAdmin(admin.ModelAdmin):
    list_display = ("clerk_id", "user", "organization", "role", "last_synced_at")
    search_fields = (
        "clerk_id",
        "user__clerk_id",
        "user__email",
        "organization__clerk_id",
        "organization__name",
    )
    readonly_fields = ("created_at", "updated_at")
