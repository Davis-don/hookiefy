# userprofile/models.py

from datetime import date

from django.db import models

from account.models import Accounts


# ============================================================
# USER PROFILE MODEL
# ============================================================

class UserProfile(models.Model):
    """
    Stores additional profile information for a user.

    Relationship:
        One user  →  one profile
        One profile  →  one user

    The profile is created explicitly (e.g. after signup
    or on first profile edit). It is NOT auto-created on
    user creation — the app should call
    UserProfile.objects.get_or_create(user=...) when needed.

    Any role (serviceprovider, serviceseeker, superadmin)
    can have a profile.
    """

    # --------------------------------------------------------
    # USER (ONE-TO-ONE)
    # --------------------------------------------------------

    user = models.OneToOneField(
        Accounts,
        on_delete=models.CASCADE,
        related_name="profile",
        primary_key=True,
        help_text="The account this profile belongs to.",
    )

    # --------------------------------------------------------
    # BIO
    # --------------------------------------------------------

    bio = models.TextField(
        blank=True,
        null=True,
        help_text="A short description about the user.",
    )

    # --------------------------------------------------------
    # LOCATION
    # --------------------------------------------------------

    country = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Country of residence.",
    )

    county = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="County / state / region.",
    )

    city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="City or town.",
    )

    # --------------------------------------------------------
    # DATE OF BIRTH
    # --------------------------------------------------------

    date_of_birth = models.DateField(
        blank=True,
        null=True,
        help_text="Used to compute the user's age.",
    )

    # --------------------------------------------------------
    # TIMESTAMPS
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    # --------------------------------------------------------
    # META
    # --------------------------------------------------------

    class Meta:
        db_table = "user_profiles"
        ordering = ["-created_at"]
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"

    # --------------------------------------------------------
    # STRING REPRESENTATION
    # --------------------------------------------------------

    def __str__(self):
        return f"{self.user.full_name} ({self.user.email})"

    # --------------------------------------------------------
    # AGE
    # --------------------------------------------------------

    @property
    def age(self):
        """
        Return the user's age in years, or None if
        date_of_birth has not been set.
        """

        if not self.date_of_birth:
            return None

        today = date.today()

        return (
            today.year
            - self.date_of_birth.year
            - (
                (today.month, today.day)
                < (self.date_of_birth.month, self.date_of_birth.day)
            )
        )