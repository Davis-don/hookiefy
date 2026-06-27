from django.db import models
from account.models import Accounts


class Preference(models.Model):
    """
    Stores the matching preferences for a user.
    Each user has only one preference record.
    """

    GENDER_PREFERENCE_CHOICES = (
        ("M", "Men"),
        ("F", "Women"),
        ("A", "Everyone"),
    )

    user = models.OneToOneField(
        Accounts,
        on_delete=models.CASCADE,
        related_name="preference",
        limit_choices_to={"role": "user"},
    )

    interested_in_gender = models.CharField(
        max_length=1,
        choices=GENDER_PREFERENCE_CHOICES,
        blank=True,
        null=True,
    )

    minimum_age = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
    )

    maximum_age = models.PositiveSmallIntegerField(
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
        db_table = "preferences"
        ordering = ["-created_at"]
        verbose_name = "Preference"
        verbose_name_plural = "Preferences"

    def __str__(self):
        return f"{self.user.full_name} Preferences"