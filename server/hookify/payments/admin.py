from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "merchant_reference",
        "user",
        "connection",
        "amount",
        "status",
        "phone_number",
        "order_tracking_id",
        "created_at",
    )

    list_filter = (
        "status",
        "created_at",
    )

    search_fields = (
        "merchant_reference",
        "order_tracking_id",
        "phone_number",
        "user__email",
        "user__first_name",
        "user__last_name",
        "connection__connection_id",
    )

    readonly_fields = (
        "merchant_reference",
        "order_tracking_id",
        "created_at",
        "updated_at",
        "paid_at",
    )

    ordering = ("-created_at",)