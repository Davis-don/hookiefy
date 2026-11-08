# products/models.py

from django.contrib.postgres.indexes import GinIndex, OpClass
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models.functions import Upper


# ============================================================
# PRODUCTS MODEL
# ============================================================

class Products(models.Model):

    # --------------------------------------------------------
    # DELIVERY SCOPE
    # --------------------------------------------------------
    #
    # Every product records *how* it reaches the buyer. Three
    # mutually exclusive states:
    #
    #   everywhere → seller ships to any town the buyer types
    #   specific   → seller ships only to towns in delivery_towns
    #   none       → product cannot be delivered (pickup-only,
    #                digital, or temporarily out of service)
    #
    # `delivery_towns` is only meaningful when the scope is
    # `specific`. It's a JSON list of free-text town names.
    # Matching against the buyer's checkout town is
    # case-insensitive (see `can_deliver_to`).
    # --------------------------------------------------------

    DELIVERY_EVERYWHERE = "everywhere"
    DELIVERY_SPECIFIC   = "specific"
    DELIVERY_NONE       = "none"

    DELIVERY_CHOICES = (
        (DELIVERY_EVERYWHERE, "Everywhere"),
        (DELIVERY_SPECIFIC,   "Specific towns only"),
        (DELIVERY_NONE,       "No delivery"),
    )

    delivery_scope = models.CharField(
        max_length=20,
        choices=DELIVERY_CHOICES,
        default=DELIVERY_EVERYWHERE,
        db_index=True,
        help_text=(
            "How this product is delivered. "
            "'everywhere' = any town. "
            "'specific' = only the towns listed in delivery_towns. "
            "'none' = not deliverable."
        ),
    )

    delivery_towns = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Town names this product can be delivered to. "
            "Only used when delivery_scope = 'specific'. "
            "Case-insensitive matching — 'Nairobi', 'nairobi', "
            "and 'NAIROBI' are all treated as the same town."
        ),
    )

    business = models.ForeignKey(
        "businesses.Businesses",
        on_delete=models.CASCADE,
        related_name="products",
        help_text="The business this product belongs to.",
    )

    name = models.CharField(max_length=200)

    description = models.TextField(
        blank=False,
        help_text="Product description. Required.",
    )

    price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        blank=True,
        null=True,
        help_text="Price in KES. Optional.",
    )

    quantity = models.PositiveIntegerField(
        default=1,
        help_text=(
            "Number of units currently available for purchase. "
            "Defaults to 1 so existing products remain purchasable."
        ),
    )

    views = models.PositiveIntegerField(
        default=0,
        help_text="Total number of times this product was opened.",
    )

    likes_count = models.PositiveIntegerField(
        default=0,
        help_text="Cached total number of likes.",
    )

    follows_count = models.PositiveIntegerField(
        default=0,
        help_text="Cached total number of follows.",
    )

    is_youpata_managed = models.BooleanField(
        default=False,
        help_text="True if this product is managed by Youpata directly.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ("-created_at",)
        indexes = (
            models.Business_placeholder if False else models.Index(fields=("business",)),
            models.Index(fields=("created_at",)),
            models.Index(fields=("delivery_scope",)),

            # Partial index — only indexes rows where the flag is True.
            models.Index(
                fields=("is_youpata_managed",),
                condition=models.Q(is_youpata_managed=True),
                name="prod_youpata_managed_idx",
            ),

            # ── Trigram indexes for fast __icontains search ────
            GinIndex(
                OpClass(Upper("name"), name="gin_trgm_ops"),
                name="prod_name_trgm_idx",
            ),
            GinIndex(
                OpClass(Upper("description"), name="gin_trgm_ops"),
                name="prod_desc_trgm_idx",
            ),
        )

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    def clean(self):
        """
        Enforce that `delivery_towns` is:
          - a list of non-empty strings,
          - required (and non-empty) when scope = 'specific',
          - ignored (allowed to be empty) otherwise.
        """
        super().clean()

        # Normalise to a list of strings regardless of input.
        towns = self.delivery_towns

        if towns is None:
            towns = []

        if not isinstance(towns, list):
            raise ValidationError({
                "delivery_towns": (
                    "Must be a list of town names."
                )
            })

        clean_towns = []
        for t in towns:
            if not isinstance(t, str):
                raise ValidationError({
                    "delivery_towns": (
                        "Every town must be a string."
                    )
                })
            t = t.strip()
            if not t:
                continue
            if len(t) > 200:
                raise ValidationError({
                    "delivery_towns": (
                        "Town names cannot exceed 200 characters."
                    )
                })
            clean_towns.append(t)

        # Deduplicate case-insensitively while preserving order.
        seen = set()
        deduped = []
        for t in clean_towns:
            key = t.lower()
            if key in seen:
                continue
            seen.add(key)
            deduped.append(t)

        self.delivery_towns = deduped

        if (
            self.delivery_scope == self.DELIVERY_SPECIFIC
            and not self.delivery_towns
        ):
            raise ValidationError({
                "delivery_towns": (
                    "At least one town is required when the "
                    "delivery scope is 'Specific towns only'."
                )
            })

    # --------------------------------------------------------
    # HELPERS
    # --------------------------------------------------------

    @property
    def can_be_delivered(self):
        """True when the product ships *anywhere*."""
        return self.delivery_scope in (
            self.DELIVERY_EVERYWHERE,
            self.DELIVERY_SPECIFIC,
        )

    def can_deliver_to(self, town: str) -> bool:
        """
        Whether this product can be delivered to `town`.

        - 'everywhere' → always True (any non-empty town)
        - 'specific'   → True only if `town` (case-insensitive)
                         is in delivery_towns
        - 'none'       → always False
        """
        if not town or not town.strip():
            return False

        if self.delivery_scope == self.DELIVERY_EVERYWHERE:
            return True

        if self.delivery_scope == self.DELIVERY_NONE:
            return False

        wanted = town.strip().lower()
        return any(
            isinstance(t, str) and t.strip().lower() == wanted
            for t in (self.delivery_towns or [])
        )

    def __str__(self):
        name = self.business.business_name if self.business_id else "—"
        return f"{self.name} · {name}"

    @property
    def has_price(self):
        return self.price is not None

    @property
    def in_stock(self):
        """True when at least one unit is available."""
        return self.quantity > 0

    @property
    def properties(self):
        return [
            {"name": p.name, "value": p.value}
            for p in self.property_items.all()
            if p.name and p.value
        ]

    @property
    def has_properties(self):
        return self.property_items.exists()

    @property
    def primary_image(self):
        return self.images.filter(is_primary=True).first() or self.images.first()

    @property
    def has_images(self):
        return self.images.exists()

    @property
    def image_urls(self):
        return list(self.images.values_list("image_url", flat=True))


# ============================================================
# PRODUCT IMAGE MODEL
# ============================================================

class ProductImage(models.Model):

    product = models.ForeignKey(
        Products,
        on_delete=models.CASCADE,
        related_name="images",
        help_text="The product this image belongs to.",
    )

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

    is_primary = models.BooleanField(
        default=False,
        help_text="Mark this image as the primary/cover image for the product.",
    )

    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which the image appears in the gallery.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

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

    def __str__(self):
        label = "primary" if self.is_primary else "secondary"
        return f"Image for {self.product.name} ({label})"

    def save(self, *args, **kwargs):
        if self.is_primary:
            ProductImage.objects.filter(
                product=self.product, is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


# ============================================================
# PRODUCT PROPERTY MODEL
# ============================================================

class ProductProperty(models.Model):

    product = models.ForeignKey(
        Products,
        on_delete=models.CASCADE,
        related_name="property_items",
        help_text="The product this property belongs to.",
    )

    name = models.CharField(
        max_length=200,
        help_text="Property name, e.g. 'Size', 'Colour', 'Material'.",
    )

    value = models.CharField(
        max_length=500,
        help_text="Property value, e.g. 'XL', 'Blue', 'Cotton'.",
    )

    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which the property appears.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Product Property"
        verbose_name_plural = "Product Properties"
        ordering = ("sort_order", "created_at")
        indexes = (
            models.Index(fields=("product",)),
        )

    def __str__(self):
        return f"{self.name}: {self.value}"