# subscription/models.py
from datetime import timedelta

from django.db import models
from django.utils import timezone

from account.models import Accounts
from plans.models import Plan


# ============================================================
# SUBSCRIPTION
# ============================================================
#
# - One subscription per user    → OneToOne on Accounts
# - Many subscriptions per plan  → ForeignKey on Plan
# - One payment per subscription → OneToOne on Payment
#
# Status is derived from the linked Payment — just like
# `Connection` derives its status from `Connection.payment`.
#
# When a subscription is purchased, a Payment row is
# created with payment_type="plan", and it's linked here via
# `payment`. Once that payment is marked "completed" by the
# payment flow, the subscription becomes active.
# ============================================================

class Subscription(models.Model):

    # --------------------------------------------------------
    # RELATIONSHIPS
    # --------------------------------------------------------

    user = models.OneToOneField(
        Accounts,
        on_delete=models.CASCADE,
        related_name="subscription",
        help_text="The account this subscription belongs to.",
    )

    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name="subscriptions",
        help_text=(
            "The plan this subscription is on. Many subscriptions "
            "can share the same plan."
        ),
    )

    # --------------------------------------------------------
    # LINK TO PAYMENT
    # --------------------------------------------------------
    # This is where the subscription's paid state comes from.
    # `payment.status` is the single source of truth for
    # whether the subscription is paid or not.
    # --------------------------------------------------------
    payment = models.OneToOneField(
        "payments.Payment",
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
        help_text="When the subscription started (auto-set on create).",
    )

    end_date = models.DateTimeField(
        editable=False,
        help_text="When the subscription ends (auto-computed: start + 30 days).",
    )

    # --------------------------------------------------------
    # TIMESTAMPS
    # --------------------------------------------------------

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --------------------------------------------------------
    # META
    # --------------------------------------------------------

    class Meta:
        db_table = "subscriptions"
        ordering = ["-start_date"]
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"
        indexes = [
            models.Index(fields=["plan", "user"]),
        ]

    # --------------------------------------------------------
    # SAVE — auto-compute end_date
    # --------------------------------------------------------

    def save(self, *args, **kwargs):
        """
        Auto-compute end_date = start_date + 30 days, but only
        if end_date hasn't been explicitly set yet.
        """
        if not self.end_date:
            base = self.start_date or timezone.now()
            self.end_date = base + timedelta(days=30)

        super().save(*args, **kwargs)

    # --------------------------------------------------------
    # STRING
    # --------------------------------------------------------

    def __str__(self):
        return (
            f"{self.user.email} — {self.plan.name} "
            f"({self.start_date:%Y-%m-%d} → {self.end_date:%Y-%m-%d})"
        )

    # ========================================================
    # STATUS — DERIVED FROM PAYMENT
    # ========================================================
    # Mirrors `Connection` — the payment is the source of truth
    # for whether the subscription is paid. Dates are only used
    # to figure out whether the subscription has expired.
    # ========================================================

    @property
    def status(self) -> str:
        """
        The subscription's status, taken straight from the linked
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
        """True when the linked payment is completed."""
        return self.status == "completed"

    @property
    def is_pending(self) -> bool:
        """True when there's no payment yet OR the payment is pending."""
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
    # ACTIVE / EXPIRED — derived from paid + dates
    # ========================================================

    @property
    def is_active(self) -> bool:
        """
        A subscription is active only when:
          - the linked payment is completed, AND
          - today is before (or on) end_date.
        """
        if not self.is_paid:
            return False
        if not self.end_date:
            return False
        return self.end_date > timezone.now()

    @property
    def is_expired(self) -> bool:
        """
        Expired once the end_date has passed (regardless of
        whether the payment was ever completed).
        """
        if not self.end_date:
            return True
        return self.end_date <= timezone.now()

    # ========================================================
    # TIME HELPERS
    # ========================================================

    @property
    def days_remaining(self) -> int:
        """Whole days left. 0 when expired."""
        if not self.is_active:
            return 0
        delta = self.end_date - timezone.now()
        return max(0, delta.days)

    @property
    def seconds_remaining(self) -> int:
        """Total seconds left. 0 when expired."""
        if not self.is_active:
            return 0
        delta = self.end_date - timezone.now()
        return max(0, int(delta.total_seconds()))