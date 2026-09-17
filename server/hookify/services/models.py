# services/models.py
from django.db import models
from django.utils.text import slugify


class ServiceCategory(models.Model):
    """
    A top-level category that services can belong to.

    Examples:
        - Teaching
        - Car Hire
        - Plumbing
        - Electrical Work
        - Cleaning
        - Tutoring
        - Photography
        - Catering
        - Beauty & Wellness
        - IT & Tech Support

    Managed by superadmins and fetched by the frontend so
    that service providers can pick the right category when
    they register a new service.
    """

    # ── Core fields ───────────────────────────────────────

    name = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Human-readable category name, e.g. 'Teaching'.",
    )

    slug = models.SlugField(
        max_length=120,
        unique=True,
        db_index=True,
        blank=True,
        help_text="URL-safe identifier auto-generated from name.",
    )

    description = models.TextField(
        blank=True,
        default="",
        help_text="Short description shown to providers when picking a category.",
    )

    # ── Status ────────────────────────────────────────────

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Inactive categories are hidden from the public API.",
    )

    is_featured = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Featured categories can be pinned to the top of the UI.",
    )

    # ── Audit ─────────────────────────────────────────────

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ── Meta ──────────────────────────────────────────────

    class Meta:
        verbose_name = "Service Category"
        verbose_name_plural = "Service Categories"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active", "name"]),
            models.Index(fields=["is_featured", "name"]),
        ]

    # ── String ────────────────────────────────────────────

    def __str__(self):
        return self.name

    # ── Save hook: auto-generate slug ─────────────────────

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)