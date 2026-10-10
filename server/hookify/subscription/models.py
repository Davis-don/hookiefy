from django.db import models

# Create your models here.
# subscription/models.py

from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


# ============================================================
# QUERYSET + MANAGER
# ============================================================

class SubscriptionQuerySet(models.QuerySet):

    def active(self):
        now = timezone.now()
        return self.filter(
            models.Q(status=Subscription.STATUS_ACTIVE)
            & (
                models.Q(end_date__isnull=True)
                | models.Q(end_date__gt=now)
            )
        )

    def trialing(self):
        now = timezone.now()
        return self.filter(
            models.Q(status=Subscription.STATUS_TRIALING)
            & (
                models.Q(end_date__isnull=True)
                | models.Q(end_date__gt=now)
            )
        )

    def expired(self):
        now = timezone.now()
        return self.filter(
            models.Q(status=Subscription.STATUS_EXPIRED)
            | models.Q(end_date__lte=now)
        )

    def for_user(self, user):
        return self.filter(user=user).order_by("-created_at")


# ============================================================
# SUBSCRIPTION
# ============================================================

class Subscription(models.Model):
    """
    A user's subscription to a plan.

    - At most one active subscription per user.
    - `start_date` and `end_date` are fully editable.
    - `end_date = NULL` means "never expires".
    """

    STATUS_ACTIVE = "active"
    STATUS_TRIALING = "trialing"
    STATUS_EXPIRED = "expired"
    STATUS_CANCELLED = "cancelled"
    STATUS_PENDING = "pending"

    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_TRIALING, "Trialing"),
        (STATUS_EXPIRED, "Expired"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_PENDING, "Pending"),
    )

    # ── User + plan ──────────────────────────────────────
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )

    plan = models.ForeignKey(
        "plans.Plan",
        on_delete=models.PROTECT,
        related_name="subscriptions",
    )

    # ── Status ───────────────────────────────────────────
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
    )

    # ── Dates (fully editable) ───────────────────────────
    start_date = models.DateTimeField(
        default=timezone.now,
        blank=True,
        help_text="When the subscription becomes effective.",
    )

    end_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When it expires. Empty = never expires.",
    )

    # ── Renewal / payment ────────────────────────────────
    auto_renew = models.BooleanField(default=True)

    payment_reference = models.CharField(
        max_length=120,
        blank=True,
        null=True,
    )

    note = models.TextField(blank=True, default="")

    # ── Timestamps ───────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ── Manager ──────────────────────────────────────────
    objects = SubscriptionQuerySet.as_manager()

    class Meta:
        verbose_name = "Subscription"
        verbose_name_plural = "Subscriptions"
        ordering = ("-created_at",)

        indexes = (
            models.Index(fields=("user", "status")),
            models.Index(fields=("plan",)),
            models.Index(fields=("end_date",)),
        )

        constraints = (
            models.UniqueConstraint(
                fields=("user",),
                condition=models.Q(status="active"),
                name="one_active_subscription_per_user",
            ),
            models.UniqueConstraint(
                fields=("user",),
                condition=models.Q(status="trialing"),
                name="one_trialing_subscription_per_user",
            ),
        )

    def __str__(self):
        return f"{self.user} · {self.plan.plan_name} ({self.status})"

    # ── Validation ───────────────────────────────────────
    def clean(self):
        super().clean()
        if (
            self.start_date
            and self.end_date
            and self.end_date <= self.start_date
        ):
            raise ValidationError({
                "end_date": (
                    "End date must be after start date. "
                    "Leave it empty for a never-expiring subscription."
                )
            })

    # ── Save: auto-cancel any other active row ───────────
    def save(self, *args, **kwargs):
        from django.db import transaction

        with transaction.atomic():
            if self.status == self.STATUS_ACTIVE and self.user_id:
                Subscription.objects.filter(
                    user_id=self.user_id,
                    status=self.STATUS_ACTIVE,
                ).exclude(pk=self.pk).update(
                    status=self.STATUS_CANCELLED,
                    updated_at=timezone.now(),
                )
            super().save(*args, **kwargs)

    # ── State helpers ────────────────────────────────────
    @property
    def is_expired(self):
        if self.end_date is None:
            return False
        return self.end_date <= timezone.now()

    @property
    def is_current(self):
        if self.status not in (self.STATUS_ACTIVE, self.STATUS_TRIALING):
            return False
        return not self.is_expired

    @property
    def is_expiring_soon(self):
        if self.end_date is None:
            return False
        delta = self.end_date - timezone.now()
        return timedelta(0) < delta <= timedelta(days=7)

    @property
    def effective_status(self):
        if (
            self.status in (self.STATUS_ACTIVE, self.STATUS_TRIALING)
            and self.is_expired
        ):
            return self.STATUS_EXPIRED
        return self.status

    # ── Time remaining ───────────────────────────────────
    @property
    def days_remaining(self):
        if self.end_date is None:
            return None
        delta = self.end_date - timezone.now()
        if delta.total_seconds() <= 0:
            return 0
        return delta.days

    @property
    def seconds_remaining(self):
        if self.end_date is None:
            return None
        delta = self.end_date - timezone.now()
        return max(0, int(delta.total_seconds()))

    @property
    def months_remaining(self):
        days = self.days_remaining
        if days is None:
            return None
        return round(days / 30, 1)

    @property
    def duration_display(self):
        if self.end_date is None:
            return "Never expires"

        now = timezone.now()
        if self.end_date <= now:
            return "Expired"

        delta = self.end_date - now
        seconds = int(delta.total_seconds())
        days = delta.days

        if seconds < 3600:
            minutes = max(1, seconds // 60)
            return f"Expires in {minutes} minute{'s' if minutes != 1 else ''}"
        if seconds < 86400:
            hours = seconds // 3600
            return f"Expires in {hours} hour{'s' if hours != 1 else ''}"
        if days == 0:
            return "Expires today"
        if days < 30:
            return f"{days} day{'s' if days != 1 else ''} left"

        months = round(days / 30, 1)
        return f"{months} month{'s' if months != 1 else ''} left"