# stories/admin.py

from django.contrib import admin
from .models import Story


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):

    # ── List view ─────────────────────────────────────────
    list_display = (
        "title",
        "user",
        "category",
        "likes_count",
        "follows_count",
        "created_at",
        "updated_at",
    )

    list_display_links = ("title",)

    # ── Filters ───────────────────────────────────────────
    list_filter = (
        "category",
        "created_at",
    )

    # ── Search ────────────────────────────────────────────
    search_fields = (
        "title",
        "content",
        "user__email",
        "user__first_name",
        "user__last_name",
    )

    # ── Read-only ─────────────────────────────────────────
    readonly_fields = (
        "created_at",
        "updated_at",
        "likes_count",
        "follows_count",
    )

    # ── Ordering ──────────────────────────────────────────
    ordering = ("-created_at",)

    # ── Performance ───────────────────────────────────────
    list_select_related = ("user",)
    raw_id_fields = ("user",)
    list_per_page = 25

    # ── Detail page layout ────────────────────────────────
    fieldsets = (
        ("Author", {
            "fields": ("user",),
        }),
        ("Story", {
            "fields": (
                "title",
                "content",
                "category",
            ),
        }),
        ("Engagement", {
            "fields": ("likes_count", "follows_count"),
            "classes": ("collapse",),
        }),
        ("Timestamps", {
            "fields": (
                "created_at",
                "updated_at",
            ),
            "classes": ("collapse",),
        }),
    )