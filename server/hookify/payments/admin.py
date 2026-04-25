from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):

    # =========================
    # LIST DISPLAY (what you see)
    # =========================
    list_display = (
        "id",
        "client",
        "amount",
        "currency",
        "status",
        "payment_method",
        "merchant_reference",
        "order_tracking_id",
        "created_at",
        "paid_at",
    )

    # =========================
    # FILTERS (right sidebar)
    # =========================
    list_filter = (
        "status",
        "payment_method",
        "currency",
        "created_at",
        "paid_at",
    )

    # =========================
    # SEARCH 🔍
    # =========================
    search_fields = (
        "client__user__email",
        "merchant_reference",
        "order_tracking_id",
    )

    # =========================
    # SORTING
    # =========================
    ordering = ("-created_at",)

    # =========================
    # READ-ONLY FIELDS
    # =========================
    readonly_fields = (
        "merchant_reference",
        "order_tracking_id",
        "redirect_url",
        "callback_url",
        "ipn_id",
        "pesapal_response",
        "pesapal_status_response",
        "created_at",
        "updated_at",
        "paid_at",
    )

    # =========================
    # FIELD ORGANIZATION 🧠
    # =========================
    fieldsets = (

        ("Basic Info", {
            "fields": (
                "client",
                "hookup",
                "amount",
                "currency",
                "status",
                "payment_method",
            )
        }),

        ("Pesapal Details", {
            "fields": (
                "merchant_reference",
                "order_tracking_id",
                "ipn_id",
            )
        }),

        ("URLs", {
            "fields": (
                "redirect_url",
                "callback_url",
            )
        }),

        ("Customer Info", {
            "fields": (
                "email",
                "phone_number",
            )
        }),

        ("Responses (Debug)", {
            "fields": (
                "pesapal_response",
                "pesapal_status_response",
            ),
            "classes": ("collapse",),  # collapsible section 🔥
        }),

        ("Timestamps", {
            "fields": (
                "created_at",
                "updated_at",
                "paid_at",
            )
        }),
    )