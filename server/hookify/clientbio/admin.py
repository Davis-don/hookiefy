from django.contrib import admin
from .models import Bio

@admin.register(Bio)
class BioAdmin(admin.ModelAdmin):
    list_display = (
        "full_name",
        "email",
        "age",
        "gender",
        "country",
        "county",
        "is_active",
        "is_verified",
        "created_at",
    )
    list_filter = ("country", "county", "is_active", "is_verified")
    search_fields = ("client_profile__user__first_name", "client_profile__user__last_name", "client_profile__user__email")
    readonly_fields = ("created_at", "updated_at", "uploaded_img_public_id")
    ordering = ("-created_at",)
    fieldsets = (
        ("Personal Info", {
            "fields": ("client_profile", "age", "gender", "phone_number", "date_of_birth", "occupation", "interests")
        }),
        ("Location", {
            "fields": ("country", "county", "location_desc")
        }),
        ("Image & Verification", {
            "fields": ("uploaded_img", "uploaded_img_public_id", "is_verified", "verification_document")
        }),
        ("Bio / Info", {
            "fields": ("info",)
        }),
        ("Status & Metadata", {
            "fields": ("is_active", "created_at", "updated_at")
        }),
    )