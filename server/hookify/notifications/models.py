# notifications/models.py

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


# ============================================================
# QUERYSET + MANAGER
# ============================================================

class NotificationQuerySet(models.QuerySet):
    """
    Convenience filters used across the app.
    """

    def unread(self):
        return self.filter(read_at__isnull=True)

    def read(self):
        return self.filter(read_at__isnull=False)

    def live(self):
        """
        Notifications that haven't expired (or never will).
        """
        now = timezone.now()
        return self.filter(
            models.Q(expires_at__isnull=True)
            | models.Q(expires_at__gt=now)
        )

    def for_user(self, user):
        return self.filter(recipient=user).order_by("-created_at")


# ============================================================
# NOTIFICATION
# ============================================================

class Notification(models.Model):
    """
    A single notification delivered to one recipient.

    Shape:
        recipient    → who sees it (the "to")
        actor        → who caused it (the "from"), may be null
                       for system-generated notifications
        title        → short headline shown in the list
        body         → longer descriptive text
        category     → a coarse bucket for grouping and icons
        severity     → visual urgency (info / success / warning / error)
        action_url   → optional deep link for a "View" button
        metadata     → arbitrary JSON for the frontend to interpret
        read_at      → null while unread, timestamp once read
        expires_at   → optional TTL; older rows can be pruned
    """

    # --------------------------------------------------------
    # IDENTITY
    # --------------------------------------------------------

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    # --------------------------------------------------------
    # TO — who receives the notification
    # --------------------------------------------------------

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="The account this notification is delivered to.",
        db_index=True,
    )

    # --------------------------------------------------------
    # FROM — who caused it
    # --------------------------------------------------------
    # Usually a user (e.g. a business owner notifying a customer),
    # but can be null for system-generated notifications like
    # "your payment was received".
    # --------------------------------------------------------

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sent_notifications",
        help_text="The user who triggered this notification, if any.",
    )

    # --------------------------------------------------------
    # CATEGORY
    # --------------------------------------------------------

    CATEGORY_PAYMENT = "payment"
    CATEGORY_SUBSCRIPTION = "subscription"
    CATEGORY_SYSTEM = "system"
    CATEGORY_SECURITY = "security"
    CATEGORY_SOCIAL = "social"
    CATEGORY_BUSINESS = "business"
    CATEGORY_ENGAGEMENT = "engagement"
    CATEGORY_PROMO = "promo"

    CATEGORY_CHOICES = (
        (CATEGORY_PAYMENT, "Payment"),
        (CATEGORY_SUBSCRIPTION, "Subscription"),
        (CATEGORY_SYSTEM, "System"),
        (CATEGORY_SECURITY, "Security"),
        (CATEGORY_SOCIAL, "Social"),
        (CATEGORY_BUSINESS, "Business"),
        (CATEGORY_ENGAGEMENT, "Engagement"),
        (CATEGORY_PROMO, "Promotion"),
    )

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
        default=CATEGORY_SYSTEM,
        db_index=True,
    )

    # --------------------------------------------------------
    # SEVERITY
    # --------------------------------------------------------

    SEVERITY_INFO = "info"
    SEVERITY_SUCCESS = "success"
    SEVERITY_WARNING = "warning"
    SEVERITY_ERROR = "error"

    SEVERITY_CHOICES = (
        (SEVERITY_INFO, "Info"),
        (SEVERITY_SUCCESS, "Success"),
        (SEVERITY_WARNING, "Warning"),
        (SEVERITY_ERROR, "Error"),
    )

    severity = models.CharField(
        max_length=10,
        choices=SEVERITY_CHOICES,
        default=SEVERITY_INFO,
        db_index=True,
    )

    # --------------------------------------------------------
    # CONTENT
    # --------------------------------------------------------

    title = models.CharField(
        max_length=200,
        help_text="Short headline, shown first.",
    )

    body = models.TextField(
        blank=True,
        default="",
        help_text="Longer descriptive text.",
    )

    # --------------------------------------------------------
    # ACTION (deep link)
    # --------------------------------------------------------
    # Optional — the frontend uses this to render a "View" button
    # that navigates somewhere relevant.
    # --------------------------------------------------------

    action_label = models.CharField(
        max_length=80,
        blank=True,
        default="",
        help_text="Text for the action button, e.g. 'View invoice'.",
    )

    action_url = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text=(
            "Frontend route the action button links to, "
            "e.g. '/useraccount/billing'."
        ),
    )

    # --------------------------------------------------------
    # METADATA (arbitrary JSON)
    # --------------------------------------------------------
    # For structured extras the frontend may need:
    #     { "payment_id": "...", "amount": "1500.00" }
    # --------------------------------------------------------

    metadata = models.JSONField(
        null=True,
        blank=True,
        help_text="Optional JSON payload for the frontend.",
    )

    # --------------------------------------------------------
    # READ STATE
    # --------------------------------------------------------

    read_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="When the recipient opened this notification.",
    )

    # --------------------------------------------------------
    # EXPIRY
    # --------------------------------------------------------
    # Optional TTL. `null` means "never expires".
    # --------------------------------------------------------

    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Optional expiry. Null = never expires.",
    )

    # --------------------------------------------------------
    # TIMESTAMPS
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
    )

    updated_at = models.DateTimeField(auto_now=True)

    # --------------------------------------------------------
    # MANAGER
    # --------------------------------------------------------

    objects = NotificationQuerySet.as_manager()

    # --------------------------------------------------------
    # META
    # --------------------------------------------------------

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ("-created_at",)

        indexes = (
            models.Index(fields=("recipient", "read_at", "-created_at")),
            models.Index(fields=("recipient", "category", "-created_at")),
            models.Index(fields=("recipient", "severity", "-created_at")),
            models.Index(fields=("expires_at",)),
        )

    # --------------------------------------------------------
    # STRING
    # --------------------------------------------------------

    def __str__(self):
        who = self.recipient.email if self.recipient else "—"
        return f"[{self.category}] {self.title} → {who}"

    # --------------------------------------------------------
    # STATE HELPERS
    # --------------------------------------------------------

    @property
    def is_read(self):
        return self.read_at is not None

    @property
    def is_unread(self):
        return self.read_at is None

    @property
    def is_expired(self):
        if self.expires_at is None:
            return False
        return self.expires_at <= timezone.now()

    @property
    def is_live(self):
        return not self.is_expired

    @property
    def has_action(self):
        return bool(self.action_url)

    # --------------------------------------------------------
    # ACTIONS
    # --------------------------------------------------------

    def mark_read(self, *, save=True):
        """
        Mark this notification as read. Idempotent — a second
        call is a no-op.
        """
        if self.read_at is not None:
            return False

        self.read_at = timezone.now()
        if save:
            self.save(update_fields=["read_at", "updated_at"])
        return True

    def mark_unread(self, *, save=True):
        """
        Flip the notification back to unread. Rarely needed but
        useful when a user "un-dismisses" something.
        """
        if self.read_at is None:
            return False

        self.read_at = None
        if save:
            self.save(update_fields=["read_at", "updated_at"])
        return True