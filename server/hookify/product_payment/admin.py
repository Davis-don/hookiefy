# product_payment/admin.py

from django.contrib import admin
from django.utils.html import format_html

from .models import ProductPayment


# ============================================================
# PRODUCT PAYMENT ADMIN
# ============================================================

@admin.register(ProductPayment)
class ProductPaymentAdmin(admin.ModelAdmin):

    # ── List view ─────────────────────────────────────────
    list_display = (
        "merchant_reference",
        "user_email",
        "product_name",
        "business_name",
        "amount_display",
        "status_badge",
        "gateway",
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
        "email",
        "phone_number",
        "confirmation_code",
        "user__email",
        "product__name",
        "business__business_name",
    )

    # ── Ordering & performance ────────────────────────────
    ordering = ("-created_at",)
    list_select_related = ("user", "product", "business")
    list_per_page = 25
    date_hierarchy = "created_at"

    # ── Every field is read-only ──────────────────────────
    #
    # Payment rows are written by the payment flow (initiate,
    # sync, IPN), never hand-edited. Marking the whole model
    # read-only in admin prevents accidental corruption of
    # financial records and keeps the audit trail honest.
    # ───────────────────────────────────────────────────────
    readonly_fields = (
        "id",
        "merchant_reference",
        "order_tracking_id",
        "user",
        "product",
        "business",
        "quantity",
        "gateway",
        "status",
        "amount",
        "currency",
        "email",
        "phone_number",
        "confirmation_code",
        "payment_method",
        "payment_account",
        "submit_response",
        "status_response",
        "error_message",
        "paid_at",
        "created_at",
        "updated_at",
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
        ("What was purchased", {
            "fields": (
                "product",
                "business",
                "quantity",
            ),
        }),
        ("Who purchased", {
            "fields": (
                "user",
                "email",
                "phone_number",
            ),
        }),
        ("Payment", {
            "fields": (
                "gateway",
                "status",
                "amount",
                "currency",
                "paid_at",
            ),
        }),
        ("Confirmation", {
            "fields": (
                "confirmation_code",
                "payment_method",
                "payment_account",
            ),
            "classes": ("collapse",),
        }),
        ("Errors", {
            "fields": ("error_message",),
            "classes": ("collapse",),
        }),
        ("Raw gateway payloads", {
            "fields": (
                "submit_response",
                "status_response",
            ),
            "classes": ("collapse",),
            "description": (
                "Full JSON payloads from the gateway — kept for "
                "debugging and future reconciliation."
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

    # ── Actions ───────────────────────────────────────────
    actions = ("sync_with_pesapal",)

    # ── Computed columns ──────────────────────────────────

    @admin.display(description="User", ordering="user__email")
    def user_email(self, obj):
        return obj.user.email if obj.user_id else "—"

    @admin.display(description="Product", ordering="product__name")
    def product_name(self, obj):
        return obj.product.name if obj.product_id else "—"

    @admin.display(
        description="Business",
        ordering="business__business_name",
    )
    def business_name(self, obj):
        return obj.business.business_name if obj.business_id else "—"

    @admin.display(description="Amount", ordering="amount")
    def amount_display(self, obj):
        return obj.amount_display

    @admin.display(description="Status")
    def status_badge(self, obj):
        """Color-coded status pill."""
        colors = {
            ProductPayment.STATUS_PENDING:   ("#F1F5F9", "#334155"),
            ProductPayment.STATUS_COMPLETED: ("#ECFDF5", "#047857"),
            ProductPayment.STATUS_FAILED:    ("#FEF2F2", "#B91C1C"),
            ProductPayment.STATUS_REVERSED:  ("#FEF3C7", "#92400E"),
            ProductPayment.STATUS_INVALID:   ("#FEE2E2", "#991B1B"),
            ProductPayment.STATUS_CANCELLED: ("#F3F4F6", "#4B5563"),
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

    # ── Bulk action: sync with PesaPal ────────────────────

    @admin.action(description="Sync selected payments with PesaPal")
    def sync_with_pesapal(self, request, queryset):
        """
        Ask PesaPal for the latest status of each selected
        payment and update the local rows.

        Silently skips rows that are already in a terminal
        state — those rows will never change again, so a sync
        is wasted work.
        """
        from .controllers.services import sync_product_payment_from_pesapal

        synced = 0
        skipped_terminal = 0
        failed = 0

        for payment in queryset:
            if payment.is_terminal:
                skipped_terminal += 1
                continue

            try:
                sync_product_payment_from_pesapal(
                    payment.merchant_reference
                )
                synced += 1
            except Exception as e:
                failed += 1
                self.message_user(
                    request,
                    f"{payment.merchant_reference}: {e}",
                    level="error",
                )

        parts = []
        if synced:
            parts.append(f"{synced} synced")
        if skipped_terminal:
            parts.append(f"{skipped_terminal} already terminal")
        if failed:
            parts.append(f"{failed} failed")

        if parts:
            self.message_user(
                request,
                " · ".join(parts),
                level="info",
            )