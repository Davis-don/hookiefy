# notifications/models.py
import uuid

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Notification(models.Model):

    # ========================================================
    # CATEGORY
    # ========================================================

    CATEGORY_HOOKUP = "hookup"
    CATEGORY_SYSTEM = "system"
    CATEGORY_PAYMENT = "payment"
    CATEGORY_SERVICE = "service"

    CATEGORY_CHOICES = (
        (CATEGORY_HOOKUP, "Hookup"),
        (CATEGORY_SYSTEM, "System"),
        (CATEGORY_PAYMENT, "Payment"),
        (CATEGORY_SERVICE, "Service"),
    )

    # ========================================================
    # IDENTIFIER
    # ========================================================

    notification_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    # ========================================================
    # SENDER (null for system)
    # ========================================================

    sender = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="sent_notifications",
        null=True,
        blank=True,
        help_text="User who triggered this notification. Null for system notifications.",
    )

    # ========================================================
    # RECEIVER (temporarily nullable for migration)
    # ========================================================

    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_notifications",
        null=True,          # TEMP — remove after backfill
        blank=True,         # TEMP — remove after backfill
        help_text="User who receives this notification.",
    )

    # ========================================================
    # CATEGORY
    # ========================================================

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default=CATEGORY_SYSTEM,
    )

    # ========================================================
    # OPTIONAL TARGET
    # ========================================================

    connection = models.ForeignKey(
        "connections.Connection",
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )

    # ========================================================
    # CONTENT
    # ========================================================

    title = models.CharField(max_length=255)
    message = models.TextField()

    # ========================================================
    # READ STATE
    # ========================================================

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    # ========================================================
    # TIMESTAMPS
    # ========================================================

    created_at = models.DateTimeField(auto_now_add=True)

    # ========================================================
    # META
    # ========================================================

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["receiver", "is_read"]),
            models.Index(fields=["receiver", "category"]),
        ]

    def __str__(self):
        return f"[{self.category}] {self.title} -> {self.receiver}"

    def mark_as_read(self):
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])