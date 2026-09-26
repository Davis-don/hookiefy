# payments/admin.py
from django.contrib import admin
from django.utils.html import format_html

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):

    # ========================================================
    # LIST VIEW
    # ========================================================

    list_display = (
        "short_reference",
        "user_link",
        "payment_type_badge",
        "status_badge",
        "amount_display",
        "gateway",
        "connection_link",
        "service_link",
        "paid_at",
        "created_at",
    )

    list_filter = (
        "payment_type",
        "status",
        "gateway",
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
        "connection__connection_id",
        "service__title",
    )

    readonly_fields = (
        "merchant_reference",
        "order_tracking_id",
        "created_at",
        "updated_at",
        "paid_at",
        "is_terminal_display",
        "is_completed_display",
    )

    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_select_related = ("user", "connection", "service")
    list_per_page = 50

    # ========================================================
    # FORM LAYOUT
    # ========================================================

    fieldsets = (
        ("Payment", {
            "fields": (
                "merchant_reference",
                "payment_type",
                "gateway",
                "status",
                "amount",
                "phone_number",
            )
        }),
        ("Payer", {
            "fields": (
                "user",
            )
        }),
        ("Targets", {
            "fields": (
                "connection",
                "service",
            ),
            "description": (
                "One of these is set, depending on the "
                "payment_type."
            ),
        }),
        ("Gateway", {
            "fields": (
                "order_tracking_id",
            ),
            "classes": ("collapse",),
        }),
        ("Derived", {
            "fields": (
                "is_terminal_display",
                "is_completed_display",
            ),
        }),
        ("Timestamps", {
            "fields": (
                "created_at",
                "updated_at",
                "paid_at",
            )
        }),
    )

    # ========================================================
    # COLUMNS
    # ========================================================

    @admin.display(description="Ref", ordering="merchant_reference")
    def short_reference(self, obj):
        ref = obj.merchant_reference or ""
        return format_html(
            "<code>{}</code>",
            ref if len(ref) <= 22 else ref[:20] + "…",
        )

    @admin.display(description="User", ordering="user__email")
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
        description="Type",
        ordering="payment_type",
    )
    def payment_type_badge(self, obj):
        colors = {
            "connection": ("#1d4ed8", "rgba(59,130,246,0.12)"),
            "service": ("#7e22ce", "rgba(168,85,247,0.12)"),
        }
        color, bg = colors.get(
            obj.payment_type, ("#334155", "#f1f5f9")
        )
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;'
            "border-radius:999px;font-size:11px;font-weight:700;"
            'color:{};background:{};">{}</span>',
            color,
            bg,
            obj.get_payment_type_display(),
        )

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        colors = {
            "pending": ("#b45309", "rgba(245,158,11,0.14)"),
            "completed": ("#047857", "rgba(16,185,129,0.14)"),
            "failed": ("#b91c1c", "rgba(239,68,68,0.14)"),
            "cancelled": ("#64748b", "#f1f5f9"),
        }
        color, bg = colors.get(obj.status, ("#334155", "#f1f5f9"))
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

    @admin.display(description="Connection")
    def connection_link(self, obj):
        if not obj.connection:
            return "—"
        return format_html(
            '<a href="/admin/connections/connection/{}/change/">'
            "<code>{}</code>"
            "</a>",
            obj.connection.id,
            str(obj.connection.connection_id)[:8] + "…",
        )

    @admin.display(description="Service")
    def service_link(self, obj):
        if not obj.service:
            return "—"
        return format_html(
            '<a href="/admin/services/clientservice/{}/change/">'
            "{}"
            "</a>",
            obj.service.id,
            getattr(obj.service, "title", "Service"),
        )

    # ========================================================
    # READ-ONLY DERIVED FIELDS
    # ========================================================

    @admin.display(description="Is terminal?")
    def is_terminal_display(self, obj):
        return obj.is_terminal

    @admin.display(description="Is completed?")
    def is_completed_display(self, obj):
        return obj.is_completed

    # ========================================================
    # BULK ACTIONS
    # ========================================================

    actions = ("mark_completed", "mark_failed", "mark_cancelled")

    @admin.action(description="Mark selected as completed")
    def mark_completed(self, request, queryset):
        updated = queryset.update(status="completed")
        self.message_user(
            request, f"{updated} payment(s) marked completed."
        )

    @admin.action(description="Mark selected as failed")
    def mark_failed(self, request, queryset):
        updated = queryset.update(status="failed")
        self.message_user(
            request, f"{updated} payment(s) marked failed."
        )

    @admin.action(description="Mark selected as cancelled")
    def mark_cancelled(self, request, queryset):
        updated = queryset.update(status="cancelled")
        self.message_user(
            request, f"{updated} payment(s) marked cancelled."
        )

    # ========================================================
    # PREVENT MANUAL CREATION
    # ========================================================

    def has_add_permission(self, request):
        return False