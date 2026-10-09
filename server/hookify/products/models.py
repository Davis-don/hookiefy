# ============================================================
# models.py
# ============================================================

from django.db import models


# ============================================================
# PRODUCTS MODEL
# ============================================================

class Products(models.Model):

    # --------------------------------------------------------
    # BUSINESS (many-to-one)
    # --------------------------------------------------------

    business = models.ForeignKey(
        "businesses.Businesses",
        on_delete=models.CASCADE,
        related_name="products",
        help_text="The business this product belongs to.",
    )

    # --------------------------------------------------------
    # NAME
    # --------------------------------------------------------

    name = models.CharField(
        max_length=200,
    )

    # --------------------------------------------------------
    # DESCRIPTION
    # --------------------------------------------------------

    description = models.TextField(
        default="",
        blank=True,
    )

    # --------------------------------------------------------
    # PRICE (optional)
    # --------------------------------------------------------

    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Price in KES. Optional.",
    )

    # --------------------------------------------------------
    # VIEWS
    # --------------------------------------------------------

    views = models.PositiveIntegerField(
        default=0,
        help_text="Total number of times this product was opened.",
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
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ("-created_at",)
        indexes = (
            models.Index(fields=("business",)),
            models.Index(fields=("created_at",)),
        )

    # --------------------------------------------------------
    # STRING REPRESENTATION
    # --------------------------------------------------------

    def __str__(self):
        name = self.business.business_name if self.business_id else "—"
        return f"{self.name} · {name}"

    # --------------------------------------------------------
    # HELPERS
    # --------------------------------------------------------

    @property
    def has_price(self):
        return self.price is not None

    @property
    def properties(self):
        """
        Return the filled-in properties as a list of dicts
        (name + value), skipping any that are blank.
        """
        return [
            {"name": p.name, "value": p.value}
            for p in self.property_items.all()
            if p.name and p.value
        ]

    @property
    def has_properties(self):
        return self.property_items.exists()

    # --------------------------------------------------------
    # IMAGE HELPERS
    # --------------------------------------------------------

    @property
    def primary_image(self):
        """Return the primary image (or the first image if none is primary)."""
        return self.images.filter(is_primary=True).first() or self.images.first()

    @property
    def has_images(self):
        return self.images.exists()

    @property
    def image_urls(self):
        """Return a list of all image URLs for this product."""
        return list(self.images.values_list("image_url", flat=True))


# ============================================================
# PRODUCT IMAGE MODEL
# ============================================================

class ProductImage(models.Model):

    # --------------------------------------------------------
    # PRODUCT (many-to-one)
    # --------------------------------------------------------

    product = models.ForeignKey(
        Products,
        on_delete=models.CASCADE,
        related_name="images",
        help_text="The product this image belongs to.",
    )

    # --------------------------------------------------------
    # IMAGE — Cloudinary URL + public ID
    # --------------------------------------------------------

    image_url = models.URLField(
        max_length=1000,
        blank=False,
        null=False,
        help_text="Cloudinary image URL for this product image.",
    )

    image_public_id = models.CharField(
        max_length=500,
        blank=False,
        null=False,
        help_text="Cloudinary public ID — used for deletion / updates.",
    )

    # --------------------------------------------------------
    # PRIMARY FLAG
    # --------------------------------------------------------

    is_primary = models.BooleanField(
        default=False,
        help_text="Mark this image as the primary/cover image for the product.",
    )

    # --------------------------------------------------------
    # ORDERING
    # --------------------------------------------------------

    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which the image appears in the gallery.",
    )

    # --------------------------------------------------------
    # TIMESTAMPS
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    # --------------------------------------------------------
    # META
    # --------------------------------------------------------

    class Meta:
        verbose_name = "Product Image"
        verbose_name_plural = "Product Images"
        ordering = ("sort_order", "created_at")
        indexes = (
            models.Index(fields=("product",)),
        )
        constraints = (
            models.UniqueConstraint(
                fields=("product",),
                condition=models.Q(is_primary=True),
                name="unique_primary_image_per_product",
            ),
        )

    # --------------------------------------------------------
    # STRING REPRESENTATION
    # --------------------------------------------------------

    def __str__(self):
        return f"Image for {self.product.name} ({'primary' if self.is_primary else 'secondary'})"

    # --------------------------------------------------------
    # SAVE — ensure only one primary image per product
    # --------------------------------------------------------

    def save(self, *args, **kwargs):
        if self.is_primary:
            # Unset any other primary image for this product
            ProductImage.objects.filter(
                product=self.product, is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


# ============================================================
# PRODUCT PROPERTY MODEL (unlimited properties)
# ============================================================

class ProductProperty(models.Model):

    # --------------------------------------------------------
    # PRODUCT (many-to-one)
    # --------------------------------------------------------

    product = models.ForeignKey(
        Products,
        on_delete=models.CASCADE,
        related_name="property_items",
        help_text="The product this property belongs to.",
    )

    # --------------------------------------------------------
    # NAME & VALUE
    # --------------------------------------------------------

    name = models.CharField(
        max_length=200,
        help_text="Property name, e.g. 'Size', 'Colour', 'Material'.",
    )

    value = models.CharField(
        max_length=500,
        help_text="Property value, e.g. 'XL', 'Blue', 'Cotton'.",
    )

    # --------------------------------------------------------
    # ORDERING
    # --------------------------------------------------------

    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which the property appears.",
    )

    # --------------------------------------------------------
    # TIMESTAMPS
    # --------------------------------------------------------

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    # --------------------------------------------------------
    # META
    # --------------------------------------------------------

    class Meta:
        verbose_name = "Product Property"
        verbose_name_plural = "Product Properties"
        ordering = ("sort_order", "created_at")
        indexes = (
            models.Index(fields=("product",)),
        )

    # --------------------------------------------------------
    # STRING REPRESENTATION
    # --------------------------------------------------------

    def __str__(self):
        return f"{self.name}: {self.value}"