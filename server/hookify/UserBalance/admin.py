from django.contrib import admin
from .models import UserBalance


@admin.register(UserBalance)
class UserBalanceAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "balance",
        "pending_balance",
        "total_earned",
        "total_withdrawn",
        "currency",
        "updated_at",
    )

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
    )

    list_filter = (
        "currency",
        "created_at",
        "updated_at",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = ("-updated_at",)