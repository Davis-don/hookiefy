# subscription/models.py
from datetime import timedelta

from django.db import models
from django.utils import timezone

from account.models import Accounts
from plans.models import Plan


class Subscription(models.Model):

    # --------------------------------------------------------
    # RELATIONSHIPS
    # --------------------------------------------------------

    user = models.OneToOneField(
        Accounts,
        on_delete=models.CASCADE,
        related_name="subscription",
    )

    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name="subscriptions",
    )

    # --------------------------------------------------------
    # LINK TO THE ACTIVE SUBSCRIPTION PAYMENT
    # --------------------------------------------------------
    # Same pattern as Connection.payment — the payment is the
    # single source of truth for status.
    # --------------------------------------------------------
    payment = models.OneToOneField(
        "subscription_payment.SubscriptionPayment",
        on_delete=models.SET_NULL,
        related_name="linked_subscription",
        null=True,
        blank=True,
        help_text=(
            "The payment that activates this subscription. "
            "Status is read from here."
        ),
    )

    # --------------------------------------------------------
    # DATES
    # --------------------------------------------------------

    start_date = models.DateTimeField(
        default=timezone.now,
        editable=False,
    )
    end_date = models.DateTimeField(
        editable=False,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subscriptions"
        ordering = ["-start_date"]
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"
        indexes = [
            models.Index(fields=["plan", "user"]),
        ]

    def save(self, *args, **kwargs):
        if not self.end_date:
            base = self.start_date or timezone.now()
            self.end_date = base + timedelta(days=30)
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.user.email} — {self.plan.name} "
            f"({self.start_date:%Y-%m-%d} → {self.end_date:%Y-%m-%d})"
        )

    # ========================================================
    # STATUS — DERIVED FROM THE LINKED PAYMENT
    # ========================================================

    @property
    def status(self) -> str:
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

    # ========================================================
    # ACTIVE / EXPIRED
    # ========================================================

    @property
    def is_active(self) -> bool:
        if not self.is_paid:
            return False
        if not self.end_date:
            return False
        return self.end_date > timezone.now()

    @property
    def is_expired(self) -> bool:
        if not self.end_date:
            return True
        return self.end_date <= timezone.now()

    @property
    def days_remaining(self) -> int:
        if not self.is_active:
            return 0
        return max(0, (self.end_date - timezone.now()).days)

    @property
    def seconds_remaining(self) -> int:
        if not self.is_active:
            return 0
        return max(0, int((self.end_date - timezone.now()).total_seconds()))