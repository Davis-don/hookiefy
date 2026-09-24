# payments/models.py
from django.db import models
from account.models import Accounts
from connections.models import Connection


class Payment(models.Model):

    # ========================================================
    # GATEWAY
    # ========================================================

    GATEWAY_CHOICES = (
        ('pesapal', 'PesaPal'),
        ('paystack', 'Paystack'),
    )

    # ========================================================
    # STATUS
    # ========================================================

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    )

    # ========================================================
    # PAYMENT TYPE
    # ========================================================

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
        help_text="What this payment is for.",
    )

    # ========================================================
    # PAYER
    # ========================================================

    user = models.ForeignKey(
        Accounts,
        on_delete=models.CASCADE,
        related_name="payments"
    )

    # ========================================================
    # TARGETS — ONE OF THESE WILL BE SET
    # ========================================================

    connection = models.ForeignKey(
        Connection,
        on_delete=models.CASCADE,
        related_name="payments",
        blank=True,
        null=True,
        help_text="Set for hookup/connection payments.",
    )

    service = models.ForeignKey(
        "services.ClientService",
        on_delete=models.SET_NULL,
        related_name="payments",
        blank=True,
        null=True,
        help_text="Set for service-listing contact-reveal payments.",
    )

    # ========================================================
    # PAYMENT DETAILS
    # ========================================================

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

    gateway = models.CharField(
        max_length=20,
        choices=GATEWAY_CHOICES,
        default='pesapal',
        help_text="Payment gateway used (PesaPal or Paystack)"
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

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']

    def __str__(self):
        return (
            f"{self.merchant_reference} - {self.status} "
            f"({self.get_gateway_display()})"
        )