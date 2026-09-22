from django.db import models


class Plan(models.Model):
    # ============================================================
    # PLAN DETAILS
    # ============================================================

    name = models.CharField(
        max_length=50,
        unique=True
    )

    slug = models.SlugField(
        max_length=50,
        unique=True
    )

    description = models.TextField(
        blank=True
    )

    # Price in Kenya Shillings
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0
    )

    # ============================================================
    # USAGE LIMITS
    # NULL = UNLIMITED
    # ============================================================

    # Maximum number of services a user can create
    services_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of services. Leave blank for unlimited."
    )

    # Maximum number of images allowed for EACH service
    images_per_service = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum images per service. Leave blank for unlimited."
    )

    # Maximum number of normal posts
    posts_limit = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum number of posts. Leave blank for unlimited."
    )

    # Maximum stories allowed per month
    stories_per_month = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Maximum stories per month. Leave blank for unlimited."
    )

    # ============================================================
    # PROFILE / VISIBILITY FEATURES
    # ============================================================

    # Profile image is normally 1 for all plans
    profile_images_limit = models.PositiveIntegerField(
        default=1
    )

    featured_listing = models.BooleanField(
        default=False
    )

    verified_premium_badge = models.BooleanField(
        default=False
    )

    priority_visibility = models.BooleanField(
        default=False
    )

    # ============================================================
    # ANALYTICS
    # ============================================================

    ANALYTICS_BASIC = "basic"
    ANALYTICS_ADVANCED = "advanced"

    ANALYTICS_CHOICES = [
        (ANALYTICS_BASIC, "Basic"),
        (ANALYTICS_ADVANCED, "Advanced"),
    ]

    analytics_level = models.CharField(
        max_length=20,
        choices=ANALYTICS_CHOICES,
        default=ANALYTICS_BASIC
    )

    # ============================================================
    # CONNECTION FEE
    # ============================================================

    # For now all plans use the normal connection fee.
    # This gives you the option to change it per plan later.
    connection_fee_type = models.CharField(
        max_length=30,
        default="normal"
    )

    # ============================================================
    # STATUS / ORDERING
    # ============================================================

    is_active = models.BooleanField(
        default=True
    )

    # Controls the order in which plans appear
    display_order = models.PositiveIntegerField(
        default=0
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["display_order", "price"]

    def __str__(self):
        return f"{self.name} - KES {self.price}"