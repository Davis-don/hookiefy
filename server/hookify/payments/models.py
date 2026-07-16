from django.db import models
from account.models import Accounts
from connections.models import Connection


class Payment(models.Model):

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    )

    # User who initiated the payment
    user = models.ForeignKey(
        Accounts,
        on_delete=models.CASCADE,
        related_name="payments"
    )

    # Hookup/connection being paid for
    connection = models.ForeignKey(
        Connection,
        on_delete=models.CASCADE,
        related_name="payments"
    )

    merchant_reference = models.CharField(
        max_length=100,
        unique=True
    )

    order_tracking_id = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    phone_number = models.CharField(
        max_length=20
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )

    paid_at = models.DateTimeField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.merchant_reference