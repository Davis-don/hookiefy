# account/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import (
    UserCreationForm,
    UserChangeForm,
)

from .models import Accounts


# ============================================================
# CUSTOM FORMS (email instead of username)
# ============================================================

class AccountsCreationForm(UserCreationForm):
    """
    Form for creating a new account in admin.
    Uses email instead of username.
    """

    class Meta:
        model = Accounts
        fields = ("email",)


class AccountsChangeForm(UserChangeForm):
    """
    Form for editing an existing account in admin.
    Uses email instead of username.
    """

    class Meta:
        model = Accounts
        fields = "__all__"


# ============================================================
# ACCOUNTS ADMIN
# ============================================================

@admin.register(Accounts)
class AccountsAdmin(UserAdmin):
    """
    Custom admin for the Accounts model.

    Removes all `username` references that Django's default
    UserAdmin expects, and replaces them with `email`.
    """

    # --------------------------------------------------------
    # FORMS
    # --------------------------------------------------------

    add_form = AccountsCreationForm
    form = AccountsChangeForm

    # --------------------------------------------------------
    # LIST VIEW
    # --------------------------------------------------------

    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "auth_provider",
        "is_active",
        "is_staff",
        "date_joined",
    )

    list_filter = (
        "role",
        "auth_provider",
        "is_active",
        "is_staff",
        "is_superuser",
        "gender",
    )

    search_fields = (
        "email",
        "first_name",
        "last_name",
        "phone_number",
    )

    ordering = ("-date_joined",)

    # --------------------------------------------------------
    # DETAIL VIEW LAYOUT
    # --------------------------------------------------------

    fieldsets = (
        (
            None,
            {
                "fields": (
                    "email",
                    "password",
                )
            },
        ),
        (
            "Personal info",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "gender",
                    "phone_number",
                    "profile_image_url",
                )
            },
        ),
        (
            "Role & Auth",
            {
                "fields": (
                    "role",
                    "auth_provider",
                    "google_id",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        (
            "Important dates",
            {
                "fields": (
                    "last_login",
                    "date_joined",
                )
            },
        ),
    )

    # --------------------------------------------------------
    # ADD FORM LAYOUT (creating a new user)
    # --------------------------------------------------------

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "first_name",
                    "last_name",
                    "gender",
                    "phone_number",
                    "role",
                    "auth_provider",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )