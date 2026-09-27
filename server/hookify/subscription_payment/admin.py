# subscription_payment/admin.py
from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import SubscriptionPayment


@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):

    # ========================================================
    # LIST VIEW
    # ========================================================

    list_display = (
        "short_reference",
        "user_link",
        "plan_link",
        "status_badge",
        "amount_display",
        "gateway",
        "paid_at",
        "created_at",
    )

    list_filter = (
        "status",
        "gateway",
        "plan",
        "created_at",
        "paid_at",
    )

    search_fields = (
        "merchant_reference",
        "order_tracking_id",
        "phone_number",
        "user__email",
        "user__first_name",
        "user__last_name",
        "plan__name",
        "plan__slug",
    )

    readonly_fields = (
        "subscription_payment_id",
        "merchant_reference",
        "order_tracking_id",
        "paid_at",
        "created_at",
        "updated_at",
        "is_completed_display",
        "is_pending_display",
        "is_failed_display",
        "is_cancelled_display",
        "is_terminal_display",
        "subscription_link_field",
        "plan_link_field",
        "user_link_field",
    )

    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("user", "plan", "subscription")
    list_per_page = 50

    # ========================================================
    # FORM LAYOUT
    # ========================================================

    fieldsets = (
        ("Payment", {
            "fields": (
                "subscription_payment_id",
                "merchant_reference",
                "order_tracking_id",
                "status",
                "gateway",
                "amount",
                "phone_number",
            )
        }),
        ("Relationships", {
            "fields": (
                "user_link_field",
                "plan_link_field",
                "subscription_link_field",
            )
        }),
        ("Derived", {
            "fields": (
                "is_completed_display",
                "is_pending_display",
                "is_failed_display",
                "is_cancelled_display",
                "is_terminal_display",
            ),
            "description": (
                "Derived from the payment's current status."
            ),
        }),
        ("Timestamps", {
            "fields": (
                "paid_at",
                "created_at",
                "updated_at",
            )
        }),
    )

    # ========================================================
    # QUERYSET OPTIMISATION
    # ========================================================

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("user", "plan", "subscription")
        )

    # ========================================================
    # LIST COLUMNS
    # ========================================================

    @admin.display(
        description="Ref",
        ordering="merchant_reference",
    )
    def short_reference(self, obj):
        ref = obj.merchant_reference or ""
        return format_html(
            "<code>{}</code>",
            ref if len(ref) <= 22 else ref[:20] + "…",
        )

    @admin.display(
        description="User",
        ordering="user__email",
    )
    def user_link(self, obj):
        if not obj.user:
            return "—"

        return format_html(
            '<a href="/admin/account/accounts/{}/change/">'
            '{} <span style="color:#94a3b8">({})</span>'
            "</a>",
            obj.user.id,
            obj.user.full_name or obj.user.email,
            obj.user.role,
        )

    @admin.display(
        description="Plan",
        ordering="plan__name",
    )
    def plan_link(self, obj):
        if not obj.plan:
            return "—"

        return format_html(
            '<a href="/admin/plans/plan/{}/change/">'
            '{} <span style="color:#94a3b8">(KES {})</span>'
            "</a>",
            obj.plan.id,
            obj.plan.name,
            obj.plan.price,
        )

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        colors = {
            "pending": ("#b45309", "rgba(245,158,11,0.14)"),
            "completed": ("#047857", "rgba(16,185,129,0.14)"),
            "failed": ("#b91c1c", "rgba(239,68,68,0.14)"),
            "cancelled": ("#64748b", "#f1f5f9"),
        }
        color, bg = colors.get(
            obj.status, ("#334155", "#f1f5f9")
        )
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;'
            "border-radius:999px;font-size:11px;font-weight:700;"
            'color:{};background:{};">{}</span>',
            color,
            bg,
            obj.get_status_display(),
        )

    @admin.display(description="Amount", ordering="amount")
    def amount_display(self, obj):
        return format_html("<strong>KES {}</strong>", obj.amount)

    # ========================================================
    # READ-ONLY RELATION LINKS
    # ========================================================

    @admin.display(description="User")
    def user_link_field(self, obj):
        if not obj.user:
            return "—"

        return format_html(
            '<a href="/admin/account/accounts/{}/change/">'
            "View user →"
            "</a>",
            obj.user.id,
        )

    @admin.display(description="Plan")
    def plan_link_field(self, obj):
        if not obj.plan:
            return "—"

        return format_html(
            '<a href="/admin/plans/plan/{}/change/">'
            "View plan →"
            "</a>",
            obj.plan.id,
        )

    @admin.display(description="Subscription")
    def subscription_link_field(self, obj):
        if not obj.subscription:
            return "—"

        return format_html(
            '<a href="/admin/subscription/subscription/{}/change/">'
            "View subscription →"
            "</a>",
            obj.subscription.id,
        )

    # ========================================================
    # READ-ONLY DERIVED FIELDS
    # ========================================================

    @admin.display(description="Is completed?")
    def is_completed_display(self, obj):
        return obj.is_completed

    @admin.display(description="Is pending?")
    def is_pending_display(self, obj):
        return obj.is_pending

    @admin.display(description="Is failed?")
    def is_failed_display(self, obj):
        return obj.is_failed

    @admin.display(description="Is cancelled?")
    def is_cancelled_display(self, obj):
        return obj.is_cancelled

    @admin.display(description="Is terminal?")
    def is_terminal_display(self, obj):
        return obj.is_terminal

    # ========================================================
    # BULK ACTIONS
    # ========================================================

    actions = (
        "mark_completed",
        "mark_failed",
        "mark_cancelled",
        "mark_pending",
    )

    @admin.action(description="Mark selected as completed")
    def mark_completed(self, request, queryset):
        updated = queryset.update(
            status="completed",
            paid_at=timezone.now(),
        )
        self.message_user(
            request,
            f"{updated} payment(s) marked completed.",
        )

    @admin.action(description="Mark selected as failed")
    def mark_failed(self, request, queryset):
        updated = queryset.update(status="failed")
        self.message_user(
            request,
            f"{updated} payment(s) marked failed.",
        )

    @admin.action(description="Mark selected as cancelled")
    def mark_cancelled(self, request, queryset):
        updated = queryset.update(status="cancelled")
        self.message_user(
            request,
            f"{updated} payment(s) marked cancelled.",
        )

    @admin.action(description="Mark selected as pending")
    def mark_pending(self, request, queryset):
        updated = queryset.update(
            status="pending",
            paid_at=None,
        )
        self.message_user(
            request,
            f"{updated} payment(s) marked pending.",
        )

    # ========================================================
    # PREVENT MANUAL CREATION
    # ========================================================

    def has_add_permission(self, request):
        # SubscriptionPayments are created by the payment flow,
        # not by hand in the admin.
        return False