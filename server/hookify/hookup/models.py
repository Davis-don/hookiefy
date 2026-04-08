from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError


# =========================
# HOOKUP MODEL 🔥 (CLEAN VERSION)
# =========================
class Hookup(models.Model):

    # =========================
    # STATUS CHOICES
    # =========================

    PAYMENT_STATUS_CHOICES = [
        ("paid", "Paid"),
        ("not_paid", "Not Paid"),
    ]

    APPROVAL_STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
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
    # CORE FIELDS
    # =========================

    payment_status = models.CharField(
        max_length=10,
        choices=PAYMENT_STATUS_CHOICES,
        default="not_paid"
    )

    approval_status = models.CharField(
        max_length=10,
        choices=APPROVAL_STATUS_CHOICES,
        default="pending"
    )

    # =========================
    # DELETE FLAGS 🗑️
    # =========================

    is_deleted_by_sender = models.BooleanField(default=False)
    is_deleted_by_receiver = models.BooleanField(default=False)

    # =========================
    # READ STATUS 👀
    # =========================

    is_read_by_sender = models.BooleanField(default=True)
    is_read_by_receiver = models.BooleanField(default=False)

    # =========================
    # OPTIONAL DETAILS
    # =========================

    message = models.TextField(blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    scheduled_time = models.DateTimeField(blank=True, null=True)

    # =========================
    # TIMESTAMPS ⏱️
    # =========================

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    # =========================
    # META ⚙️
    # =========================

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["sender", "receiver"],
                condition=models.Q(approval_status="pending"),
                name="unique_pending_hookup"
            )
        ]

    # =========================
    # STRING REPRESENTATION
    # =========================

    def __str__(self):
        return f"{self.sender.user.email} → {self.receiver.user.email} ({self.approval_status})"

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

    def approve(self):
        if self.approval_status != "pending":
            raise ValueError("Only pending requests can be approved")

        self.approval_status = "approved"
        self.approved_at = timezone.now()

        # unread for both
        self.is_read_by_sender = False
        self.is_read_by_receiver = False

        self.save()

    def reject(self):
        if self.approval_status != "pending":
            raise ValueError("Only pending requests can be rejected")

        self.approval_status = "rejected"
        self.rejected_at = timezone.now()

        self.is_read_by_sender = False
        self.is_read_by_receiver = True

        self.save()

    def mark_as_paid(self):
        if self.approval_status != "approved":
            raise ValueError("Only approved hookups can be paid")

        if self.payment_status == "paid":
            raise ValueError("Already paid")

        self.payment_status = "paid"
        self.paid_at = timezone.now()

        self.is_read_by_sender = False
        self.is_read_by_receiver = False

        self.save()

    # =========================
    # DELETE LOGIC 🗑️
    # =========================

    def delete_by_sender(self):
        self.is_deleted_by_sender = True
        self.save(update_fields=["is_deleted_by_sender"])

    def delete_by_receiver(self):
        self.is_deleted_by_receiver = True
        self.save(update_fields=["is_deleted_by_receiver"])

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
    # PROPERTIES
    # =========================

    @property
    def hookup_id(self):
        return self.id

    @property
    def sender_id(self):
        return self.sender.id

    @property
    def receiver_id(self):
        return self.receiver.id