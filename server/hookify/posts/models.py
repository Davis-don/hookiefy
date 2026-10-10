# posts/models.py

from django.db import models


# ============================================================
# POSTS MODEL
# ============================================================

class Posts(models.Model):

    # --------------------------------------------------------
    # BUSINESS (many-to-one)
    # --------------------------------------------------------

    business = models.ForeignKey(
        "businesses.Businesses",
        on_delete=models.CASCADE,
        related_name="posts",
        help_text="The business this post belongs to.",
    )

    # --------------------------------------------------------
    # TITLE
    # --------------------------------------------------------

    title = models.CharField(max_length=200)

    # --------------------------------------------------------
    # BODY
    # --------------------------------------------------------

    body = models.TextField(default="", blank=True)

    # --------------------------------------------------------
    # IMAGE — Cloudinary URL + public ID (required)
    # --------------------------------------------------------

    image_url = models.URLField(
        max_length=1000,
        blank=False,
        null=False,
        help_text="Cloudinary image URL for this post.",
    )

    image_public_id = models.CharField(
        max_length=500,
        blank=False,
        null=False,
        help_text="Cloudinary public ID — used for deletion / updates.",
    )

    # --------------------------------------------------------
    # VIEWS
    # --------------------------------------------------------

    views = models.PositiveIntegerField(
        default=0,
        help_text="Total number of times this post was opened.",
    )

    # --------------------------------------------------------
    # ENGAGEMENT COUNTERS (denormalised for fast reads)
    # --------------------------------------------------------

    likes_count = models.PositiveIntegerField(
        default=0,
        help_text="Cached total number of likes.",
    )

    follows_count = models.PositiveIntegerField(
        default=0,
        help_text="Cached total number of follows.",
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
        verbose_name = "Post"
        verbose_name_plural = "Posts"
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
        return f"{self.title} · {name}"

    # --------------------------------------------------------
    # HELPERS
    # --------------------------------------------------------

    @property
    def has_image(self):
        return bool(self.image_url)