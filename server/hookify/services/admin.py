# services/admin.py
from django.contrib import admin

from .models import ServiceCategory


@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    """
    Admin panel for managing service categories.

    Superadmins use this to add, edit, activate, or
    deactivate the categories that service providers
    choose from when listing a new service.
    """

    # ── List view ─────────────────────────────────────────

    list_display = (
        "name",
        "slug",
        "is_active",
        "is_featured",
        "updated_at",
    )

    list_display_links = (
        "name",
        "slug",
    )

    list_editable = (
        "is_active",
        "is_featured",
    )

    list_filter = (
        "is_active",
        "is_featured",
        "created_at",
    )

    search_fields = (
        "name",
        "slug",
        "description",
    )

    ordering = (
        "name",
    )

    list_per_page = 50

    # ── Detail view ───────────────────────────────────────

    prepopulated_fields = {
        "slug": ("name",),
    }

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Identity",
            {
                "fields": (
                    "name",
                    "slug",
                    "description",
                ),
            },
        ),
        (
            "Visibility",
            {
                "fields": (
                    "is_active",
                    "is_featured",
                ),
            },
        ),
        (
            "Audit",
            {
                "fields": (
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    # ── Bulk actions ──────────────────────────────────────

    actions = (
        "activate_categories",
        "deactivate_categories",
        "feature_categories",
        "unfeature_categories",
    )

    @admin.action(description="Activate selected categories")
    def activate_categories(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f"{updated} category(ies) activated.",
        )

    @admin.action(description="Deactivate selected categories")
    def deactivate_categories(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f"{updated} category(ies) deactivated.",
        )

    @admin.action(description="Mark selected as featured")
    def feature_categories(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(
            request,
            f"{updated} category(ies) marked as featured.",
        )

    @admin.action(description="Remove featured flag from selected")
    def unfeature_categories(self, request, queryset):
        updated = queryset.update(is_featured=False)
        self.message_user(
            request,
            f"{updated} category(ies) unfeatured.",
        )