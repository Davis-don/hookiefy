# businesses/models.py

from django.conf import settings
from django.contrib.postgres.indexes import GinIndex, OpClass
from django.db import models
from django.db.models.functions import Upper


# ============================================================
# BUSINESSES MODEL
# ============================================================

class Businesses(models.Model):

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="businesses",
        help_text="The account that owns this business.",
    )

    business_name = models.CharField(max_length=200)

    CATEGORY_CHOICES = (
        ("goods",    "Goods"),
        ("services", "Services"),
    )

    business_category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
    )

    business_type = models.CharField(max_length=120)

    description = models.TextField(default="", blank=True)

    county = models.CharField(max_length=120)
    city_town = models.CharField(
        max_length=120,
        help_text="City or town where the business is located.",
    )
    region = models.CharField(
        max_length=120,
        help_text="Specific area or locality, e.g. Kasuku, Kawangware.",
    )

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

    likes_count = models.PositiveIntegerField(
        default=0,
        help_text=(
            "Cached number of likes across all of this business's content "
            "(products, posts, stories) plus likes on the business itself."
        ),
    )

    follows_count = models.PositiveIntegerField(
        default=0,
        help_text="Cached number of users following this business.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Business"
        verbose_name_plural = "Businesses"
        ordering = ("-created_at",)
        indexes = (
            models.Index(fields=("owner",)),
            models.Index(fields=("business_category",)),
            models.Index(fields=("county", "city_town")),
            models.Index(fields=("status",)),

            # ── Trigram indexes for fast __icontains search ────
            GinIndex(
                OpClass(Upper("business_name"), name="gin_trgm_ops"),
                name="biz_name_trgm_idx",
            ),
            GinIndex(
                OpClass(Upper("business_type"), name="gin_trgm_ops"),
                name="biz_type_trgm_idx",
            ),
            GinIndex(
                OpClass(Upper("description"), name="gin_trgm_ops"),
                name="biz_desc_trgm_idx",
            ),
            GinIndex(
                OpClass(Upper("county"), name="gin_trgm_ops"),
                name="biz_county_trgm_idx",
            ),
            GinIndex(
                OpClass(Upper("city_town"), name="gin_trgm_ops"),
                name="biz_city_trgm_idx",
            ),
            GinIndex(
                OpClass(Upper("region"), name="gin_trgm_ops"),
                name="biz_region_trgm_idx",
            ),
        )

    def __str__(self):
        return f"{self.business_name} ({self.get_business_category_display()})"

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