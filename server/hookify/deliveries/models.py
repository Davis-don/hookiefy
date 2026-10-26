# deliveries/models.py

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


# ============================================================
# DELIVERY MODEL
# ============================================================

class Deliveries(models.Model):
    """
    A single delivery of a product to a client.

    A Deliveries row exists **only** because a ProductPayment
    transitioned to `completed`. The 1-to-1 link to
    ProductPayment enforces that at the schema level — one
    payment, at most one delivery, no duplicates.

    Lifecycle (independent of the payment's lifecycle):
        pending    → created when the payment completes,
                     awaiting dispatch
        delivered  → handed over to the recipient
        cancelled  → cancelled before dispatch (retained for audit)
        failed     → delivery attempt failed / returned

    The payment's status stays `completed` for the entire
    delivery lifecycle — this is a separate state machine.
    """

    # --------------------------------------------------------
    # IDENTITY
    # --------------------------------------------------------

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Unique delivery id.",
    )

    # --------------------------------------------------------
    # SOURCE PAYMENT — 1-to-1, the delivery exists because
    # this payment completed
    # --------------------------------------------------------

    payment = models.OneToOneField(
        "product_payment.ProductPayment",
        on_delete=models.CASCADE,
        related_name="delivery",
        help_text=(
            "The ProductPayment this delivery was created from. "
            "One-to-one: a payment has at most one delivery, "
            "and a delivery never exists without a completed "
            "payment. CASCADE so deleting a payment removes "
            "its delivery (there's nothing to deliver)."
        ),
    )

    # --------------------------------------------------------
    # RELATIONSHIPS
    # --------------------------------------------------------

    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="deliveries",
        help_text=(
            "The client who ordered this delivery. A client can "
            "have many deliveries; each delivery belongs to "
            "exactly one client."
        ),
    )

    product = models.ForeignKey(
        "products.Products",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deliveries",
        help_text=(
            "The product being delivered. SET_NULL so the "
            "delivery row survives a product deletion as an "
            "audit trail."
        ),
    )

    quantity = models.PositiveIntegerField(
        default=1,
        help_text=(
            "Number of units being delivered. Always 1 in the "
            "current flow — heavy items are shipped one at a "
            "time. Kept as a field so this can extend to bulk "
            "products without a schema change."
        ),
    )

    delivered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deliveries_handled",
        help_text=(
            "The account responsible for carrying out the "
            "delivery. Defaults to the business owner — the "
            "person who posted the product — because they're "
            "the seller shipping their own item. Can be "
            "reassigned later (to a courier, staff member, or "
            "third party) via the assign endpoint; null means "
            "explicitly unassigned."
        ),
    )

    delivered_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="deliveries_received",
        help_text=(
            "The account the delivery is addressed to. Often "
            "the same as `client`, but separate so deliveries "
            "can be sent to someone other than the buyer."
        ),
    )

    # --------------------------------------------------------
    # DESTINATION
    # --------------------------------------------------------

    town = models.CharField(
        max_length=200,
        help_text="Town or city the delivery is destined for.",
    )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    STATUS_PENDING = "pending"
    STATUS_DELIVERED = "delivered"
    STATUS_CANCELLED = "cancelled"
    STATUS_FAILED = "failed"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_DELIVERED, "Delivered"),
        (STATUS_CANCELLED, "Cancelled"),
        (STATUS_FAILED, "Failed"),
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )

    # --------------------------------------------------------
    # TIMESTAMPS
    # --------------------------------------------------------

    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the delivery was handed over.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --------------------------------------------------------
    # META
    # --------------------------------------------------------

    class Meta:
        verbose_name = "Delivery"
        verbose_name_plural = "Deliveries"
        ordering = ("-created_at",)

        indexes = (
            models.Index(fields=("client", "status")),
            models.Index(fields=("delivered_by", "status")),
            models.Index(fields=("delivered_to", "status")),
            models.Index(fields=("product", "status")),
            models.Index(fields=("status", "created_at")),
            models.Index(fields=("town",)),
        )

    # --------------------------------------------------------
    # STRING
    # --------------------------------------------------------

    def __str__(self):
        who = self.client.email if self.client_id else "—"
        what = self.product.name if self.product_id else "—"
        return f"{who} · {what} ×{self.quantity} · {self.town} · {self.status}"

    # --------------------------------------------------------
    # HELPERS
    # --------------------------------------------------------

    @property
    def is_terminal(self):
        """True when no further state change is expected."""
        return self.status in (
            self.STATUS_DELIVERED,
            self.STATUS_CANCELLED,
            self.STATUS_FAILED,
        )

    @property
    def is_pending(self):
        return self.status == self.STATUS_PENDING

    @property
    def is_delivered(self):
        return self.status == self.STATUS_DELIVERED

    @property
    def time_since_created(self):
        """Short relative string — 'just now', '3h', '2d'."""
        delta = timezone.now() - self.created_at
        seconds = int(delta.total_seconds())
        if seconds < 60:
            return "just now"
        if seconds < 3600:
            return f"{seconds // 60}m"
        if seconds < 86400:
            return f"{seconds // 3600}h"
        return f"{seconds // 86400}d"