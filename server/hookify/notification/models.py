from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class Notification(models.Model):

    class NotificationType(models.TextChoices):
        CONNECTION_REQUEST = "connection_request", "Connection Request"
        CONNECTION_ACCEPTED = "connection_accepted", "Connection Accepted"
        CONNECTION_REJECTED = "connection_rejected", "Connection Rejected"
        CONNECTION_COMPLETED = "connection_completed", "Connection Completed"
        PAYMENT_PENDING = "payment_pending", "Payment Pending"
        PAYMENT_SUCCESS = "payment_success", "Payment Success"
        PAYMENT_FAILED = "payment_failed", "Payment Failed"

    notification_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="notifications"
    )

    connection = models.ForeignKey(
        "connections.Connection",
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True
    )

    title = models.CharField(max_length=255)

    message = models.TextField()

    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices
    )

    is_read = models.BooleanField(default=False)

    read_at = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} -> {self.user}"