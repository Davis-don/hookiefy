from django.contrib import admin
from .models import Connection


@admin.register(Connection)
class ConnectionAdmin(admin.ModelAdmin):
    list_display = (
        "connection_id",
        "sender",
        "receiver",
        "status",
        "created_at",
    )

    list_filter = (
        "status",
        "created_at",
    )

    search_fields = (
        "sender__username",
        "receiver__username",
        "connection_id",
    )

    readonly_fields = (
        "connection_id",
        "created_at",
        "updated_at",
    )

    ordering = ("-created_at",)