from django.db import models


# ============================================================
# PRODUCTS MODEL
# ============================================================

class Products(models.Model):

    # --------------------------------------------------------
    # BUSINESS (many-to-one)
    # A business can have many products;
    # a product belongs to exactly one business.
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
    # IMAGE — Cloudinary URL + public ID  (required)
    # --------------------------------------------------------

    image_url = models.URLField(
        max_length=1000,
        blank=False,
        null=False,
        help_text="Cloudinary image URL for this product.",
    )

    image_public_id = models.CharField(
        max_length=500,
        blank=False,
        null=False,
        help_text="Cloudinary public ID — used for deletion / updates.",
    )

    # --------------------------------------------------------
    # PRODUCT PROPERTIES — all optional
    # The owner can fill any subset of these, or none at all.
    # Examples: "Size: XL", "Colour: Blue", "Material: Cotton"
    # --------------------------------------------------------

    property1 = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Optional property, e.g. Size: XL",
    )

    property2 = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Optional property, e.g. Colour: Blue",
    )

    property3 = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Optional property, e.g. Material: Cotton",
    )

    property4 = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Optional property, e.g. Weight: 1.2kg",
    )

    property5 = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        help_text="Optional property, e.g. Warranty: 6 months",
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
    def has_image(self):
        return bool(self.image_url)

    @property
    def has_price(self):
        return self.price is not None

    @property
    def properties(self):
        """
        Return the filled-in properties as a list of strings,
        skipping any that are blank or None.
        """
        return [
            p for p in (
                self.property1,
                self.property2,
                self.property3,
                self.property4,
                self.property5,
            )
            if p and p.strip()
        ]

    @property
    def has_properties(self):
        return bool(self.properties)