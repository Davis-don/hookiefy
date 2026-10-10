from django.db import models
from account.models import Accounts


class Story(models.Model):

    CATEGORY_CHOICES = (
        ("journey",     "Journeys"),
        ("motivation",  "Motivation"),
        ("success",     "Success Stories"),
        ("experience",  "Experiences"),
        ("lessons",     "Lessons"),
        ("inspiration", "Inspiration"),
    )

    user = models.ForeignKey(
        Accounts,
        on_delete=models.CASCADE,
        related_name="stories",
    )

    title = models.CharField(max_length=200)
    content = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)

    views = models.PositiveIntegerField(default=0)

    # ============================================================
    # ENGAGEMENT COUNTERS  (denormalised for fast reads)
    # ============================================================

    likes_count = models.PositiveIntegerField(
        default=0,
        help_text="Cached total number of likes.",
    )

    follows_count = models.PositiveIntegerField(
        default=0,
        help_text="Cached total number of follows.",
    )

    # ------------------------------------------------------------

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Story"
        verbose_name_plural = "Stories"
        indexes = (
            models.Index(fields=("user",)),
            models.Index(fields=("category",)),
            models.Index(fields=("created_at",)),
        )

    def __str__(self):
        return self.title

    @property
    def summary(self):
        text = self.content.strip().replace("\n", " ")
        if len(text) <= 140:
            return text
        cut = text[:140].rsplit(" ", 1)[0]
        return f"{cut}…"