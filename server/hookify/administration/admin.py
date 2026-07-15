from django.contrib import admin
from .models import PlatformConfig


@admin.register(PlatformConfig)
class PlatformConfigAdmin(admin.ModelAdmin):
    list_display = (
        "owner",
        "hookup_fee",
        "created_at",
        "updated_at",
    )

    list_filter = ("owner__role",)

    search_fields = (
        "owner__email",
        "owner__first_name",
        "owner__last_name",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = ("owner__email",)