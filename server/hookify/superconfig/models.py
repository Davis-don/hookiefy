from django.db import models
from django.conf import settings


class AdminConfig(models.Model):
    admin = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="admin_config",
        limit_choices_to={"role": "admin"}
    )

    commission_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Percentage taken by the platform from the admin's client payments"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.admin.email} - {self.commission_percentage}%"