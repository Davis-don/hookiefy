from django.contrib import admin
from .models import Hookup


@admin.register(Hookup)
class HookupAdmin(admin.ModelAdmin):

    # =========================
    # LIST DISPLAY (TABLE VIEW)
    # =========================
    list_display = (
        "id",
        "sender",
        "receiver",
        "approval_status",
        "payment_status",
        "is_read_by_sender",
        "is_read_by_receiver",
        "is_deleted_by_sender",
        "is_deleted_by_receiver",
        "created_at",
    )

    # =========================
    # FILTERS (RIGHT SIDEBAR)
    # =========================
    list_filter = (
        "approval_status",
        "payment_status",
        "is_read_by_sender",
        "is_read_by_receiver",
        "is_deleted_by_sender",
        "is_deleted_by_receiver",
        "created_at",
        "approved_at",
        "rejected_at",
        "paid_at",
    )

    # =========================
    # SEARCH
    # =========================
    search_fields = (
        "sender__user__email",
        "receiver__user__email",
        "message",
        "location",
    )

    # =========================
    # ORDERING
    # =========================
    ordering = ("-created_at",)

    # =========================
    # READ ONLY FIELDS
    # =========================
    readonly_fields = (
        "created_at",
        "updated_at",
        "approved_at",
        "rejected_at",
        "paid_at",
    )