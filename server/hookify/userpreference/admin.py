from django.contrib import admin
from .models import Preference


@admin.register(Preference)
class PreferenceAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "interested_in_gender",
        "minimum_age",
        "maximum_age",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "interested_in_gender",
        "created_at",
    )

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
    )

    autocomplete_fields = (
        "user",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = (
        "-created_at",
    )

    fieldsets = (
        (
            "User",
            {
                "fields": (
                    "user",
                ),
            },
        ),
        (
            "Matching Preferences",
            {
                "fields": (
                    "interested_in_gender",
                    "minimum_age",
                    "maximum_age",
                ),
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
            },
        ),
    )