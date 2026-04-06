from django.db import models
from django.utils import timezone
from django.db.models import Q
from django.core.exceptions import ValidationError
from datetime import timedelta


# =========================
# HOOKUP MODEL 🔥
# =========================
class Hookup(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
        ("completed", "Completed"),
    ]

    PAYMENT_STATUS_CHOICES = [
        ("unpaid", "Unpaid"),
        ("paid", "Paid"),
        ("refunded", "Refunded"),
    ]

    # =========================
    # RELATIONSHIPS
    # =========================

    sender = models.ForeignKey(
        'accounts.ClientProfile',
        on_delete=models.CASCADE,
        related_name="sent_hookups"
    )

    receiver = models.ForeignKey(
        'accounts.ClientProfile',
        on_delete=models.CASCADE,
        related_name="received_hookups"
    )

    # =========================
    # STATUS TRACKING
    # =========================

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )

    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="unpaid"
    )

    # =========================
    # READ STATUS 👀
    # =========================

    is_read_by_sender = models.BooleanField(default=True)
    is_read_by_receiver = models.BooleanField(default=False)

    # =========================
    # OPTIONAL DETAILS 💬
    # =========================

    message = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    scheduled_time = models.DateTimeField(blank=True, null=True)

    # =========================
    # TIMESTAMPS ⏱️
    # =========================

    responded_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # =========================
    # DELETION TIMESTAMPS 🗑️
    # =========================
    scheduled_deletion_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    # =========================
    # META ⚙️
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
    # STRING REPRESENTATION
    # =========================

    def __str__(self):
        return f"{self.sender.user.email} → {self.receiver.user.email} ({self.status})"

    # =========================
    # VALIDATION
    # =========================

    def clean(self):
        if self.sender == self.receiver:
            raise ValidationError("Sender and receiver cannot be the same")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    # =========================
    # BUSINESS LOGIC ⚡
    # =========================

    def accept(self):
        if self.status != "pending":
            raise ValueError("Only pending hookups can be accepted")

        self.status = "accepted"
        self.responded_at = timezone.now()

        # When accepted and paid, set receiver as unread
        if self.payment_status == "paid":
            self.is_read_by_sender = False
            self.is_read_by_receiver = False
            # Set deletion after 48 hours for accepted status
            self.schedule_deletion(hours=48)
        else:
            self.is_read_by_sender = False
            self.is_read_by_receiver = True

        self.save()

    def reject(self):
        if self.status != "pending":
            raise ValueError("Only pending hookups can be rejected")

        self.status = "rejected"
        self.responded_at = timezone.now()

        self.is_read_by_sender = False
        self.is_read_by_receiver = True

        self.save()

    def cancel(self):
        if self.status != "pending":
            raise ValueError("Only pending hookups can be cancelled")

        self.status = "cancelled"
        self.cancelled_at = timezone.now()

        self.save()

    def mark_as_paid(self):
        if self.status != "accepted":
            raise ValueError("Only accepted hookups can be marked as paid")

        if self.payment_status == "paid":
            raise ValueError("Hookup is already marked as paid")

        self.payment_status = "paid"
        self.paid_at = timezone.now()

        # When marked as paid, set read statuses
        self.is_read_by_sender = False
        self.is_read_by_receiver = False
        
        # Schedule deletion after 48 hours for accepted status
        self.schedule_deletion(hours=48)
        
        self.save()

    def mark_as_completed(self):
        if self.status != "accepted":
            raise ValueError("Only accepted hookups can be completed")

        self.status = "completed"
        self.completed_at = timezone.now()
        
        # When completed, set as read by receiver
        self.is_read_by_receiver = True
        self.is_read_by_sender = False
        
        # Schedule deletion after 24 hours for completed status
        self.schedule_deletion(hours=24)
        
        self.save()

    def schedule_deletion(self, hours=48):
        """Schedule deletion after specified hours"""
        self.scheduled_deletion_at = timezone.now() + timedelta(hours=hours)
        self.save(update_fields=['scheduled_deletion_at'])

    def soft_delete(self):
        """Soft delete the hookup"""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])

    # =========================
    # READ HELPERS 👇
    # =========================

    def mark_read_by_sender(self):
        if not self.is_read_by_sender:
            self.is_read_by_sender = True
            self.save(update_fields=["is_read_by_sender"])

    def mark_read_by_receiver(self):
        if not self.is_read_by_receiver:
            self.is_read_by_receiver = True
            self.save(update_fields=["is_read_by_receiver"])
    
    # =========================
    # PROPERTY FOR is_paid (for compatibility)
    # =========================
    
    @property
    def is_paid(self):
        """Property to check if payment is paid"""
        return self.payment_status == "paid"