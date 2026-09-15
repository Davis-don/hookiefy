
# account/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import (
    UserCreationForm,
    UserChangeForm,
)

from .models import Accounts


# ============================================================
# CUSTOM FORMS (EMAIL INSTEAD OF USERNAME)
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

    Uses email instead of username and includes
    Cloudinary profile image information.
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
        "has_profile_image",
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
        "google_id",
        "profile_image_public_id",
    )

    ordering = ("-date_joined",)

    # --------------------------------------------------------
    # DETAIL VIEW
    # --------------------------------------------------------

    fieldsets = (
        # ----------------------------------------------------
        # ACCOUNT
        # ----------------------------------------------------

        (
            None,
            {
                "fields": (
                    "email",
                    "password",
                )
            },
        ),

        # ----------------------------------------------------
        # PERSONAL INFORMATION
        # ----------------------------------------------------

        (
            "Personal info",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "gender",
                    "phone_number",
                )
            },
        ),

        # ----------------------------------------------------
        # PROFILE IMAGE
        # ----------------------------------------------------

        (
            "Profile Image",
            {
                "fields": (
                    "profile_image_url",
                    "profile_image_public_id",
                ),
                "description": (
                    "Cloudinary profile image information. "
                    "The URL is used to display the image. "
                    "The public ID is used to manage or "
                    "delete the image from Cloudinary."
                ),
            },
        ),

        # ----------------------------------------------------
        # ROLE & AUTHENTICATION
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # PERMISSIONS
        # ----------------------------------------------------

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

        # ----------------------------------------------------
        # IMPORTANT DATES
        # ----------------------------------------------------

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
    # ADD USER FORM
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
                    "google_id",
                    "profile_image_url",
                    "profile_image_public_id",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )

