# product_payment/models.py

import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


# ============================================================
# PRODUCT PAYMENT
# ============================================================

class ProductPayment(models.Model):
    """
    A single payment attempt to buy a product.

    Each completed purchase is one row. The row records:

        • what was bought  → product + quantity (with the price
                              captured in `amount` at the moment
                              of sale, so a later price change
                              doesn't rewrite financial history)
        • who bought it    → user + email/phone snapshot
        • who sold it      → business (denormalised from the
                              product at checkout so payouts /
                              accounting survive a product or
                              business deletion)
        • where it goes    → town (frozen at checkout, copied
                              into the Deliveries row created
                              when the payment completes)

    Lifecycle:
        pending   → gateway accepted the order, awaiting payment
        completed → paid and confirmed, product purchase granted
        failed    → gateway reported failure
        reversed  → payment was reversed by the gateway
        invalid   → gateway flagged the payment as invalid
        cancelled → user abandoned / cancelled the flow
    """

    # --------------------------------------------------------
    # IDENTITY
    # --------------------------------------------------------

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    merchant_reference = models.CharField(
        max_length=120,
        unique=True,
        db_index=True,
        help_text=(
            "Our unique reference for this payment. Sent to the "
            "gateway and returned on callbacks. Example: "
            "'PROD-8-9F3A2C7D1B04'."
        ),
    )

    order_tracking_id = models.CharField(
        max_length=120,
        unique=True,
        blank=True,
        null=True,
        db_index=True,
        help_text=(
            "The gateway's own identifier for this order. "
            "Populated after a successful SubmitOrderRequest."
        ),
    )

    # --------------------------------------------------------
    # RELATIONSHIPS
    # --------------------------------------------------------

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_payments",
        help_text=(
            "The account that made the purchase. Kept even if "
            "the user is later removed, so the payment row "
            "remains a complete audit record."
        ),
    )

    product = models.ForeignKey(
        "products.Products",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments",
        help_text=(
            "The product being purchased. SET_NULL so the "
            "payment survives a product deletion as a "
            "financial audit trail."
        ),
    )

    business = models.ForeignKey(
        "businesses.Businesses",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_payments",
        help_text=(
            "The seller. Denormalised from `product.business` "
            "at the moment of checkout so payouts and "
            "accounting don't depend on the product row still "
            "existing."
        ),
    )

    # --------------------------------------------------------
    # QUANTITY & DESTINATION
    # --------------------------------------------------------

    quantity = models.PositiveIntegerField(
        default=1,
        help_text="Number of units purchased. Amount = unit_price * quantity.",
    )

    town = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text=(
            "Delivery destination provided by the buyer at "
            "checkout. Copied into the Deliveries row created "
            "on payment completion. Kept on the payment row "
            "because the delivery is created server-side, "
            "inside the IPN handler, long after the client has "
            "left the checkout screen — the payment row is the "
            "only place the town can live between 'client typed "
            "it' and 'server creates the delivery'."
        ),
    )

    # --------------------------------------------------------
    # GATEWAY
    # --------------------------------------------------------

    GATEWAY_PESAPAL = "pesapal"
    GATEWAY_PAYSTACK = "paystack"
    GATEWAY_MPESA = "mpesa"

    GATEWAY_CHOICES = (
        (GATEWAY_PESAPAL, "PesaPal"),
        (GATEWAY_PAYSTACK, "Paystack"),
        (GATEWAY_MPESA, "M-Pesa"),
    )

    gateway = models.CharField(
        max_length=20,
        choices=GATEWAY_CHOICES,
        default=GATEWAY_PESAPAL,
    )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    STATUS_PENDING = "pending"
    STATUS_COMPLETED = "completed"
    STATUS_FAILED = "failed"
    STATUS_REVERSED = "reversed"
    STATUS_INVALID = "invalid"
    STATUS_CANCELLED = "cancelled"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_COMPLETED, "Completed"),
        (STATUS_FAILED, "Failed"),
        (STATUS_REVERSED, "Reversed"),
        (STATUS_INVALID, "Invalid"),
        (STATUS_CANCELLED, "Cancelled"),
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        db_index=True,
    )

    # --------------------------------------------------------
    # AMOUNT
    # --------------------------------------------------------

    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=(
            "Total amount charged, in the currency below. "
            "Equals (unit price at checkout) × quantity."
        ),
    )

    currency = models.CharField(
        max_length=8,
        default="KES",
    )

    # --------------------------------------------------------
    # CONTACT SNAPSHOT
    # --------------------------------------------------------
    # Captured at the moment of checkout so the row is fully
    # self-contained — doesn't depend on the user or product
    # still existing.

    email = models.EmailField(
        blank=True,
        null=True,
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
    )

    # --------------------------------------------------------
    # CONFIRMATION (populated on completion)
    # --------------------------------------------------------

    confirmation_code = models.CharField(
        max_length=120,
        blank=True,
        null=True,
        help_text="Gateway confirmation code / receipt number.",
    )

    payment_method = models.CharField(
        max_length=80,
        blank=True,
        null=True,
        help_text="e.g. 'card', 'mpesa', 'bank'.",
    )

    payment_account = models.CharField(
        max_length=120,
        blank=True,
        null=True,
        help_text=(
            "Masked account or phone the payment was charged to."
        ),
    )

    # --------------------------------------------------------
    # RAW PAYLOADS
    # --------------------------------------------------------
    # Kept for debugging and future reconciliation. JSON.

    submit_response = models.JSONField(
        null=True,
        blank=True,
        help_text="Full response from the initial order submission.",
    )

    status_response = models.JSONField(
        null=True,
        blank=True,
        help_text="Full response from the most recent status check.",
    )

    # --------------------------------------------------------
    # ERROR HANDLING
    # --------------------------------------------------------

    error_message = models.TextField(
        blank=True,
        null=True,
        help_text="Populated when the payment fails or is reversed.",
    )

    # --------------------------------------------------------
    # TIMESTAMPS
    # --------------------------------------------------------

    paid_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the gateway confirmed the payment.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --------------------------------------------------------
    # META
    # --------------------------------------------------------

    class Meta:
        verbose_name = "Product Payment"
        verbose_name_plural = "Product Payments"
        ordering = ("-created_at",)

        indexes = (
            models.Index(fields=("status", "created_at")),
            models.Index(fields=("user", "status")),
            models.Index(fields=("business", "status")),
            models.Index(fields=("product", "status")),
            models.Index(fields=("gateway", "status")),
        )

    # --------------------------------------------------------
    # STRING
    # --------------------------------------------------------

    def __str__(self):
        who = self.user.email if self.user else "—"
        what = self.product.name if self.product else "—"
        return f"{self.merchant_reference} · {who} · {what} · {self.status}"

    # --------------------------------------------------------
    # HELPERS
    # --------------------------------------------------------

    @property
    def is_terminal(self):
        """True when no further state change is expected."""
        return self.status in (
            self.STATUS_COMPLETED,
            self.STATUS_FAILED,
            self.STATUS_REVERSED,
            self.STATUS_INVALID,
            self.STATUS_CANCELLED,
        )

    @property
    def is_successful(self):
        return self.status == self.STATUS_COMPLETED

    @property
    def is_pending(self):
        return self.status == self.STATUS_PENDING

    @property
    def amount_display(self):
        """Human-readable amount, e.g. 'KES 1,500.00'."""
        return f"{self.currency} {self.amount:,.2f}"

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