from django.contrib import admin

from .models import ClerkUser


@admin.register(ClerkUser)
class ClerkUserAdmin(admin.ModelAdmin):
    list_display = ("clerk_id", "email", "username", "last_synced_at", "updated_at")
    search_fields = ("clerk_id", "email", "username")
    readonly_fields = ("created_at", "updated_at")
