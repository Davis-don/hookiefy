from django.contrib import admin
from .models import Advert


@admin.register(Advert)
class AdvertAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "type",
        "url",
        "public_id",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "type",
        "created_at",
        "updated_at",
    )

    search_fields = (
        "title",
        "description",
        "url",
        "public_id",
    )

    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
    )

    ordering = (
        "-created_at",
    )

    fieldsets = (
        (
            "Advert Information",
            {
                "fields": (
                    "id",
                    "title",
                    "description",
                )
            },
        ),
        (
            "Media",
            {
                "fields": (
                    "url",
                    "type",
                    "public_id",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )