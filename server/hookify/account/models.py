# account/models.py

from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


# ============================================================
# ACCOUNTS MANAGER
# ============================================================

class AccountsManager(UserManager):

    def create_user(self, email, password=None, **extra_fields):
        """
        Create and save a user using email instead of username.
        """

        if not email:
            raise ValueError("The Email field must be set")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields
        )

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and save a superuser.
        """

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "superadmin")

        if extra_fields.get("is_staff") is not True:
            raise ValueError(
                "Superuser must have is_staff=True."
            )

        if extra_fields.get("is_superuser") is not True:
            raise ValueError(
                "Superuser must have is_superuser=True."
            )

        return self.create_user(
            email=email,
            password=password,
            **extra_fields
        )


# ============================================================
# ACCOUNTS MODEL
# ============================================================

class Accounts(AbstractUser):

    # --------------------------------------------------------
    # REMOVE USERNAME
    # --------------------------------------------------------

    username = None

    # --------------------------------------------------------
    # GENDER
    # --------------------------------------------------------

    GENDER_CHOICES = (
        ("M", "Male"),
        ("F", "Female"),
        ("O", "Other"),
    )

    gender = models.CharField(
        max_length=1,
        choices=GENDER_CHOICES,
        blank=True,
        null=True,
    )

    # --------------------------------------------------------
    # ROLE
    # --------------------------------------------------------

    ROLE_CHOICES = (
        ("superadmin", "Super Admin"),
        ("user", "User"),
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="user",
    )

    # --------------------------------------------------------
    # EMAIL
    # --------------------------------------------------------

    email = models.EmailField(
        unique=True
    )

    # --------------------------------------------------------
    # PHONE NUMBER
    # --------------------------------------------------------

    phone_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
    )

    # --------------------------------------------------------
    # PROFILE IMAGE URL
    # --------------------------------------------------------

    profile_image_url = models.URLField(
        max_length=1000,
        blank=True,
        null=True,
        help_text="Cloudinary profile image URL.",
    )

    # --------------------------------------------------------
    # CLOUDINARY PUBLIC ID
    # --------------------------------------------------------

    profile_image_public_id = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Cloudinary public ID for the profile image.",
    )

    # --------------------------------------------------------
    # GOOGLE ACCOUNT
    # --------------------------------------------------------

    google_id = models.CharField(
        max_length=255,
        unique=True,
        blank=True,
        null=True,
        help_text="Unique Google account ID.",
    )

    # --------------------------------------------------------
    # AUTHENTICATION PROVIDER
    # --------------------------------------------------------

    AUTH_PROVIDER_CHOICES = (
        ("local", "Local"),
        ("google", "Google"),
    )

    auth_provider = models.CharField(
        max_length=20,
        choices=AUTH_PROVIDER_CHOICES,
        default="local",
    )

    # --------------------------------------------------------
    # ACCOUNT ACTIVE STATUS
    # --------------------------------------------------------

    is_active = models.BooleanField(
        default=True
    )

    # --------------------------------------------------------
    # DJANGO AUTHENTICATION
    # --------------------------------------------------------

    USERNAME_FIELD = "email"

    REQUIRED_FIELDS = []

    # --------------------------------------------------------
    # MANAGER
    # --------------------------------------------------------

    objects = AccountsManager()

    # ========================================================
    # METHODS / PROPERTIES
    # ========================================================

    def __str__(self):
        """
        Display user's full name if available.
        Otherwise display email.
        """

        name = f"{self.first_name} {self.last_name}".strip()

        return (
            f"{name} ({self.email})"
            if name
            else self.email
        )

    # --------------------------------------------------------
    # FULL NAME
    # --------------------------------------------------------

    @property
    def full_name(self):
        """
        Return user's full name.
        """

        return (
            f"{self.first_name} {self.last_name}".strip()
            or self.email
        )

    # --------------------------------------------------------
    # PROFILE IMAGE CHECK
    # --------------------------------------------------------

    @property
    def has_profile_image(self):
        """
        Return True if the user has a profile image.
        """

        return bool(self.profile_image_url)

    # --------------------------------------------------------
    # GOOGLE USER CHECK
    # --------------------------------------------------------

    @property
    def is_google_user(self):
        """
        Return True if this account was created
        or connected through Google.
        """

        return self.auth_provider == "google"

    # ========================================================
    # SUBSCRIPTION HELPERS
    # ========================================================
    #
    # A user's plan comes from their active Subscription row.
    # `Accounts` itself has no plan FK — the relationship is
    # one user → many subscriptions (one active at a time).
    #
    # These properties delegate to the subscription service so
    # callers can keep using `user.effective_plan`, `user.plan_name`
    # without knowing about the Subscription model.
    # ========================================================

    @property
    def active_subscription(self):
        """
        The user's current Subscription instance, or None.

        "Current" means: status is active/trialing and the
        end_date hasn't passed (or is NULL = no expiry).
        """
        from subscription.services import get_active_subscription
        return get_active_subscription(self)

    @property
    def effective_plan(self):
        """
        The plan the user is entitled to right now.

        Priority:
            1. Plan from the user's active subscription.
            2. Plan marked is_default=True in the catalogue.
            3. Cheapest active plan.
            4. None.
        """
        from subscription.services import get_effective_plan
        return get_effective_plan(self)

    @property
    def plan_name(self):
        """
        Convenience for templates — the effective plan's name,
        or "—" when no plan can be resolved.
        """
        plan = self.effective_plan
        return plan.plan_name if plan else "—"

    @property
    def is_on_default_plan(self):
        """
        True when the user is currently on whatever plan the
        system marks as the default.
        """
        plan = self.effective_plan
        return bool(plan and plan.is_default)

    @property
    def has_active_subscription(self):
        """
        True if a live Subscription row exists for this user.
        """
        return self.active_subscription is not None