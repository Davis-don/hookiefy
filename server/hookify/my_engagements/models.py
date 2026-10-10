# my_engagements/models.py

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


# ============================================================
# LIKE  —  a User likes a Product / Post / Story
# ============================================================

class Like(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="likes",
    )

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="likes",
    )

    object_id = models.PositiveBigIntegerField(db_index=True)

    content_object = GenericForeignKey("content_type", "object_id")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Like"
        verbose_name_plural = "Likes"
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["user", "content_type", "object_id"],
                name="unique_user_content_like",
            ),
        ]

        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["user", "content_type"]),
        ]

    def __str__(self):
        return (
            f"{self.user} liked "
            f"{self.content_type.model} #{self.object_id}"
        )


# ============================================================
# FOLLOW  —  a User follows a Product / Post / Story
# ============================================================

class Follow(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="follows",
    )

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="follows",
    )

    object_id = models.PositiveBigIntegerField(db_index=True)

    content_object = GenericForeignKey("content_type", "object_id")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Follow"
        verbose_name_plural = "Follows"
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["user", "content_type", "object_id"],
                name="unique_user_content_follow",
            ),
        ]

        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["user", "content_type"]),
        ]

    def __str__(self):
        return (
            f"{self.user} follows "
            f"{self.content_type.model} #{self.object_id}"
        )