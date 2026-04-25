from django.db import models
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class Payment(models.Model):

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    PAYMENT_METHOD_CHOICES = [
        ("pesapal", "Pesapal"),
    ]

    # =========================
    # RELATIONSHIPS
    # =========================
    client = models.ForeignKey(
        'accounts.ClientProfile',
        on_delete=models.CASCADE,
        related_name="payments"
    )

    hookup = models.ForeignKey(
        'hookup.Hookup',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="payments"
    )

    # =========================
    # PAYMENT INFO
    # =========================
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="KES")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default="pesapal"
    )

    # =========================
    # PESAPAL DATA
    # =========================
    merchant_reference = models.CharField(max_length=100, unique=True)
    order_tracking_id = models.CharField(max_length=100, null=True, blank=True)

    redirect_url = models.URLField(max_length=600, null=True, blank=True)
    callback_url = models.URLField(max_length=600, null=True, blank=True)

    ipn_id = models.CharField(max_length=100, null=True, blank=True)

    # =========================
    # CUSTOMER SNAPSHOT
    # =========================
    email = models.EmailField()
    phone_number = models.CharField(max_length=20)

    description = models.CharField(max_length=255, blank=True)

    # raw responses
    pesapal_response = models.JSONField(null=True, blank=True)
    pesapal_status_response = models.JSONField(null=True, blank=True)

    # timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.client.user.email} - {self.amount} {self.status}"

    def mark_completed(self, data=None):
        """Mark payment as completed"""
        self.status = "completed"
        self.paid_at = timezone.now()
        if data:
            self.pesapal_status_response = data
        self.save()
        
        logger.info(f"Payment {self.id} marked as completed")

        if self.hookup:
            try:
                self.hookup.mark_as_paid()
                logger.info(f"Hookup {self.hookup.id} marked as paid")
            except Exception as e:
                logger.error(f"Error marking hookup as paid: {str(e)}")

    def mark_failed(self, data=None):
        """Mark payment as failed"""
        self.status = "failed"
        if data:
            self.pesapal_status_response = data
        self.save()
        
        logger.info(f"Payment {self.id} marked as failed")