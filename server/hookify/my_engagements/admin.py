# my_engagements/admin.py

from django.contrib import admin
from .models import Like, Follow


@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "content_type", "object_id", "created_at")
    list_display_links = ("id", "user")
    list_filter = ("content_type", "created_at")
    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "object_id",
    )
    ordering = ("-created_at",)
    list_select_related = ("user", "content_type")
    raw_id_fields = ("user",)
    readonly_fields = ("created_at",)
    list_per_page = 50


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "content_type", "object_id", "created_at")
    list_display_links = ("id", "user")
    list_filter = ("content_type", "created_at")
    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "object_id",
    )
    ordering = ("-created_at",)
    list_select_related = ("user", "content_type")
    raw_id_fields = ("user",)
    readonly_fields = ("created_at",)
    list_per_page = 50