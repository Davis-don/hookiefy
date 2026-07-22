from django.contrib import admin
from .models import Commission


@admin.register(Commission)
class CommissionAdmin(admin.ModelAdmin):
    list_display = (
        "admin",
        "percentage",
        "display_platform_percentage",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "admin__role",
        "created_at",
    )

    search_fields = (
        "admin__first_name",
        "admin__last_name",
        "admin__email",
        "admin__phone_number",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "display_platform_percentage",
    )

    ordering = (
        "admin__first_name",
        "admin__last_name",
    )

    fieldsets = (
        (
            "Commission Information",
            {
                "fields": (
                    "admin",
                    "percentage",
                    "display_platform_percentage",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    @admin.display(description="Platform Percentage")
    def display_platform_percentage(self, obj):
        return f"{obj.platform_percentage}%"