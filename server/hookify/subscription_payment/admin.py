# subscription_payment/admin.py

from django.contrib import admin

from .models import SubscriptionPayment


# ============================================================
# SUBSCRIPTION PAYMENT ADMIN
# ============================================================

@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):

    # ── List view ─────────────────────────────────────────
    list_display = (
        "merchant_reference",
        "user",
        "plan",
        "amount_display_column",
        "gateway",
        "status",
        "created_at",
    )

    list_display_links = ("merchant_reference",)

    # ── Filters ───────────────────────────────────────────
    list_filter = (
        "status",
        "gateway",
        "currency",
        "created_at",
    )

    # ── Search ────────────────────────────────────────────
    search_fields = (
        "merchant_reference",
        "order_tracking_id",
        "user__email",
        "email",
        "phone_number",
        "confirmation_code",
    )

    # ── Ordering & performance ────────────────────────────
    ordering = ("-created_at",)
    list_select_related = ("user", "plan", "subscription")
    raw_id_fields = ("user", "plan", "subscription")
    list_per_page = 50

    # ── Read-only ─────────────────────────────────────────
    readonly_fields = (
        "id",
        "merchant_reference",
        "order_tracking_id",
        "created_at",
        "updated_at",
        "paid_at",
        "submit_response",
        "status_response",
        "amount_display_readonly",
        "time_since_created_readonly",
        "is_terminal_readonly",
        "is_successful_readonly",
    )

    # ── Detail page layout ────────────────────────────────
    fieldsets = (
        ("Identity", {
            "fields": (
                "id",
                "merchant_reference",
                "order_tracking_id",
            ),
        }),
        ("Relationships", {
            "fields": (
                "user",
                "subscription",
                "plan",
            ),
        }),
        ("Payment", {
            "fields": (
                "gateway",
                "status",
                "amount",
                "currency",
                "amount_display_readonly",
            ),
        }),
        ("Contact", {
            "fields": (
                "email",
                "phone_number",
            ),
        }),
        ("Confirmation", {
            "fields": (
                "confirmation_code",
                "payment_method",
                "payment_account",
                "paid_at",
            ),
        }),
        ("Error", {
            "fields": ("error_message",),
            "classes": ("collapse",),
        }),
        ("Raw payloads", {
            "fields": (
                "submit_response",
                "status_response",
            ),
            "classes": ("collapse",),
            "description": (
                "Full JSON responses from the gateway. "
                "Useful for reconciliation and debugging."
            ),
        }),
        ("Derived", {
            "fields": (
                "is_terminal_readonly",
                "is_successful_readonly",
                "time_since_created_readonly",
            ),
            "classes": ("collapse",),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    # ── Bulk actions ──────────────────────────────────────
    actions = (
        "mark_completed",
        "mark_cancelled",
    )

    # ========================================================
    # COMPUTED COLUMNS / FIELDS
    # ========================================================

    @admin.display(description="Amount", ordering="amount")
    def amount_display_column(self, obj):
        """Changelist column: 'KES 1,500.00'."""
        return obj.amount_display

    @admin.display(description="Amount")
    def amount_display_readonly(self, obj):
        return obj.amount_display

    @admin.display(description="Time since")
    def time_since_created_readonly(self, obj):
        return obj.time_since_created

    @admin.display(description="Is terminal", boolean=True)
    def is_terminal_readonly(self, obj):
        return obj.is_terminal

    @admin.display(description="Is successful", boolean=True)
    def is_successful_readonly(self, obj):
        return obj.is_successful

    # ========================================================
    # BULK ACTIONS
    # ========================================================

    @admin.action(description="Mark selected payments as COMPLETED")
    def mark_completed(self, request, queryset):
        from django.utils import timezone

        updated = queryset.update(
            status=SubscriptionPayment.STATUS_COMPLETED,
            paid_at=timezone.now(),
        )
        self.message_user(
            request,
            f"{updated} payment(s) marked as completed.",
        )

    @admin.action(description="Mark selected payments as CANCELLED")
    def mark_cancelled(self, request, queryset):
        updated = queryset.update(
            status=SubscriptionPayment.STATUS_CANCELLED,
        )
        self.message_user(
            request,
            f"{updated} payment(s) marked as cancelled.",
        )