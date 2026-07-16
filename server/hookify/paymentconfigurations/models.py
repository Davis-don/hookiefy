from django.db import models


class PaymentConfiguration(models.Model):
    """
    Stores payment gateway configuration.
    Normally there should only be one active configuration.
    """

    gateway_name = models.CharField(
        max_length=50,
        default="Pesapal"
    )

    ipn_id = models.CharField(
        max_length=255,
        unique=True,
        help_text="Pesapal IPN ID returned after registering the IPN URL."
    )

    ipn_url = models.URLField(
        max_length=500,
        help_text="Registered IPN callback URL."
    )

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