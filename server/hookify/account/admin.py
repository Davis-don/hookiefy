from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Accounts


@admin.register(Accounts)
class AccountsAdmin(UserAdmin):
    model = Accounts

    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "phone_number",
        "is_active",
        "is_staff",
    )

    search_fields = (
        "email",
        "first_name",
        "last_name",
        "phone_number",
    )

    ordering = ("email",)