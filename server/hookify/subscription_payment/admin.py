from django.contrib import admin

from .models import SubscriptionPayment


@admin.register(SubscriptionPayment)
class SubscriptionPaymentAdmin(admin.ModelAdmin):

    # ========================================================
    # LIST DISPLAY
    # ========================================================

    list_display = (
        "merchant_reference",
        "subscription_user",
        "subscription_plan",
        "amount",
        "gateway",
        "status",
        "paid_at",
        "created_at",
    )

    # ========================================================
    # FILTERS
    # ========================================================

    list_filter = (
        "status",
        "gateway",
        "subscription__plan",
        "paid_at",
        "created_at",
    )

    # ========================================================
    # SEARCH
    # ========================================================

    search_fields = (
        "merchant_reference",
        "order_tracking_id",
        "subscription_payment_id",
        "phone_number",
        "subscription__user__username",
        "subscription__user__email",
        "subscription__plan__name",
    )

    # ========================================================
    # DATE HIERARCHY
    # ========================================================

    date_hierarchy = "created_at"

    # ========================================================
    # DEFAULT ORDERING
    # ========================================================

    ordering = (
        "-created_at",
    )

    # ========================================================
    # READ-ONLY FIELDS
    # ========================================================

    readonly_fields = (
        "subscription_payment_id",
        "merchant_reference",
        "order_tracking_id",
        "created_at",
        "updated_at",
    )

    # ========================================================
    # FORM LAYOUT
    # ========================================================

    fieldsets = (
        (
            "Payment Identification",
            {
                "fields": (
                    "subscription_payment_id",
                    "merchant_reference",
                    "order_tracking_id",
                )
            },
        ),
        (
            "Customer & Subscription",
            {
                "fields": (
                    "subscription",
                )
            },
        ),
        (
            "Payment Details",
            {
                "fields": (
                    "amount",
                    "phone_number",
                    "gateway",
                    "status",
                    "paid_at",
                )
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )

    # ========================================================
    # CUSTOM DISPLAY METHODS
    # ========================================================

    @admin.display(
        description="User",
        ordering="subscription__user__email",
    )
    def subscription_user(self, obj):
        return obj.subscription.user.email

    @admin.display(
        description="Plan",
        ordering="subscription__plan__name",
    )
    def subscription_plan(self, obj):
        return obj.subscription.plan.name