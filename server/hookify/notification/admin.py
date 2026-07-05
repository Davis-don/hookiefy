from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "notification_id",
        "user",
        "connection",
        "notification_type",
        "title",
        "is_read",
        "created_at",
        "read_at",
    )

    list_filter = (
        "notification_type",
        "is_read",
        "created_at",
        "read_at",
    )

    search_fields = (
        "notification_id",
        "user__username",
        "user__email",
        "title",
        "message",
        "connection__connection_id",
    )

    readonly_fields = (
        "notification_id",
        "created_at",
        "read_at",
    )

    ordering = ("-created_at",)

    fieldsets = (
        ("Notification Information", {
            "fields": (
                "notification_id",
                "notification_type",
                "user",
                "connection",
            )
        }),
        ("Content", {
            "fields": (
                "title",
                "message",
            )
        }),
        ("Status", {
            "fields": (
                "is_read",
                "read_at",
            )
        }),
        ("Dates", {
            "fields": (
                "created_at",
            )
        }),
    )