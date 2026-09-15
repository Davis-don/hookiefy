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
        ("serviceprovider", "Service Provider"),
        ("serviceseeker", "Service Seeker"),
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="serviceseeker",
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
    #
    # Stores the Cloudinary HTTPS URL of the user's
    # profile image.
    #
    # Example:
    # https://res.cloudinary.com/your-cloud/image/upload/...
    #
    # This field is optional.
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
    #
    # Stores the Cloudinary public ID of the profile image.
    #
    # This is important when you want to:
    #
    # - Replace the profile image
    # - Delete the profile image
    # - Manage the image directly through Cloudinary
    #
    # Example:
    # profiles/user_123/profile
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
    #
    # Used to identify users who registered/logged in
    # through Google.
    #
    # Google provides a unique "sub" (subject) identifier
    # for every Google account.
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