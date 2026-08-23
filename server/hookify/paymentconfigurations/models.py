# paymentconfigurations/models.py
from django.db import models

class PaymentConfiguration(models.Model):
    """
    Stores payment gateway configuration.
    """

    GATEWAY_CHOICES = (
        ('pesapal', 'PesaPal'),
        ('paystack', 'Paystack'),
    )

    gateway_name = models.CharField(
        max_length=50,
        choices=GATEWAY_CHOICES,
        default='pesapal'
    )

    # Pesapal specific fields - make nullable
    ipn_id = models.CharField(
        max_length=255,
        unique=True,
        null=True,  # ✅ Allow null
        blank=True,  # ✅ Allow blank
        help_text="Pesapal IPN ID returned after registering the IPN URL."
    )

    ipn_url = models.URLField(
        max_length=500,
        null=True,  # ✅ Allow null
        blank=True,  # ✅ Allow blank
        help_text="Registered IPN callback URL."
    )

    # Paystack specific fields
    secret_key = models.CharField(max_length=255, blank=True, null=True)
    public_key = models.CharField(max_length=255, blank=True, null=True)
    callback_url = models.URLField(max_length=500, blank=True, null=True)

    is_active = models.BooleanField(
        default=True,
        help_text="Whether this configuration is currently active."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payment_configurations"
        verbose_name = "Payment Configuration"
        verbose_name_plural = "Payment Configurations"

    def __str__(self):
        return f"{self.gateway_name} Configuration"