# account/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import (
    UserCreationForm,
    UserChangeForm,
)
from django.utils.html import format_html

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

    Uses email instead of username and includes:
    - Cloudinary profile image information
    - Read-only subscription status (sourced from the
      linked `subscription.Subscription` row)
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
        "subscription_plan_display",
        "subscription_status_display",
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
        # SUBSCRIPTION (READ-ONLY)
        # ----------------------------------------------------
        (
            "Subscription",
            {
                "fields": (
                    "subscription_plan_display",
                    "subscription_status_display",
                    "subscription_dates_display",
                ),
                "description": (
                    "Subscription state comes from the "
                    "linked Subscription record. To change "
                    "it, edit the Subscription directly at "
                    "/admin/subscription/subscription/."
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
    #
    # Subscription is NOT creatable here — it is auto-created
    # on signup by the app. Use /admin/subscription/ to manage.
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

    # --------------------------------------------------------
    # READ-ONLY FIELDS
    # --------------------------------------------------------

    readonly_fields = (
        "subscription_plan_display",
        "subscription_status_display",
        "subscription_dates_display",
    )

    # --------------------------------------------------------
    # CUSTOM READ-ONLY COLUMNS / FIELDS
    # --------------------------------------------------------

    @admin.display(description="Plan")
    def subscription_plan_display(self, obj):
        sub = getattr(obj, "subscription", None)
        if not sub or not sub.plan:
            return "—"

        return format_html(
            '<a href="/admin/plans/plan/{}/change/">'
            "{} <span style=\"color:#94a3b8\">(KES {})</span>"
            "</a>",
            sub.plan.id,
            sub.plan.name,
            sub.plan.price,
        )

    @admin.display(description="Sub status")
    def subscription_status_display(self, obj):
        sub = getattr(obj, "subscription", None)

        if not sub:
            label, color, bg = (
                "None",
                "#64748b",
                "#f1f5f9",
            )
        elif sub.is_active:
            label, color, bg = (
                "Active",
                "#047857",
                "rgba(16,185,129,0.14)",
            )
        else:
            label, color, bg = (
                "Expired",
                "#b91c1c",
                "rgba(239,68,68,0.14)",
            )

        return format_html(
            '<span style="display:inline-block;padding:2px 10px;'
            "border-radius:999px;font-size:11px;font-weight:700;"
            'color:{};background:{};">{}</span>',
            color,
            bg,
            label,
        )

    @admin.display(description="Subscription dates")
    def subscription_dates_display(self, obj):
        sub = getattr(obj, "subscription", None)
        if not sub:
            return "—"

        return format_html(
            "Start: <strong>{}</strong><br>"
            "End: <strong>{}</strong><br>"
            "Days remaining: <strong>{}</strong>",
            sub.start_date,
            sub.end_date,
            sub.days_remaining,
        )

    # --------------------------------------------------------
    # QUERYSET OPTIMISATION
    # --------------------------------------------------------

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("subscription", "subscription__plan")
        )