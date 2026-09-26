# connections/models.py
from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class Connection(models.Model):

    class Source(models.TextChoices):
        HOOKUP = "hookup", "Hookup"
        SERVICE = "service", "Service Contact"
        ADVERT = "advert", "Advert"

    connection_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    # --------------------------------------------------------
    # INITIATOR
    # --------------------------------------------------------
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_connections",
        help_text="The user who initiated the connection.",
    )

    # --------------------------------------------------------
    # TARGET
    # --------------------------------------------------------
    receiver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="received_connections",
        help_text="The user whose contact is being unlocked.",
    )

    # --------------------------------------------------------
    # SOURCE
    # --------------------------------------------------------
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.HOOKUP,
        db_index=True,
    )

    # --------------------------------------------------------
    # LINK TO SERVICE (optional)
    # --------------------------------------------------------
    service = models.ForeignKey(
        "services.ClientService",
        on_delete=models.SET_NULL,
        related_name="connections",
        null=True,
        blank=True,
    )

    # --------------------------------------------------------
    # LINK TO PAYMENT
    # --------------------------------------------------------
    # This is where the connection's status comes from.
    # `payment.status` is the single source of truth.
    # --------------------------------------------------------
    payment = models.OneToOneField(
        "payments.Payment",
        on_delete=models.SET_NULL,
        related_name="linked_connection",
        null=True,
        blank=True,
        help_text=(
            "The payment that activates this connection. "
            "Status is read from here."
        ),
    )

    # --------------------------------------------------------
    # TIMESTAMPS
    # --------------------------------------------------------
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "connections"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["sender", "receiver"]),
            models.Index(fields=["source"]),
        ]

    def __str__(self):
        return (
            f"{self.sender} -> {self.receiver} "
            f"({self.source})"
        )

    # ========================================================
    # STATUS — DERIVED FROM PAYMENT
    # ========================================================

    @property
    def status(self) -> str:
        """
        The connection's status, taken straight from the linked
        payment. If there is no payment (or no link yet), it's
        PENDING.
        """
        if not self.payment_id:
            return "pending"
        return self.payment.status

    @property
    def status_display(self) -> str:
        if not self.payment_id:
            return "Pending"
        return self.payment.get_status_display()

    @property
    def is_paid(self) -> bool:
        return self.status == "completed"

    @property
    def is_pending(self) -> bool:
        if not self.payment_id:
            return True
        return self.payment.status == "pending"

    @property
    def is_failed(self) -> bool:
        if not self.payment_id:
            return False
        return self.payment.status == "failed"

    @property
    def is_cancelled(self) -> bool:
        if not self.payment_id:
            return False
        return self.payment.status == "cancelled"