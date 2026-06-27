from django.db import models
from account.models import Accounts


class UserProfile(models.Model):
    """
    Stores additional profile information for a user.
    Each user has only one profile.
    """

    user = models.OneToOneField(
        Accounts,
        on_delete=models.CASCADE,
        related_name="profile",
        limit_choices_to={"role": "user"},
    )

    bio = models.TextField(
        blank=True,
        null=True,
        help_text="A short description about the user."
    )

    country = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    county = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
    )

    date_of_birth = models.DateField(
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "user_profiles"
        ordering = ["-created_at"]
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    def __str__(self):
        return f"{self.user.full_name} ({self.user.email})"
    
    @property
    def age(self):
        """Calculate user's age based on date_of_birth."""
        if not self.date_of_birth:
            return None
        from datetime import date
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )