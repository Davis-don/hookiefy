from django.db import models
from account.models import Accounts


class ClientAssignment(models.Model):
    """
    Assigns a role USER to a role ADMIN or SUPERADMIN.
    A user can only have one assignment.
    An admin/superadmin can manage many users.
    """

    user = models.OneToOneField(
        Accounts,
        on_delete=models.CASCADE,
        related_name="client_assignment",
        limit_choices_to={"role": "user"},
    )

    assigned_admin = models.ForeignKey(
        Accounts,
        on_delete=models.CASCADE,
        related_name="assigned_clients",
        limit_choices_to={"role__in": ["admin", "superadmin"]},
    )

    assigned_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "client_assignments"
        ordering = ["-assigned_at"]
        verbose_name = "Client Assignment"
        verbose_name_plural = "Client Assignments"

    def __str__(self):
        return f"{self.user.email} → {self.assigned_admin.email}"