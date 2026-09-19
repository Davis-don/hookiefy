# engagement/models.py

from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


# ============================================================
# LIKE
# ============================================================

class Like(models.Model):
    """
    A reusable Like model.

    A user can like:
        - a Story
        - a ClientService

    The actual liked object is identified by:
        content_type
        object_id

    Example:

        User Davis likes Story #10

        content_type = Story
        object_id = 10

    OR:

        User Davis likes ClientService #25

        content_type = ClientService
        object_id = 25
    """

    # ========================================================
    # PERSON WHO LIKED
    # ========================================================

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="likes",
    )

    # ========================================================
    # TYPE OF CONTENT LIKED
    # ========================================================
    #
    # This tells us whether object_id belongs to:
    #     Story
    #     ClientService
    # ========================================================

    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        related_name="likes",
    )

    # ========================================================
    # ID OF THE CONTENT LIKED
    # ========================================================
    #
    # This stores the actual ID.
    #
    # Example:
    #     Story ID = 15
    #     object_id = 15
    #
    #     Service ID = 32
    #     object_id = 32
    # ========================================================

    object_id = models.PositiveBigIntegerField(
        db_index=True,
    )

    # ========================================================
    # ACTUAL OBJECT
    # ========================================================
    #
    # Django automatically uses:
    #
    #     content_type + object_id
    #
    # to access the actual Story or ClientService.
    #
    # Example:
    #
    #     like.content_object
    #
    # returns the Story or ClientService.
    # ========================================================

    content_object = GenericForeignKey(
        "content_type",
        "object_id",
    )

    # ========================================================
    # TIMESTAMP
    # ========================================================

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    # ========================================================
    # META
    # ========================================================

    class Meta:

        verbose_name = "Like"
        verbose_name_plural = "Likes"

        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "user",
                    "content_type",
                    "object_id",
                ],
                name="unique_user_content_like",
            ),
        ]

        indexes = [
            models.Index(
                fields=[
                    "content_type",
                    "object_id",
                ]
            ),

            models.Index(
                fields=[
                    "user",
                    "content_type",
                ]
            ),
        ]

    # ========================================================
    # STRING
    # ========================================================

    def __str__(self):

        return (
            f"{self.user} liked "
            f"{self.content_type.model} #{self.object_id}"
        )