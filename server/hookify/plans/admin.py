# plans/admin.py

from django.contrib import admin
from .models import Plan


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "price",
        "services_limit",
        "images_per_service",
        "posts_limit",
        "stories_per_month",
        "featured_listing",
        "verified_premium_badge",
        "priority_visibility",
        "analytics_level",
        "is_active",
        "display_order",
    )

    list_filter = (
        "is_active",
        "featured_listing",
        "verified_premium_badge",
        "priority_visibility",
        "analytics_level",
    )

    search_fields = (
        "name",
        "slug",
        "description",
    )

    prepopulated_fields = {
        "slug": ("name",)
    }

    list_editable = (
        "price",
        "is_active",
        "display_order",
    )

    ordering = (
        "display_order",
        "price",
    )

    fieldsets = (
        (
            "Plan Information",
            {
                "fields": (
                    "name",
                    "slug",
                    "description",
                    "price",
                    "is_active",
                    "display_order",
                )
            },
        ),
        (
            "Usage Limits",
            {
                "fields": (
                    "services_limit",
                    "images_per_service",
                    "posts_limit",
                    "stories_per_month",
                    "profile_images_limit",
                ),
                "description": (
                    "Leave a limit blank to make it unlimited."
                ),
            },
        ),
        (
            "Visibility & Features",
            {
                "fields": (
                    "featured_listing",
                    "verified_premium_badge",
                    "priority_visibility",
                )
            },
        ),
        (
            "Analytics",
            {
                "fields": (
                    "analytics_level",
                )
            },
        ),
        (
            "Connection Fee",
            {
                "fields": (
                    "connection_fee_type",
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

    readonly_fields = (
        "created_at",
        "updated_at",
    )