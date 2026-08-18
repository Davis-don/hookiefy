from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class Connection(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        ACCEPTED = "ACCEPTED", "Accepted"
        REJECTED = "REJECTED", "Rejected"
        COMPLETED = "COMPLETED", "Completed"

    connection_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True
    )

    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_connections"
    )

    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_connections"
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "connections"
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["sender", "receiver"],
                condition=models.Q(
                    status__in=["PENDING", "ACCEPTED"]
                ),
                name="unique_active_connection"
            )
        ]

    def __str__(self):
        return f"{self.sender} -> {self.receiver} ({self.status})"