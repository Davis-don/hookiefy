# account/models.py
from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class AccountsManager(UserManager):
    def create_user(self, email, password=None, **extra_fields):
        """Create and save a user with the given email and password."""
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email=email, password=password, **extra_fields)


class Accounts(AbstractUser):
    username = None  # remove username completely

    GENDER_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    )

    ROLE_CHOICES = (
        ('user', 'User'),
        ('admin', 'Admin'),
        ('superadmin', 'Super Admin'),
    )

    ACCOUNT_STATUS_CHOICES = (
        ('public', 'Public'),
        ('private', 'Private'),
    )

    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, null=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True, null=True)
    
    # Account status: public or private
    account_status = models.CharField(
        max_length=10, 
        choices=ACCOUNT_STATUS_CHOICES, 
        default='public',
        help_text="Whether the user's account is public or private"
    )
    
    # Profile image fields for Cloudinary
    profile_image_url = models.URLField(
        max_length=500, 
        blank=True, 
        null=True,
        help_text="Public URL of the profile image from Cloudinary"
    )
    profile_image_public_id = models.CharField(
        max_length=255, 
        blank=True, 
        null=True,
        help_text="Cloudinary public ID for managing the image"
    )

    # ============================================================
    # PAYSTACK RECIPIENT FIELDS (Added for withdrawals)
    # ============================================================
    
    # Paystack recipient code for M-Pesa withdrawals
    paystack_recipient_code = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Paystack recipient code for M-Pesa withdrawals (stored after first withdrawal)"
    )
    
    # Phone number used for Paystack recipient (formatted)
    paystack_recipient_phone = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        help_text="Formatted phone number used for Paystack recipient"
    )
    
    # When the recipient was created
    paystack_recipient_created_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Date and time when Paystack recipient was created"
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = AccountsManager()

    def __str__(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return f"{name if name else self.email} ({self.email})"
    
    @property
    def full_name(self):
        """Returns the user's full name."""
        return f"{self.first_name} {self.last_name}".strip() or self.email
    
    @property
    def has_profile_image(self):
        """Returns True if the user has a profile image."""
        return bool(self.profile_image_url)
    
    @property
    def has_paystack_recipient(self):
        """Returns True if the user has a Paystack recipient code."""
        return bool(self.paystack_recipient_code)