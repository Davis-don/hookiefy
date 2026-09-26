# connections/admin.py
from django.contrib import admin
from django.utils.html import format_html

from .models import Connection


@admin.register(Connection)
class ConnectionAdmin(admin.ModelAdmin):

    # ========================================================
    # LIST VIEW
    # ========================================================

    list_display = (
        "short_id",
        "sender_link",
        "receiver_link",
        "source_badge",
        "payment_status_badge",
        "payment_amount",
        "service_link",
        "created_at",
    )

    list_filter = (
        "source",
        "created_at",
        "updated_at",
    )

    search_fields = (
        "connection_id",
        "sender__email",
        "sender__first_name",
        "sender__last_name",
        "receiver__email",
        "receiver__first_name",
        "receiver__last_name",
        "service__title",
        "payment__merchant_reference",
    )

    readonly_fields = (
        "connection_id",
        "created_at",
        "updated_at",
        "derived_status_display",
        "payment_details_display",
    )

    ordering = ("-created_at",)

    date_hierarchy = "created_at"

    list_select_related = ("sender", "receiver", "service", "payment")

    list_per_page = 50

    # ========================================================
    # FORM LAYOUT
    # ========================================================

    fieldsets = (
        ("Connection", {
            "fields": (
                "connection_id",
                "sender",
                "receiver",
                "source",
            )
        }),
        ("Service", {
            "fields": (
                "service",
            ),
            "classes": ("collapse",),
        }),
        ("Payment", {
            "fields": (
                "payment",
                "derived_status_display",
                "payment_details_display",
            ),
            "description": (
                "Connection status is derived from the linked "
                "Payment. There is no separate status field."
            ),
        }),
        ("Timestamps", {
            "fields": (
                "created_at",
                "updated_at",
            )
        }),
    )

    # ========================================================
    # LIST COLUMNS
    # ========================================================

    @admin.display(description="ID", ordering="connection_id")
    def short_id(self, obj):
        return str(obj.connection_id)[:8] + "…"

    @admin.display(description="Sender", ordering="sender__email")
    def sender_link(self, obj):
        if not obj.sender:
            return "—"
        return format_html(
            '<a href="/admin/account/accounts/{}/change/">'
            '{} <span style="color:#94a3b8">({})</span>'
            "</a>",
            obj.sender.id,
            obj.sender.full_name or obj.sender.email,
            obj.sender.role,
        )

    @admin.display(description="Receiver", ordering="receiver__email")
    def receiver_link(self, obj):
        if not obj.receiver:
            return "—"
        return format_html(
            '<a href="/admin/account/accounts/{}/change/">'
            '{} <span style="color:#94a3b8">({})</span>'
            "</a>",
            obj.receiver.id,
            obj.receiver.full_name or obj.receiver.email,
            obj.receiver.role,
        )

    @admin.display(description="Source", ordering="source")
    def source_badge(self, obj):
        colors = {
            "hookup": ("#1d4ed8", "rgba(59,130,246,0.12)"),
            "service": ("#7e22ce", "rgba(168,85,247,0.12)"),
            "advert": ("#b45309", "rgba(245,158,11,0.12)"),
        }
        color, bg = colors.get(obj.source, ("#334155", "#f1f5f9"))
        return format_html(
            '<span style="display:inline-block;padding:2px 8px;'
            "border-radius:999px;font-size:11px;font-weight:700;"
            'color:{};background:{};">{}</span>',
            color,
            bg,
            obj.get_source_display(),
        )

    @admin.display(description="Payment status")
    def payment_status_badge(self, obj):
        # Derived directly from the linked payment
        status = obj.status  # property → payment.status or "pending"

        colors = {
            "pending": ("#b45309", "rgba(245,158,11,0.14)"),
            "completed": ("#047857", "rgba(16,185,129,0.14)"),
            "failed": ("#b91c1c", "rgba(239,68,68,0.14)"),
            "cancelled": ("#64748b", "#f1f5f9"),
        }
        color, bg = colors.get(status, ("#334155", "#f1f5f9"))

        label = obj.status_display or status.title()

        return format_html(
            '<span style="display:inline-block;padding:2px 8px;'
            "border-radius:999px;font-size:11px;font-weight:700;"
            'color:{};background:{};">{}</span>',
            color,
            bg,
            label,
        )

    @admin.display(description="Amount")
    def payment_amount(self, obj):
        if not obj.payment:
            return "—"
        return format_html(
            "<strong>KES {}</strong>",
            obj.payment.amount,
        )

    @admin.display(description="Service", ordering="service__title")
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

    @admin.display(description="Derived status")
    def derived_status_display(self, obj):
        return f"{obj.status_display} ({obj.status})"

    @admin.display(description="Payment details")
    def payment_details_display(self, obj):
        if not obj.payment:
            return "No payment linked yet"

        p = obj.payment
        return format_html(
            "Merchant ref: <code>{}</code><br>"
            "Amount: <strong>KES {}</strong><br>"
            "Gateway: {}<br>"
            "Paid at: {}<br>"
            '<a href="/admin/payments/payment/{}/change/">'
            "View payment →</a>",
            p.merchant_reference,
            p.amount,
            p.get_gateway_display(),
            p.paid_at or "—",
            p.id,
        )

    # ========================================================
    # NO ADD PERMISSION
    # ========================================================

    def has_add_permission(self, request):
        return False