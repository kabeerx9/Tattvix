from django.contrib import admin

from .models import (
    ClerkUser,
    CompanionProfile,
    Membership,
    MembershipPropertyAccess,
    Organization,
    PlatformRoleAssignment,
    Property,
)


@admin.register(ClerkUser)
class ClerkUserAdmin(admin.ModelAdmin):
    list_display = ("clerk_id", "email", "username", "last_synced_at", "updated_at")
    search_fields = ("clerk_id", "email", "username")
    readonly_fields = ("created_at", "updated_at")


admin.site.register(PlatformRoleAssignment)
admin.site.register(CompanionProfile)
admin.site.register(Organization)
admin.site.register(Property)
admin.site.register(Membership)
admin.site.register(MembershipPropertyAccess)
