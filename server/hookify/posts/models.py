# posts/models.py

from django.contrib.postgres.indexes import GinIndex, OpClass
from django.db import models
from django.db.models.functions import Upper


# ============================================================
# POSTS MODEL
# ============================================================

class Posts(models.Model):

    business = models.ForeignKey(
        "businesses.Businesses",
        on_delete=models.CASCADE,
        related_name="posts",
        help_text="The business this post belongs to.",
    )

    title = models.CharField(max_length=200)

    body = models.TextField(default="", blank=True)

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

    views = models.PositiveIntegerField(
        default=0,
        help_text="Total number of times this post was opened.",
    )

    likes_count = models.PositiveIntegerField(
        default=0,
        help_text="Cached total number of likes.",
    )

    follows_count = models.PositiveIntegerField(
        default=0,
        help_text="Cached total number of follows.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Post"
        verbose_name_plural = "Posts"
        ordering = ("-created_at",)
        indexes = (
            models.Index(fields=("business",)),
            models.Index(fields=("created_at",)),

            # ── Trigram indexes for fast __icontains search ────
            GinIndex(
                OpClass(Upper("title"), name="gin_trgm_ops"),
                name="post_title_trgm_idx",
            ),
            GinIndex(
                OpClass(Upper("body"), name="gin_trgm_ops"),
                name="post_body_trgm_idx",
            ),
        )

    def __str__(self):
        name = self.business.business_name if self.business_id else "—"
        return f"{self.title} · {name}"

    @property
    def has_image(self):
        return bool(self.image_url)