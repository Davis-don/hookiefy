from django.contrib import admin

from .models import Story


@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):

    list_display = (
        "title",
        "user",
        "category",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "category",
        "created_at",
    )

    search_fields = (
        "title",
        "content",
        "user__email",
        "user__first_name",
        "user__last_name",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = (
        "-created_at",
    )