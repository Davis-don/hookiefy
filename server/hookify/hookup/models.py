from django.db import models
from django.utils import timezone
from django.db.models import Q
from django.core.exceptions import ValidationError

# =========================
# HOOKUP MODEL 🔥
# =========================
class Hookup(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
    ]

    PAYMENT_STATUS_CHOICES = [
        ("unpaid", "Unpaid"),
        ("paid", "Paid"),
    ]

    # Client who sends the request
    sender = models.ForeignKey(
        'accounts.ClientProfile',  # Replace 'accounts' with your actual app name
        on_delete=models.CASCADE,
        related_name="sent_hookups"
    )

    # Client who receives the request
    receiver = models.ForeignKey(
        'accounts.ClientProfile',
        on_delete=models.CASCADE,
        related_name="received_hookups"
    )

    # Request status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )

    # Payment tracking
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="unpaid"
    )

    # When receiver responded (accept/reject)
    responded_at = models.DateTimeField(null=True, blank=True)

    # When payment was completed
    paid_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # =========================
    # Meta
    # =========================
    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["sender", "receiver"],
                condition=Q(status="pending"),
                name="unique_pending_hookup"
            )
        ]

    # =========================
    # String representation
    # =========================
    def __str__(self):
        return f"{self.sender.user.email} → {self.receiver.user.email} ({self.status})"

    # =========================
    # Validation (Django admin safe)
    # =========================
    def clean(self):
        # Prevent self-hookup
        if self.sender == self.receiver:
            raise ValidationError("Sender and receiver cannot be the same")

    def save(self, *args, **kwargs):
        # Run validation before saving
        self.full_clean()
        super().save(*args, **kwargs)

    # =========================
    # Business logic methods ⚡
    # =========================
    def accept(self):
        if self.status != "pending":
            raise ValueError("Only pending hookups can be accepted")
        self.status = "accepted"
        self.responded_at = timezone.now()
        self.save()

    def reject(self):
        if self.status != "pending":
            raise ValueError("Only pending hookups can be rejected")
        self.status = "rejected"
        self.responded_at = timezone.now()
        self.save()

    def cancel(self):
        if self.status != "pending":
            raise ValueError("Only pending hookups can be cancelled")
        self.status = "cancelled"
        self.save()

    def mark_as_paid(self):
        if self.status != "accepted":
            raise ValueError("Only accepted hookups can be marked as paid")
        if self.payment_status == "paid":
            raise ValueError("Hookup is already marked as paid")
        self.payment_status = "paid"
        self.paid_at = timezone.now()
        self.save()