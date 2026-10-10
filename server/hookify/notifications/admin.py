# notifications/admin.py

from django.contrib import admin
from django.utils import timezone

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):

    # ── List view ─────────────────────────────────────────
    list_display = (
        "title",
        "recipient",
        "category",
        "severity",
        "is_read_column",
        "created_at",
    )

    list_display_links = ("title",)

    # ── Filters ───────────────────────────────────────────
    list_filter = (
        "category",
        "severity",
        "read_at",
        "created_at",
    )

    # ── Search ────────────────────────────────────────────
    search_fields = (
        "title",
        "body",
        "recipient__email",
        "actor__email",
    )

    # ── Ordering & performance ────────────────────────────
    ordering = ("-created_at",)
    list_select_related = ("recipient", "actor")
    raw_id_fields = ("recipient", "actor")
    list_per_page = 50

    # ── Read-only ─────────────────────────────────────────
    readonly_fields = (
        "id",
        "created_at",
        "updated_at",
        "read_at",
    )

    # ── Detail page layout ────────────────────────────────
    fieldsets = (
        ("Routing", {
            "fields": (
                "id",
                "recipient",
                "actor",
            ),
        }),
        ("Content", {
            "fields": (
                "category",
                "severity",
                "title",
                "body",
            ),
        }),
        ("Action", {
            "fields": (
                "action_label",
                "action_url",
            ),
            "classes": ("collapse",),
        }),
        ("Metadata", {
            "fields": ("metadata",),
            "classes": ("collapse",),
        }),
        ("State", {
            "fields": (
                "read_at",
                "expires_at",
            ),
        }),
        ("Timestamps", {
            "fields": (
                "created_at",
                "updated_at",
            ),
            "classes": ("collapse",),
        }),
    )

    # ── Bulk actions ──────────────────────────────────────
    actions = (
        "mark_selected_read",
        "mark_selected_unread",
        "delete_expired",
    )

    # ── Computed columns ──────────────────────────────────

    @admin.display(boolean=True, description="Read")
    def is_read_column(self, obj):
        return obj.is_read

    # ── Actions ───────────────────────────────────────────

    @admin.action(description="Mark selected as read")
    def mark_selected_read(self, request, queryset):
        updated = queryset.filter(read_at__isnull=True).update(
            read_at=timezone.now()
        )
        self.message_user(
            request,
            f"{updated} notification(s) marked as read.",
        )

    @admin.action(description="Mark selected as unread")
    def mark_selected_unread(self, request, queryset):
        updated = queryset.filter(read_at__isnull=False).update(
            read_at=None
        )
        self.message_user(
            request,
            f"{updated} notification(s) marked as unread.",
        )

    @admin.action(description="Delete expired notifications")
    def delete_expired(self, request, queryset):
        deleted, _ = queryset.filter(
            expires_at__lte=timezone.now()
        ).delete()
        self.message_user(
            request,
            f"{deleted} expired notification(s) deleted.",
        )