from django.contrib import admin
from .models import Accounts


@admin.register(Accounts)
class AccountsAdmin(admin.ModelAdmin):
    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "auth_provider",
        "is_active",
        "date_joined",
    )

    list_filter = (
        "role",
        "auth_provider",
        "is_active",
        "gender",
    )

    search_fields = (
        "email",
        "first_name",
        "last_name",
        "phone_number",
    )

    ordering = ("-date_joined",)

    readonly_fields = (
        "date_joined",
        "last_login",
    )

    list_select_related = ()