from django.contrib import admin
from .models import PaymentConfiguration


@admin.register(PaymentConfiguration)
class PaymentConfigurationAdmin(admin.ModelAdmin):
    list_display = (
        "gateway_name",
        "ipn_id",
        "is_active",
        "created_at",
        "updated_at",
    )

    list_filter = (
        "gateway_name",
        "is_active",
    )

    search_fields = (
        "gateway_name",
        "ipn_id",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = ("-created_at",)