# notifications/admin.py
from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):

    list_display = (
        "notification_id",
        "category",
        "sender",
        "receiver",
        "connection",
        "title",
        "is_read",
        "created_at",
        "read_at",
    )

    list_filter = (
        "category",
        "is_read",
        "created_at",
        "read_at",
    )

    search_fields = (
        "notification_id",
        "sender__username",
        "sender__email",
        "receiver__username",
        "receiver__email",
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

    list_select_related = (
        "sender",
        "receiver",
        "connection",
    )

    fieldsets = (
        ("Notification Information", {
            "fields": (
                "notification_id",
                "category",
                "sender",
                "receiver",
                "connection",
            )
        }),
        ("Content", {
            "fields": (
                "title",
                "message",
            )
        }),
        ("Read State", {
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

    actions = ("mark_as_read", "mark_as_unread")

    # ========================================================
    # ADMIN ACTIONS
    # ========================================================

    @admin.action(description="Mark selected notifications as read")
    def mark_as_read(self, request, queryset):
        from django.utils import timezone
        updated = queryset.filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        self.message_user(request, f"{updated} notification(s) marked as read.")

    @admin.action(description="Mark selected notifications as unread")
    def mark_as_unread(self, request, queryset):
        updated = queryset.filter(is_read=True).update(
            is_read=False,
            read_at=None
        )
        self.message_user(request, f"{updated} notification(s) marked as unread.")