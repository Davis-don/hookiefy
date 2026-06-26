from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Accounts


@admin.register(Accounts)
class AccountsAdmin(UserAdmin):
    model = Accounts

    # what shows in list view
    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "has_profile_image_display",
        "is_staff",
        "is_superuser",
    )

    list_filter = (
        "role",
        "is_staff",
        "is_superuser",
        "is_active",
        "gender",
    )

    search_fields = (
        "email",
        "first_name",
        "last_name",
        "phone_number",
    )

    ordering = ("email",)

    # fields shown when editing a user in admin
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {
            "fields": (
                "first_name", 
                "last_name", 
                "phone_number", 
                "gender",
                "profile_image_url",
                "profile_image_public_id",
            )
        }),
        ("Permissions", {
            "fields": (
                "role", 
                "is_active", 
                "is_staff", 
                "is_superuser", 
                "groups", 
                "user_permissions"
            )
        }),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )

    # fields shown when creating user in admin
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email",
                "first_name",
                "last_name",
                "phone_number",
                "gender",
                "role",
                "password1",
                "password2",
                "is_staff",
                "is_superuser",
            ),
        }),
    )

    readonly_fields = (
        "profile_image_public_id",
        "last_login",
        "date_joined",
    )

    def has_profile_image_display(self, obj):
        """Display a visual indicator if user has a profile image"""
        if obj.profile_image_url:
            return "✅ Yes"
        return "❌ No"
    
    has_profile_image_display.short_description = "Profile Image"
    has_profile_image_display.boolean = False

    # Optional: Display profile image thumbnail in admin
    def profile_image_preview(self, obj):
        """Display a thumbnail of the profile image in admin"""
        if obj.profile_image_url:
            return f'<img src="{obj.profile_image_url}" width="50" height="50" style="border-radius: 50%; object-fit: cover;" />'
        return "No image"
    
    profile_image_preview.short_description = "Image Preview"
    profile_image_preview.allow_tags = True