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
