from django.contrib import admin
from .models import PlatformConfig


@admin.register(PlatformConfig)
class PlatformConfigAdmin(admin.ModelAdmin):

    list_display = (
        "connection_fee",
        "created_at",
        "updated_at",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = (
        "created_at",
    )