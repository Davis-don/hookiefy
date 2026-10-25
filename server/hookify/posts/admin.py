# posts/admin.py

from django.contrib import admin
from .models import Posts


@admin.register(Posts)
class PostsAdmin(admin.ModelAdmin):

    list_display = (
        "title",
        "business",
        "has_image",
        "is_youpata_managed",
        "likes_count",
        "follows_count",
        "created_at",
    )

    list_display_links = ("title",)

    list_filter = (
        "is_youpata_managed",
        "created_at",
    )

    search_fields = (
        "title",
        "body",
        "business__business_name",
    )

    ordering = ("-created_at",)
    list_select_related = ("business",)
    raw_id_fields = ("business",)
    readonly_fields = (
        "created_at",
        "updated_at",
        "likes_count",
        "follows_count",
    )
    list_per_page = 25

    fieldsets = (
        ("Business", {
            "fields": ("business",),
        }),
        ("Content", {
            "fields": (
                "title",
                "body",
            ),
        }),
        ("Image", {
            "fields": (
                "image_url",
                "image_public_id",
            ),
        }),
        ("Youpata management", {
            "fields": ("is_youpata_managed",),
            "description": (
                "Mark this post as managed directly by Youpata. "
                "Posts created by superadmins or Youpata-managed "
                "accounts are flagged automatically at creation."
            ),
        }),
        ("Engagement", {
            "fields": ("likes_count", "follows_count"),
            "classes": ("collapse",),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    actions = ("mark_youpata_managed", "unmark_youpata_managed")

    # ── Computed columns ──────────────────────────────────

    @admin.display(boolean=True, description="Image")
    def has_image(self, obj):
        return bool(obj.image_url)

    # ── Bulk actions ──────────────────────────────────────

    @admin.action(description="Mark selected posts as Youpata-managed")
    def mark_youpata_managed(self, request, queryset):
        updated = queryset.update(is_youpata_managed=True)
        self.message_user(
            request,
            f"{updated} post(s) marked as Youpata-managed.",
        )

    @admin.action(description="Unmark selected posts as Youpata-managed")
    def unmark_youpata_managed(self, request, queryset):
        updated = queryset.update(is_youpata_managed=False)
        self.message_user(
            request,
            f"{updated} post(s) unmarked.",
        )