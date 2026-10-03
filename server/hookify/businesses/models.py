from django.db import models
from django.conf import settings


# ============================================================
# BUSINESSES MODEL
# ============================================================

class Businesses(models.Model):

    # --------------------------------------------------------
    # OWNER (many-to-one)
    # --------------------------------------------------------

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="businesses",
        help_text="The account that owns this business.",
    )

    # --------------------------------------------------------
    # BUSINESS NAME
    # --------------------------------------------------------

    business_name = models.CharField(
        max_length=200,
    )

    # --------------------------------------------------------
    # CATEGORY — goods or services
    # --------------------------------------------------------

    CATEGORY_CHOICES = (
        ("goods",    "Goods"),
        ("services", "Services"),
    )

    business_category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
    )

    # --------------------------------------------------------
    # BUSINESS TYPE
    # Examples: "Agriculture & Livestock", "Vehicle & Automotive"
    # --------------------------------------------------------

    business_type = models.CharField(
        max_length=120,
    )

    # --------------------------------------------------------
    # DESCRIPTION
    # --------------------------------------------------------

    description = models.TextField(
        default="",
        blank=True,
    )

    # --------------------------------------------------------
    # LOCATION
    # --------------------------------------------------------

    county = models.CharField(
        max_length=120,
    )

    city_town = models.CharField(
        max_length=120,
        help_text="City or town where the business is located.",
    )

    region = models.CharField(
        max_length=120,
        help_text="Specific area or locality, e.g. Kasuku, Kawangware.",
    )

    # --------------------------------------------------------
    # STATUS
    # --------------------------------------------------------

    STATUS_CHOICES = (
        ("active",    "Active"),
        ("paused",    "Paused"),
        ("draft",     "Draft"),
        ("closed",    "Closed"),
        ("suspended", "Suspended"),
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active",
        help_text="Current lifecycle state of the business.",
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
        verbose_name = "Business"
        verbose_name_plural = "Businesses"
        ordering = ("-created_at",)
        indexes = (
            models.Index(fields=("owner",)),
            models.Index(fields=("business_category",)),
            models.Index(fields=("county", "city_town")),
            models.Index(fields=("status",)),
        )

    # --------------------------------------------------------
    # STRING REPRESENTATION
    # --------------------------------------------------------

    def __str__(self):
        return f"{self.business_name} ({self.get_business_category_display()})"

    # --------------------------------------------------------
    # STATUS HELPERS
    # --------------------------------------------------------

    @property
    def is_active(self):
        return self.status == "active"

    @property
    def is_paused(self):
        return self.status == "paused"

    @property
    def is_closed(self):
        return self.status == "closed"

    @property
    def is_suspended(self):
        return self.status == "suspended"

    @property
    def status_display(self):
        return self.get_status_display()