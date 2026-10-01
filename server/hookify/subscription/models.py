# subscription/models.py
from datetime import timedelta

from django.db import models
from django.utils import timezone

from account.models import Accounts
from plans.models import Plan


class Subscription(models.Model):

    # ========================================================
    # RELATIONSHIPS
    # ========================================================

    user = models.OneToOneField(
        Accounts,
        on_delete=models.CASCADE,
        related_name="subscription",
        help_text="The user who owns this subscription.",
    )

    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,
        related_name="subscriptions",
        help_text="The user's current subscription plan.",
    )

    # ========================================================
    # DATES
    # ========================================================

    start_date = models.DateTimeField(
        default=timezone.now,
        editable=False,
        help_text="Start of the current subscription period.",
    )

    end_date = models.DateTimeField(
        editable=False,
        help_text="End of the current subscription period.",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    # ========================================================
    # META
    # ========================================================

    class Meta:
        db_table = "subscriptions"

        ordering = [
            "-start_date",
        ]

        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"

        indexes = [
            models.Index(
                fields=["plan", "user"]
            ),
            models.Index(
                fields=["end_date"]
            ),
        ]

    # ========================================================
    # SAVE
    # ========================================================

    def save(self, *args, **kwargs):

        if not self.end_date:
            base = self.start_date or timezone.now()

            # Free plans never expire — give them a far-future
            # end_date so any raw date logic elsewhere still
            # behaves sensibly.
            if self.plan and (self.plan.name or "").lower() == "free":
                self.end_date = base + timedelta(days=365 * 100)
            else:
                self.end_date = base + timedelta(days=30)

        super().save(*args, **kwargs)

    # ========================================================
    # STRING
    # ========================================================

    def __str__(self):
        return (
            f"{self.user.email} — "
            f"{self.plan.name} "
            f"({self.start_date:%Y-%m-%d} → "
            f"{self.end_date:%Y-%m-%d})"
        )

    # ========================================================
    # PAYMENT
    # ========================================================

    @property
    def latest_payment(self):
        """
        Return the most recent payment associated
        with this subscription.
        """

        return self.payments.order_by(
            "-created_at"
        ).first()

    # ========================================================
    # STATUS (PAYMENT-DERIVED)
    # ========================================================

    @property
    def status(self) -> str:
        """
        Subscription status is determined from the
        latest payment.

        No payment means pending.
        """

        payment = self.latest_payment

        if not payment:
            return "pending"

        return payment.status

    @property
    def status_display(self) -> str:
        """
        Human-readable subscription status.
        """

        payment = self.latest_payment

        if not payment:
            return "Pending"

        return payment.get_status_display()

    @property
    def is_paid(self) -> bool:
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

    # ========================================================
    # FREE PLAN CHECK
    # ========================================================

    @property
    def is_free_plan(self) -> bool:
        """
        True when this subscription is on the Free plan.
        Free plans never expire.
        """

        return bool(
            self.plan
            and (self.plan.name or "").lower() == "free"
        )

    # ========================================================
    # ACTIVE / EXPIRED
    # ========================================================

    @property
    def is_active(self) -> bool:
        """
        A subscription is active when:
        - it is on the free plan (never expires), OR
        - its end date has not passed.
        """

        if self.is_free_plan:
            return True

        if not self.end_date:
            return False

        return self.end_date > timezone.now()

    @property
    def is_expired(self) -> bool:
        """
        A subscription is expired when:
        - it is NOT a free plan, AND
        - its end date has passed (or is missing).
        """

        if self.is_free_plan:
            return False

        if not self.end_date:
            return True

        return self.end_date <= timezone.now()

    # ========================================================
    # TIME REMAINING
    # ========================================================

    @property
    def days_remaining(self) -> int:
        """
        Free plans have unlimited days; return a sentinel.
        """

        if self.is_free_plan:
            return 10 ** 9

        if not self.is_active:
            return 0

        return max(
            0,
            (self.end_date - timezone.now()).days,
        )

    @property
    def seconds_remaining(self) -> int:
        """
        Free plans have unlimited seconds; return a sentinel.
        """

        if self.is_free_plan:
            return 10 ** 9

        if not self.is_active:
            return 0

        return max(
            0,
            int(
                (
                    self.end_date - timezone.now()
                ).total_seconds()
            ),
        )