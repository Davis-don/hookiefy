# payments/models.py
from django.db import models
from account.models import Accounts
from connections.models import Connection


class Payment(models.Model):

    GATEWAY_CHOICES = (
        ("pesapal", "PesaPal"),
        ("paystack", "Paystack"),
    )

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    )

    # Keep this as-is, or rename to category
    PAYMENT_TYPE_CONNECTION = "connection"
    PAYMENT_TYPE_SERVICE = "service"

    PAYMENT_TYPE_CHOICES = (
        (PAYMENT_TYPE_CONNECTION, "Connection"),
        (PAYMENT_TYPE_SERVICE, "Service"),
    )

    payment_type = models.CharField(
        max_length=20,
        choices=PAYMENT_TYPE_CHOICES,
        default=PAYMENT_TYPE_CONNECTION,
    )

    # ... everything else unchanged ...

    user = models.ForeignKey(
        Accounts,
        on_delete=models.CASCADE,
        related_name="payments",
    )

    connection = models.ForeignKey(
        Connection,
        on_delete=models.CASCADE,
        related_name="payments",
        blank=True,
        null=True,
    )

    service = models.ForeignKey(
        "services.ClientService",
        on_delete=models.SET_NULL,
        related_name="payments",
        blank=True,
        null=True,
    )

    merchant_reference = models.CharField(max_length=100, unique=True)
    order_tracking_id = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    phone_number = models.CharField(max_length=20)

    gateway = models.CharField(
        max_length=20,
        choices=GATEWAY_CHOICES,
        default="pesapal",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )

    paid_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payments"
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.merchant_reference} - {self.status} "
            f"({self.get_gateway_display()})"
        )

    # ---------- helpers ----------
    @property
    def is_completed(self) -> bool:
        return self.status == "completed"

    @property
    def is_terminal(self) -> bool:
        return self.status in ("completed", "failed", "cancelled")