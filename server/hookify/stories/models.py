from django.db import models

from account.models import Accounts


class Story(models.Model):

    # ============================================================
    # STORY CATEGORIES
    # ============================================================

    CATEGORY_CHOICES = (
        ("ideas", "Ideas & Tips"),
        ("success", "Success Stories"),
        ("fun", "Fun"),
    )

    # ============================================================
    # AUTHOR
    # ============================================================
    #
    # One user can create many stories.
    # If a user is deleted, their stories are also deleted.
    # ============================================================

    user = models.ForeignKey(
        Accounts,
        on_delete=models.CASCADE,
        related_name="stories",
    )

    # ============================================================
    # TITLE
    # ============================================================

    title = models.CharField(
        max_length=200,
    )

    # ============================================================
    # STORY CONTENT
    # ============================================================

    content = models.TextField()

    # ============================================================
    # CATEGORY
    # ============================================================

    category = models.CharField(
        max_length=20,
        choices=CATEGORY_CHOICES,
    )

    # ============================================================
    # CLOUDINARY IMAGE URL
    # ============================================================

    image_url = models.URLField(
        max_length=1000,
        blank=True,
        null=True,
        help_text="Cloudinary URL for the story image.",
    )

    # ============================================================
    # CLOUDINARY PUBLIC ID
    # ============================================================

    image_public_id = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Cloudinary public ID for the story image.",
    )

    # ============================================================
    # TIMESTAMPS
    # ============================================================

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    # ============================================================
    # META
    # ============================================================

    class Meta:
        ordering = ["-created_at"]

    # ============================================================
    # STRING REPRESENTATION
    # ============================================================

    def __str__(self):
        return self.title