# subscription_payment/models.py
import uuid

from django.db import models

from account.models import Accounts
from plans.models import Plan
from subscription.models import Subscription


# ============================================================
# SUBSCRIPTION PAYMENT
# ============================================================
#
# A ledger of every plan-purchase attempt.
#
# - One subscription has MANY SubscriptionPayments over time
#   (initial purchase + renewals + retries).
# - Each row tracks its own status independently.
# - `subscription.Subscription.is_paid` reads from this ledger.
# ============================================================

class SubscriptionPayment(models.Model):

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    STATUS_CHOICES = (
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    )

    # --------------------------------------------------------
    # GATEWAY
    # --------------------------------------------------------

    GATEWAY_CHOICES = (
        ("pesapal", "PesaPal"),
        ("paystack", "Paystack"),
    )

    # --------------------------------------------------------
    # IDENTIFIER
    # --------------------------------------------------------

    subscription_payment_id = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
    )

    # --------------------------------------------------------
    # RELATIONSHIPS
    # --------------------------------------------------------

    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name="payments",
        help_text="The subscription this payment belongs to.",
    )

    user = models.ForeignKey(
        Accounts,
        on_delete=models.CASCADE,
        related_name="subscription_payments",  # ← distinct from "subscription"
        help_text="The user who paid.",
    )

    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name="subscription_payments",
        help_text="The plan purchased in this payment.",
    )

    # --------------------------------------------------------
    # PAYMENT DETAILS
    # --------------------------------------------------------

    merchant_reference = models.CharField(
        max_length=100,
        unique=True,
    )

    order_tracking_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    phone_number = models.CharField(
        max_length=20,
    )

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

    # --------------------------------------------------------
    # DATES
    # --------------------------------------------------------

    paid_at = models.DateTimeField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --------------------------------------------------------
    # META
    # --------------------------------------------------------

    class Meta:
        db_table = "subscription_payments"
        ordering = ["-created_at"]
        verbose_name = "Subscription Payment"
        verbose_name_plural = "Subscription Payments"
        indexes = [
            models.Index(fields=["subscription", "status"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["plan", "status"]),
        ]

    # --------------------------------------------------------
    # STRING
    # --------------------------------------------------------

    def __str__(self):
        return (
            f"{self.merchant_reference} — "
            f"{self.plan.name} — {self.status}"
        )

    # ========================================================
    # HELPERS
    # ========================================================

    @property
    def is_completed(self) -> bool:
        return self.status == "completed"

    @property
    def is_pending(self) -> bool:
        return self.status == "pending"

    @property
    def is_failed(self) -> bool:
        return self.status == "failed"

    @property
    def is_cancelled(self) -> bool:
        return self.status == "cancelled"

    @property
    def is_terminal(self) -> bool:
        return self.status in ("completed", "failed", "cancelled")