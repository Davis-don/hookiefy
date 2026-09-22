# payments/models.py
from django.db import models


class PlatformConfig(models.Model):

    connection_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=100.00,
        help_text="Amount a user pays to obtain a connection.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "platform_configs"
        verbose_name = "Platform Configuration"
        verbose_name_plural = "Platform Configurations"

    def __str__(self):
        return f"Connection Fee — KES {self.connection_fee}"