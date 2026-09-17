# services/models.py
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator
from django.utils.text import slugify


# ============================================================
# SERVICE CATEGORY
# ============================================================

class ServiceCategory(models.Model):
    """
    A top-level category that services/products can belong to.

    Examples:
        - Teaching
        - Vehicle Sales
        - Plumbing
        - Photography
        - Catering
        - Electronics
    """

    name = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
    )

    slug = models.SlugField(
        max_length=120,
        unique=True,
        db_index=True,
        blank=True,
    )

    description = models.TextField(
        blank=True,
        default="",
    )

    image_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    is_featured = models.BooleanField(
        default=False,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        verbose_name = "Service Category"
        verbose_name_plural = "Service Categories"
        ordering = ["name"]

        indexes = [
            models.Index(fields=["is_active", "name"]),
            models.Index(fields=["is_featured", "name"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


# ============================================================
# CLIENT SERVICE / SERVICE LISTING
# ============================================================

class ClientService(models.Model):
    """
    A service or product listing created by a service provider.

    One service provider can have many ClientService records.

    A ClientService belongs to:
        - exactly one service provider
        - exactly one service category

    Images are stored as related ServiceImage rows, so a
    listing can carry any number of photos.
    """

    # ========================================================
    # LISTING TYPE
    # ========================================================

    LISTING_TYPE_CHOICES = (
        ("service", "Service"),
        ("product", "Product"),
    )

    listing_type = models.CharField(
        max_length=20,
        choices=LISTING_TYPE_CHOICES,
        default="service",
        db_index=True,
        help_text=(
            "Whether this listing represents a service "
            "or a product/good for sale."
        ),
    )

    # ========================================================
    # SERVICE PROVIDER
    # ========================================================

    provider = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="client_services",
        limit_choices_to={
            "role__in": ["serviceprovider", "superadmin"]
        },
        help_text=(
            "User providing or selling this service/product."
        ),
    )

    # ========================================================
    # SERVICE CATEGORY
    # ========================================================

    category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.PROTECT,
        related_name="client_services",
        help_text=(
            "The single category this service/product belongs to."
        ),
    )

    # ========================================================
    # SERVICE / PRODUCT TITLE
    # ========================================================

    title = models.CharField(
        max_length=255,
        db_index=True,
        help_text=(
            "Name of the service or product, "
            "e.g. 'Mathematics Tutoring' or 'Toyota Premio 2018'."
        ),
    )

    # ========================================================
    # DESCRIPTION
    # ========================================================

    description = models.TextField(
        help_text=(
            "Detailed description of the service or product."
        ),
    )

    # ========================================================
    # PRICE
    # ========================================================

    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Price in Kenyan Shillings (KES).",
    )

    # ========================================================
    # PRICING UNIT
    # ========================================================

    PRICING_UNIT_CHOICES = (
        ("per_hour", "Per Hour"),
        ("per_day", "Per Day"),
        ("per_week", "Per Week"),
        ("per_month", "Per Month"),
        ("per_job", "Per Job"),
        ("per_item", "Per Item"),
    )

    pricing_unit = models.CharField(
        max_length=20,
        choices=PRICING_UNIT_CHOICES,
        default="per_job",
        help_text="How the listed price is charged.",
    )

    # ========================================================
    # STATUS
    # ========================================================

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text=(
            "Inactive listings are hidden from public results."
        ),
    )

    # ========================================================
    # TIMESTAMPS
    # ========================================================

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    # ========================================================
    # META
    # ========================================================

    class Meta:
        verbose_name = "Client Service"
        verbose_name_plural = "Client Services"
        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["provider", "is_active"]),
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["listing_type", "is_active"]),
            models.Index(fields=["title"]),
        ]

    # ========================================================
    # STRING
    # ========================================================

    def __str__(self):
        return f"{self.title} - {self.provider}"

    # ========================================================
    # CONVENIENCE
    # ========================================================

    @property
    def primary_image(self):
        """
        Return the ServiceImage marked as primary, or the
        first image in the collection, or None if there are
        no images.
        """

        images = list(self.images.all())

        if not images:
            return None

        for img in images:
            if img.is_primary:
                return img

        return images[0]

    @property
    def primary_image_url(self):
        """
        Shortcut for the primary image URL (or None).
        """

        img = self.primary_image
        return img.image_url if img else None


# ============================================================
# SERVICE IMAGE — Cloudinary-backed, many per listing
# ============================================================

class ServiceImage(models.Model):
    """
    A single image attached to a ClientService.

    Each row stores:
        - image_url       → Cloudinary secure URL (https://...)
        - image_public_id → Cloudinary public ID, used to
                            delete or replace the asset later
        - is_primary      → whether this is the cover photo
        - display_order   → manual ordering within the gallery

    Upload the file to Cloudinary on the frontend (unsigned
    preset) or backend, then POST the returned URL + public_id
    to this model.
    """

    # ========================================================
    # PARENT LISTING
    # ========================================================

    service = models.ForeignKey(
        ClientService,
        on_delete=models.CASCADE,
        related_name="images",
        help_text=(
            "The service/product this image belongs to."
        ),
    )

    # ========================================================
    # CLOUDINARY FIELDS
    # ========================================================

    image_url = models.URLField(
        max_length=1000,
        help_text=(
            "Cloudinary secure URL for this image "
            "(https://res.cloudinary.com/...)."
        ),
    )

    image_public_id = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text=(
            "Cloudinary public ID, used for deleting or "
            "replacing the asset."
        ),
    )

    # ========================================================
    # GALLERY ORDERING
    # ========================================================

    is_primary = models.BooleanField(
        default=False,
        db_index=True,
        help_text=(
            "Whether this image is the cover for the listing. "
            "Only one image per service should be primary."
        ),
    )

    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Lower numbers appear first.",
    )

    # ========================================================
    # TIMESTAMPS
    # ========================================================

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    # ========================================================
    # META
    # ========================================================

    class Meta:
        verbose_name = "Service Image"
        verbose_name_plural = "Service Images"
        ordering = ["display_order", "id"]

        indexes = [
            models.Index(fields=["service", "display_order"]),
            models.Index(fields=["service", "is_primary"]),
        ]

    # ========================================================
    # STRING
    # ========================================================

    def __str__(self):
        return f"Image for {self.service_id} (#{self.pk})"

    # ========================================================
    # ENFORCE SINGLE PRIMARY PER SERVICE
    # ========================================================

    def save(self, *args, **kwargs):
        """
        When this image is marked primary, flip all other
        images for the same service to non-primary.
        """

        super().save(*args, **kwargs)

        if self.is_primary:
            ServiceImage.objects.filter(
                service_id=self.service_id
            ).exclude(pk=self.pk).update(is_primary=False)