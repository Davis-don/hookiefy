# posts/admin.py

from django.contrib import admin
from .models import Posts


@admin.register(Posts)
class PostsAdmin(admin.ModelAdmin):

    list_display = (
        "title",
        "business",
        "has_image",
        "likes_count",
        "follows_count",
        "created_at",
    )

    list_display_links = ("title",)

    list_filter = (
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
        ("Engagement", {
            "fields": ("likes_count", "follows_count"),
            "classes": ("collapse",),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(boolean=True, description="Image")
    def has_image(self, obj):
        return bool(obj.image_url)