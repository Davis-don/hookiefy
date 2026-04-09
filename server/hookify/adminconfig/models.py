from django.db import models
from django.conf import settings
from django.core.exceptions import PermissionDenied


class ClientConfig(models.Model):
    """
    Global configuration model (singleton).
    Stores hookup fee.
    Only admin/superadmin can update.
    """

    hookup_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Fee charged for a hookup"
    )

    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="client_config_updates"
    )

    updated_at = models.DateTimeField(auto_now=True)

    # -------------------------------
    # Enforce SINGLE INSTANCE
    # -------------------------------
    def save(self, *args, **kwargs):
        user = kwargs.pop("user", None)

        # Prevent multiple rows
        if not self.pk and ClientConfig.objects.exists():
            raise Exception("Only one ClientConfig instance is allowed.")

        # Restrict who can update
        if user:
            if user.role not in ["admin", "superadmin"]:
                raise PermissionDenied("Only admin or superadmin can update this.")

            self.updated_by = user

        super().save(*args, **kwargs)

    # -------------------------------
    # Helper method
    # -------------------------------
    @classmethod
    def get_config(cls):
        return cls.objects.first()

    def __str__(self):
        return f"ClientConfig - Hookup Fee: {self.hookup_fee}"