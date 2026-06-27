from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "country",
        "county",
        "city",
        "date_of_birth",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "country",
        "county",
        "city",
        "created_at",
    )

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "country",
        "county",
        "city",
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
            "Profile Information",
            {
                "fields": (
                    "bio",
                    "date_of_birth",
                    "country",
                    "county",
                    "city",
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