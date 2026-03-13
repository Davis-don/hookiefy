from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

# Create your models here.

class Bio(models.Model):
    """
    Bio model for client profiles containing all personal information
    Each client has one and only one bio
    """
    GENDER_CHOICES = [
        ("male", "Male"),
        ("female", "Female"),
        ("other", "Other"),
        ("nonbinary", "Non-binary"),
        ("prefer_not_say", "Prefer not to say"),
    ]

    # Link to ClientProfile (one-to-one relationship)
    client_profile = models.OneToOneField(
        'accounts.ClientProfile',  # String reference to avoid circular import
        on_delete=models.CASCADE,
        related_name='bio',
        help_text="The client this bio belongs to"
    )

    # Basic Information (first_name and last_name removed - they're in User model)
    age = models.IntegerField(
        validators=[MinValueValidator(18), MaxValueValidator(120)],
        help_text="Client's age (must be 18 or older)"
    )
    gender = models.CharField(
        max_length=20,
        choices=GENDER_CHOICES,
        help_text="Client's gender"
    )

    # Location Information
    country = models.CharField(
        max_length=100,
        default="Kenya",
        help_text="Country of residence"
    )
    county = models.CharField(
        max_length=100,
        help_text="County of residence"
    )
    location_desc = models.TextField(
        max_length=500,
        help_text="Detailed location description (area, landmark, etc.)"
    )

    # Image Information
    uploaded_img = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Cloudinary URL of the uploaded image"
    )
    uploaded_img_public_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Cloudinary public ID for the uploaded image (used for deletions)"
    )

    # Bio/Info
    info = models.TextField(
        max_length=1000,
        help_text="Client's bio, what they're looking for, etc."
    )

    # Optional Fields (all can be null/blank)
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Optional phone number"
    )
    date_of_birth = models.DateField(
        blank=True,
        null=True,
        help_text="Optional date of birth"
    )
    occupation = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Optional occupation"
    )
    interests = models.TextField(
        max_length=1000,
        blank=True,
        null=True,
        help_text="Optional interests/hobbies"
    )

    # Metadata
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this bio is active"
    )
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether the client has been verified"
    )
    verification_document = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Optional verification document URL"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Client Bio"
        verbose_name_plural = "Client Bios"
        indexes = [
            models.Index(fields=['country', 'county']),
            models.Index(fields=['is_active', 'is_verified']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        # Access first_name and last_name from the related User model
        user = self.client_profile.user
        return f"Bio for {user.first_name} {user.last_name} (Client: {user.email})"

    @property
    def full_name(self):
        """Returns the client's full name from the User model"""
        user = self.client_profile.user
        return f"{user.first_name} {user.last_name}"

    @property
    def first_name(self):
        """Returns first name from User model for convenience"""
        return self.client_profile.user.first_name

    @property
    def last_name(self):
        """Returns last name from User model for convenience"""
        return self.client_profile.user.last_name

    @property
    def email(self):
        """Returns email from User model for convenience"""
        return self.client_profile.user.email

    @property
    def location_full(self):
        """Returns full location string"""
        return f"{self.country}, {self.county} - {self.location_desc}"

    def update_image(self, image_url, public_id=None):
        """
        Update the client's image URL and public_id
        """
        self.uploaded_img = image_url
        if public_id:
            self.uploaded_img_public_id = public_id
        self.save(update_fields=['uploaded_img', 'uploaded_img_public_id', 'updated_at'])
        return True

    def clear_image(self):
        """
        Clear the client's image fields
        (Use this after deleting from Cloudinary)
        """
        self.uploaded_img = None
        self.uploaded_img_public_id = None
        self.save(update_fields=['uploaded_img', 'uploaded_img_public_id', 'updated_at'])
        return True

    @classmethod
    def get_active_bios(cls):
        """Return all active bios"""
        return cls.objects.filter(is_active=True)

    @classmethod
    def get_bios_by_county(cls, county):
        """Return bios filtered by county"""
        return cls.objects.filter(county__iexact=county, is_active=True)

    @classmethod
    def get_bios_by_country(cls, country):
        """Return bios filtered by country"""
        return cls.objects.filter(country__iexact=country, is_active=True)