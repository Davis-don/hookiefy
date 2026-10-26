# deliveries/admin.py

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import Deliveries


# ============================================================
# DELIVERY ADMIN
# ============================================================

@admin.register(Deliveries)
class DeliveriesAdmin(admin.ModelAdmin):

    # ── List view ─────────────────────────────────────────
    list_display = (
        "id",
        "payment_ref",
        "client_email",
        "product_name",
        "quantity",
        "town",
        "status_badge",
        "delivered_by_email",
        "delivered_to_email",
        "created_at",
    )

    list_display_links = ("id", "payment_ref")

    # ── Filters ───────────────────────────────────────────
    list_filter = (
        "status",
        "town",
        "created_at",
    )

    # ── Search ────────────────────────────────────────────
    search_fields = (
        "id",
        "town",
        "payment__merchant_reference",
        "client__email",
        "client__first_name",
        "client__last_name",
        "product__name",
        "delivered_by__email",
        "delivered_to__email",
    )

    # ── Ordering & performance ────────────────────────────
    ordering = ("-created_at",)
    list_select_related = (
        "payment",
        "client",
        "product",
        "delivered_by",
        "delivered_to",
    )
    list_per_page = 25
    date_hierarchy = "created_at"

    # ── Read-only system fields ───────────────────────────
    #
    # The `payment` FK is read-only in the admin on purpose:
    # a delivery exists *because* a specific payment
    # completed. Reassigning it would break the invariant
    # "one payment, at most one delivery, created only on
    # completion." If the association is wrong, delete the
    # delivery — don't repoint it.
    #
    # `id` and the timestamps are auto-generated, so also
    # read-only.
    # ───────────────────────────────────────────────────────
    readonly_fields = (
        "id",
        "payment",
        "created_at",
        "updated_at",
    )

    # ── Raw-ID widgets for FK lookups ─────────────────────
    #
    # Client / courier / recipient are account FKs — raw_id
    # avoids loading thousands of accounts into a <select>.
    # Product uses raw_id too. `payment` is in raw_id_fields
    # so its read-only rendering in the change form still
    # uses the compact widget rather than a full select.
    # ───────────────────────────────────────────────────────
    raw_id_fields = (
        "payment",
        "client",
        "product",
        "delivered_by",
        "delivered_to",
    )

    # ── Detail page layout ────────────────────────────────
    fieldsets = (
        ("Identity", {
            "fields": (
                "id",
                "payment",
            ),
        }),
        ("Order", {
            "fields": (
                "client",
                "product",
                "quantity",
            ),
        }),
        ("Delivery", {
            "fields": (
                "town",
                "delivered_by",
                "delivered_to",
            ),
        }),
        ("Status", {
            "fields": (
                "status",
                "delivered_at",
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
        "mark_delivered",
        "mark_cancelled",
        "mark_failed",
    )

    # ── Computed columns ──────────────────────────────────

    @admin.display(
        description="Payment",
        ordering="payment__merchant_reference",
    )
    def payment_ref(self, obj):
        return (
            obj.payment.merchant_reference
            if obj.payment_id else "—"
        )

    @admin.display(description="Client", ordering="client__email")
    def client_email(self, obj):
        return obj.client.email if obj.client_id else "—"

    @admin.display(description="Product", ordering="product__name")
    def product_name(self, obj):
        return obj.product.name if obj.product_id else "—"

    @admin.display(description="Courier", ordering="delivered_by__email")
    def delivered_by_email(self, obj):
        return obj.delivered_by.email if obj.delivered_by_id else "—"

    @admin.display(description="Recipient", ordering="delivered_to__email")
    def delivered_to_email(self, obj):
        return obj.delivered_to.email if obj.delivered_to_id else "—"

    @admin.display(description="Status")
    def status_badge(self, obj):
        """Colour-coded status pill."""
        colors = {
            Deliveries.STATUS_PENDING:   ("#F1F5F9", "#334155"),
            Deliveries.STATUS_DELIVERED: ("#ECFDF5", "#047857"),
            Deliveries.STATUS_CANCELLED: ("#F3F4F6", "#4B5563"),
            Deliveries.STATUS_FAILED:    ("#FEF2F2", "#B91C1C"),
        }
        bg, fg = colors.get(obj.status, ("#F1F5F9", "#334155"))

        return format_html(
            '<span style="display:inline-block;padding:2px 8px;'
            'border-radius:999px;font-size:0.72rem;font-weight:700;'
            'text-transform:uppercase;letter-spacing:0.4px;'
            'background:{};color:{};">{}</span>',
            bg,
            fg,
            obj.get_status_display(),
        )

    # ── Bulk actions ──────────────────────────────────────
    #
    # All three exclude rows that are already in a terminal
    # state, so a mixed batch of pending + delivered rows
    # only updates the pending ones. That matches what an
    # operator would expect: "mark selected as delivered"
    # shouldn't silently rewrite rows that were already
    # delivered (or cancelled, or failed).
    # ───────────────────────────────────────────────────────

    @admin.action(description="Mark selected deliveries as delivered")
    def mark_delivered(self, request, queryset):
        now = timezone.now()
        updated = queryset.exclude(
            status__in=[
                Deliveries.STATUS_DELIVERED,
                Deliveries.STATUS_CANCELLED,
                Deliveries.STATUS_FAILED,
            ]
        ).update(
            status=Deliveries.STATUS_DELIVERED,
            delivered_at=now,
        )
        self.message_user(
            request,
            f"{updated} delivery(ies) marked as delivered.",
        )

    @admin.action(description="Mark selected deliveries as cancelled")
    def mark_cancelled(self, request, queryset):
        updated = queryset.exclude(
            status__in=[
                Deliveries.STATUS_DELIVERED,
                Deliveries.STATUS_CANCELLED,
                Deliveries.STATUS_FAILED,
            ]
        ).update(status=Deliveries.STATUS_CANCELLED)
        self.message_user(
            request,
            f"{updated} delivery(ies) marked as cancelled.",
        )

    @admin.action(description="Mark selected deliveries as failed")
    def mark_failed(self, request, queryset):
        updated = queryset.exclude(
            status__in=[
                Deliveries.STATUS_DELIVERED,
                Deliveries.STATUS_CANCELLED,
                Deliveries.STATUS_FAILED,
            ]
        ).update(status=Deliveries.STATUS_FAILED)
        self.message_user(
            request,
            f"{updated} delivery(ies) marked as failed.",
        )