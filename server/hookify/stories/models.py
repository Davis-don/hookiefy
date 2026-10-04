from django.db import models

from account.models import Accounts


class Story(models.Model):

    # ============================================================
    # STORY CATEGORIES
    # ============================================================

    CATEGORY_CHOICES = (
        ("journey",     "Journeys"),
        ("motivation",  "Motivation"),
        ("success",     "Success Stories"),
        ("experience",  "Experiences"),
        ("lessons",     "Lessons"),
        ("inspiration", "Inspiration"),
    )

    # ============================================================
    # AUTHOR — one user, many stories
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
        verbose_name = "Story"
        verbose_name_plural = "Stories"
        indexes = (
            models.Index(fields=("user",)),
            models.Index(fields=("category",)),
            models.Index(fields=("created_at",)),
        )

    # ============================================================
    # STRING REPRESENTATION
    # ============================================================

    def __str__(self):
        return self.title

    # ============================================================
    # HELPERS
    # ============================================================

    @property
    def summary(self):
        """First 140 characters of the content, trimmed to a word boundary."""
        text = self.content.strip().replace("\n", " ")
        if len(text) <= 140:
            return text
        cut = text[:140].rsplit(" ", 1)[0]
        return f"{cut}…"