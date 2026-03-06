from django.contrib import admin
from .models import AdminConfig


@admin.register(AdminConfig)
class AdminConfigAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "admin",
        "commission_percentage",
        "created_at",
        "updated_at",
    )

    search_fields = (
        "admin__email",
        "admin__username",
    )

    list_filter = (
        "created_at",
    )

    ordering = ("-created_at",)