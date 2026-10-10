# plans/models.py

from django.db import models


# ============================================================
# PLAN
# ============================================================

class Plan(models.Model):
    """
    A subscription tier.

    - `price` may be 0 (free) or any KES amount.
    - Fixed numeric limits live in dedicated fields.
    - Any additional marketing / display features are stored
      as unlimited `PlanProperty` rows.
    - Exactly one Plan may have `is_default=True`. New users
      are automatically linked to that plan on signup.
    """

    # --------------------------------------------------------
    # IDENTITY
    # --------------------------------------------------------

    plan_name = models.CharField(
        max_length=80,
        unique=True,
        help_text="Display name, e.g. 'Starter', 'Pro', 'Business'.",
    )

    slug = models.SlugField(
        max_length=80,
        unique=True,
        help_text="URL-safe identifier, e.g. 'starter', 'pro'.",
    )

    description = models.TextField(
        default="",
        blank=True,
        help_text="Short marketing blurb shown under the plan name.",
    )

    # --------------------------------------------------------
    # PRICE
    # --------------------------------------------------------

    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text="Price in KES. Set to 0 for a free plan.",
    )

    # --------------------------------------------------------
    # BILLING CYCLE
    # --------------------------------------------------------

    BILLING_MONTHLY = "monthly"
    BILLING_YEARLY = "yearly"
    BILLING_LIFETIME = "lifetime"
    BILLING_FREE = "free"

    BILLING_CHOICES = (
        (BILLING_FREE, "Free"),
        (BILLING_MONTHLY, "Monthly"),
        (BILLING_YEARLY, "Yearly"),
        (BILLING_LIFETIME, "Lifetime"),
    )

    billing_cycle = models.CharField(
        max_length=20,
        choices=BILLING_CHOICES,
        default=BILLING_MONTHLY,
        help_text="How often the price is charged. 'free' overrides price.",
    )

    # --------------------------------------------------------
    # FIXED NUMERIC LIMITS
    # NULL = unlimited.
    # --------------------------------------------------------

    businesses_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of businesses. NULL = unlimited.",
    )

    posts_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum posts per business. NULL = unlimited.",
    )

    products_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum products per business. NULL = unlimited.",
    )

    images_per_product = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum images per product. NULL = unlimited.",
    )

    stories_per_month = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum stories per month. NULL = unlimited.",
    )

    profile_images_limit = models.PositiveIntegerField(
        default=1,
        help_text="How many profile images the user may upload.",
    )

    # --------------------------------------------------------
    # VISIBILITY FLAGS
    # --------------------------------------------------------

    featured_listing = models.BooleanField(
        default=False,
        help_text="Plan members appear in the featured section.",
    )

    verified_premium_badge = models.BooleanField(
        default=False,
        help_text="Plan members get the verified / premium badge.",
    )

    priority_visibility = models.BooleanField(
        default=False,
        help_text="Plan members rank higher in feeds and search.",
    )

    # --------------------------------------------------------
    # ANALYTICS
    # --------------------------------------------------------

    ANALYTICS_NONE = "none"
    ANALYTICS_BASIC = "basic"
    ANALYTICS_ADVANCED = "advanced"

    ANALYTICS_CHOICES = (
        (ANALYTICS_NONE, "None"),
        (ANALYTICS_BASIC, "Basic"),
        (ANALYTICS_ADVANCED, "Advanced"),
    )

    analytics_level = models.CharField(
        max_length=20,
        choices=ANALYTICS_CHOICES,
        default=ANALYTICS_BASIC,
    )

    # --------------------------------------------------------
    # CONNECTION FEE
    # --------------------------------------------------------

    CONNECTION_NORMAL = "normal"
    CONNECTION_REDUCED = "reduced"
    CONNECTION_WAIVED = "waived"

    CONNECTION_FEE_CHOICES = (
        (CONNECTION_NORMAL, "Normal"),
        (CONNECTION_REDUCED, "Reduced"),
        (CONNECTION_WAIVED, "Waived"),
    )

    connection_fee_type = models.CharField(
        max_length=20,
        choices=CONNECTION_FEE_CHOICES,
        default=CONNECTION_NORMAL,
        help_text="How the connection fee is charged for this plan.",
    )

    # --------------------------------------------------------
    # STATUS / ORDERING
    # --------------------------------------------------------

    is_active = models.BooleanField(
        default=True,
        help_text="Inactive plans don't appear anywhere.",
    )

    # ── THE DEFAULT FLAG ────────────────────────────────────
    # New users are linked to whichever plan has this set to
    # True. The unique constraint below guarantees at most one
    # plan can hold this flag at any moment.
    is_default = models.BooleanField(
        default=False,
        help_text=(
            "Mark this plan as the one assigned to new users. "
            "Only one plan may be the default at a time."
        ),
    )

    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Lower numbers appear first.",
    )

    # --------------------------------------------------------
    # TIMESTAMPS
    # --------------------------------------------------------

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # --------------------------------------------------------
    # META
    # --------------------------------------------------------

    class Meta:
        verbose_name = "Plan"
        verbose_name_plural = "Plans"
        ordering = ("display_order", "price", "plan_name")

        indexes = (
            models.Index(fields=("is_active",)),
            models.Index(fields=("is_default",)),
            models.Index(fields=("display_order",)),
        )

        # Only one row may have is_default=True.
        # Multiple rows may have is_default=False (no constraint on those).
        constraints = (
            models.UniqueConstraint(
                fields=("is_default",),
                condition=models.Q(is_default=True),
                name="only_one_default_plan",
            ),
        )

    # --------------------------------------------------------
    # STRING
    # --------------------------------------------------------

    def __str__(self):
        parts = [self.plan_name]
        if self.is_free:
            parts.append("(Free)")
        else:
            parts.append(f"· KES {self.price}")
        if self.is_default:
            parts.append("· DEFAULT")
        return " ".join(parts)

    # --------------------------------------------------------
    # HELPERS
    # --------------------------------------------------------

    @property
    def is_free(self):
        return (
            self.billing_cycle == self.BILLING_FREE
            or self.price == 0
        )

    @property
    def price_display(self):
        if self.is_free:
            return "Free"
        return f"KES {self.price:,.2f}"

    @property
    def has_unlimited_businesses(self):
        return self.businesses_limit is None

    @property
    def has_unlimited_posts(self):
        return self.posts_limit is None

    @property
    def has_unlimited_products(self):
        return self.products_limit is None

    @property
    def has_unlimited_images_per_product(self):
        return self.images_per_product is None

    @property
    def has_unlimited_stories(self):
        return self.stories_per_month is None

    # ---- safe save: automatically unpins any other default ----

    def save(self, *args, **kwargs):
        """
        When this plan is saved with is_default=True, atomically
        flip every other plan's is_default to False first. That
        prevents the UniqueConstraint from firing during normal
        admin use.
        """
        if self.is_default:
            Plan.objects.exclude(pk=self.pk).filter(
                is_default=True
            ).update(is_default=False)
        super().save(*args, **kwargs)

    # ---- classmethod: the current default plan ----

    @classmethod
    def get_default(cls):
        """
        Return the plan new users should be assigned to.

        Falls back to the cheapest active plan when no plan has
        `is_default=True`, so signup never breaks.
        """
        plan = cls.objects.filter(is_default=True).first()
        if plan:
            return plan
        return (
            cls.objects
            .filter(is_active=True)
            .order_by("price", "display_order")
            .first()
        )


# ============================================================
# PLAN PROPERTY  —  unlimited free-form display features
# ============================================================

class PlanProperty(models.Model):

    plan = models.ForeignKey(
        Plan,
        on_delete=models.CASCADE,
        related_name="properties",
        help_text="The plan this property belongs to.",
    )

    name = models.CharField(
        max_length=120,
        help_text="Property name, e.g. 'Support', 'Storage'.",
    )

    value = models.CharField(
        max_length=500,
        help_text="Property value, e.g. '24/7', '5 GB', 'Unlimited'.",
    )

    is_highlighted = models.BooleanField(
        default=False,
        help_text="Show this property with emphasis on the plan card.",
    )

    sort_order = models.PositiveIntegerField(
        default=0,
        help_text="Order in which the property appears.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Plan Property"
        verbose_name_plural = "Plan Properties"
        ordering = ("sort_order", "created_at")
        indexes = (
            models.Index(fields=("plan",)),
        )

    def __str__(self):
        return f"{self.name}: {self.value}"