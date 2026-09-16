# userprofile/admin.py

from django.contrib import admin

from .models import UserProfile


# ============================================================
# USER PROFILE ADMIN
# ============================================================

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    """
    Admin configuration for UserProfile.

    Notes:
        - `user` is the primary key (OneToOne), so we
          reference it directly in list_display.
        - `autocomplete_fields = ("user",)` requires
          AccountsAdmin to define `search_fields`, otherwise
          Django admin raises a system check error.
    """

    # --------------------------------------------------------
    # LIST VIEW
    # --------------------------------------------------------

    list_display = (
        "user_email",
        "user_full_name",
        "user_role",
        "country",
        "county",
        "city",
        "display_age",
        "created_at",
    )

    list_display_links = (
        "user_email",
        "user_full_name",
    )

    list_filter = (
        "user__role",
        "country",
        "county",
        "city",
        "created_at",
    )

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "country",
        "county",
        "city",
    )

    autocomplete_fields = (
        "user",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "display_age",
    )

    ordering = (
        "-created_at",
    )

    list_per_page = 25

    # --------------------------------------------------------
    # DETAIL VIEW
    # --------------------------------------------------------

    fieldsets = (
        (
            "User",
            {
                "fields": (
                    "user",
                ),
                "description": (
                    "The account this profile belongs to. "
                    "Each user can have only one profile."
                ),
            },
        ),
        (
            "Profile Information",
            {
                "fields": (
                    "bio",
                    "date_of_birth",
                    "country",
                    "county",
                    "city",
                ),
            },
        ),
        (
            "Computed",
            {
                "fields": (
                    "display_age",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Timestamps",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    # --------------------------------------------------------
    # CUSTOM COLUMNS
    # --------------------------------------------------------

    @admin.display(
        description="Email",
        ordering="user__email",
    )
    def user_email(self, obj):
        return obj.user.email

    @admin.display(
        description="Full name",
        ordering="user__first_name",
    )
    def user_full_name(self, obj):
        return obj.user.full_name

    @admin.display(
        description="Role",
        ordering="user__role",
    )
    def user_role(self, obj):
        return obj.user.get_role_display()

    @admin.display(description="Age")
    def display_age(self, obj):
        """
        Show the user's age in the admin. Returns a dash
        when date_of_birth is not set.
        """

        age = obj.age

        return age if age is not None else "—"