# services/admin.py

from django.contrib import admin
from django.utils.html import format_html

from .models import ServiceCategory, ClientService, ServiceImage


# ============================================================
# SERVICE CATEGORY ADMIN
# ============================================================

@admin.register(ServiceCategory)
class ServiceCategoryAdmin(admin.ModelAdmin):
    """
    Admin panel for managing service categories.

    Superadmins use this to add, edit, activate, or
    deactivate categories that service providers
    choose when creating a service or product listing.
    """

    # --------------------------------------------------------
    # LIST VIEW
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # DETAIL VIEW
    # --------------------------------------------------------

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
                    "image_url",
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

    # --------------------------------------------------------
    # BULK ACTIONS
    # --------------------------------------------------------

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


# ============================================================
# SERVICE IMAGE INLINE (inside ClientService)
# ============================================================

class ServiceImageInline(admin.TabularInline):
    """
    Manage a listing's images directly from the
    ClientService edit page.
    """

    model = ServiceImage
    extra = 1
    fields = (
        "image_preview",
        "image_url",
        "image_public_id",
        "is_primary",
        "display_order",
    )
    readonly_fields = ("image_preview",)
    ordering = ("display_order", "id")

    @admin.display(description="Preview")
    def image_preview(self, obj):
        if obj and obj.image_url:
            return format_html(
                '<img src="{}" style="height:60px;'
                'border-radius:6px;object-fit:cover;" />',
                obj.image_url,
            )
        return "—"


# ============================================================
# CLIENT SERVICE ADMIN
# ============================================================

@admin.register(ClientService)
class ClientServiceAdmin(admin.ModelAdmin):
    """
    Admin panel for managing service, product, and
    hookup listings.

    A listing belongs to one provider and one category.
    Providers can have multiple listings, each with
    any number of ServiceImage rows.
    """

    # --------------------------------------------------------
    # LIST VIEW
    # --------------------------------------------------------

    list_display = (
        "title",
        "provider",
        "category",
        "listing_type_badge",
        "price",
        "pricing_unit",
        "primary_thumb",
        "is_active",
        "created_at",
    )

    list_display_links = (
        "title",
    )

    list_editable = (
        "is_active",
    )

    list_filter = (
        "listing_type",
        "pricing_unit",
        "category",
        "is_active",
        "created_at",
    )

    search_fields = (
        "title",
        "description",
        "provider__email",
        "provider__first_name",
        "provider__last_name",
        "category__name",
    )

    ordering = (
        "-created_at",
    )

    list_per_page = 50

    # --------------------------------------------------------
    # DETAIL VIEW
    # --------------------------------------------------------

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    fieldsets = (
        (
            "Listing Information",
            {
                "fields": (
                    "listing_type",
                    "title",
                    "category",
                    "description",
                ),
            },
        ),
        (
            "Provider",
            {
                "fields": (
                    "provider",
                ),
            },
        ),
        (
            "Pricing",
            {
                "fields": (
                    "price",
                    "pricing_unit",
                ),
            },
        ),
        (
            "Status",
            {
                "fields": (
                    "is_active",
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

    # --------------------------------------------------------
    # INLINES
    # --------------------------------------------------------

    inlines = [ServiceImageInline]

    # --------------------------------------------------------
    # PERFORMANCE
    # --------------------------------------------------------

    list_select_related = (
        "provider",
        "category",
    )

    # --------------------------------------------------------
    # LIST VIEW — LISTING TYPE BADGE
    # --------------------------------------------------------

    @admin.display(
        description="Type",
        ordering="listing_type",
    )
    def listing_type_badge(self, obj):
        """
        Colour-coded pill for the listing type so
        service / product / hookup are easy to spot
        at a glance in the changelist.
        """

        palettes = {
            "service": ("#1d4ed8", "rgba(37, 99, 235, 0.12)"),
            "product": ("#059669", "rgba(16, 185, 129, 0.14)"),
            "hookup": ("#b03a35", "rgba(217, 83, 79, 0.14)"),
        }

        color, background = palettes.get(
            obj.listing_type,
            ("#555555", "rgba(0, 0, 0, 0.06)"),
        )

        label = obj.get_listing_type_display()

        return format_html(
            '<span style="display:inline-block;'
            'padding:3px 10px;'
            'border-radius:999px;'
            'font-size:11px;'
            'font-weight:700;'
            'letter-spacing:0.04em;'
            'text-transform:uppercase;'
            'color:{};'
            'background:{};">{}</span>',
            color,
            background,
            label,
        )

    # --------------------------------------------------------
    # LIST VIEW — PRIMARY IMAGE THUMBNAIL
    # --------------------------------------------------------

    @admin.display(description="Cover")
    def primary_thumb(self, obj):
        img = obj.primary_image

        if not img or not img.image_url:
            return "—"

        return format_html(
            '<img src="{}" style="height:40px;width:56px;'
            'border-radius:6px;object-fit:cover;" />',
            img.image_url,
        )

    # --------------------------------------------------------
    # BULK ACTIONS
    # --------------------------------------------------------

    actions = (
        "activate_services",
        "deactivate_services",
        "mark_as_service",
        "mark_as_product",
        "mark_as_hookup",
    )

    @admin.action(description="Activate selected listings")
    def activate_services(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(
            request,
            f"{updated} listing(s) activated.",
        )

    @admin.action(description="Deactivate selected listings")
    def deactivate_services(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(
            request,
            f"{updated} listing(s) deactivated.",
        )

    @admin.action(description="Change type → Service")
    def mark_as_service(self, request, queryset):
        updated = queryset.update(listing_type="service")
        self.message_user(
            request,
            f"{updated} listing(s) marked as Service.",
        )

    @admin.action(description="Change type → Product")
    def mark_as_product(self, request, queryset):
        updated = queryset.update(listing_type="product")
        self.message_user(
            request,
            f"{updated} listing(s) marked as Product.",
        )

    @admin.action(description="Change type → Hookup")
    def mark_as_hookup(self, request, queryset):
        updated = queryset.update(listing_type="hookup")
        self.message_user(
            request,
            f"{updated} listing(s) marked as Hookup.",
        )

    # --------------------------------------------------------
    # QUERYSET OPTIMISATION
    # --------------------------------------------------------

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related("images")


# ============================================================
# SERVICE IMAGE ADMIN (standalone)
# ============================================================

@admin.register(ServiceImage)
class ServiceImageAdmin(admin.ModelAdmin):
    """
    Standalone admin for images — useful when you need to
    audit or fix image records across many listings.
    """

    list_display = (
        "id",
        "service",
        "image_preview",
        "is_primary",
        "display_order",
        "created_at",
    )

    list_display_links = (
        "id",
        "service",
    )

    list_editable = (
        "is_primary",
        "display_order",
    )

    list_filter = (
        "is_primary",
        "created_at",
    )

    search_fields = (
        "service__title",
        "service__provider__email",
        "image_public_id",
    )

    ordering = (
        "-created_at",
    )

    list_per_page = 50

    readonly_fields = (
        "image_preview_large",
        "created_at",
    )

    fieldsets = (
        (
            "Parent Listing",
            {
                "fields": (
                    "service",
                ),
            },
        ),
        (
            "Cloudinary",
            {
                "fields": (
                    "image_preview_large",
                    "image_url",
                    "image_public_id",
                ),
            },
        ),
        (
            "Gallery",
            {
                "fields": (
                    "is_primary",
                    "display_order",
                ),
            },
        ),
        (
            "Audit",
            {
                "fields": (
                    "created_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    list_select_related = (
        "service",
    )

    # --------------------------------------------------------
    # PREVIEWS
    # --------------------------------------------------------

    @admin.display(description="Preview")
    def image_preview(self, obj):
        if not obj.image_url:
            return "—"

        return format_html(
            '<img src="{}" style="height:40px;width:56px;'
            'border-radius:6px;object-fit:cover;" />',
            obj.image_url,
        )

    @admin.display(description="Preview")
    def image_preview_large(self, obj):
        if not obj or not obj.image_url:
            return "—"

        return format_html(
            '<img src="{}" style="max-width:280px;'
            'border-radius:10px;" />',
            obj.image_url,
        )

    # --------------------------------------------------------
    # BULK ACTIONS
    # --------------------------------------------------------

    actions = (
        "make_primary",
        "make_secondary",
    )

    @admin.action(description="Mark selected as primary")
    def make_primary(self, request, queryset):
        count = 0

        for img in queryset:
            img.is_primary = True
            img.save(update_fields=["is_primary"])
            count += 1

        self.message_user(
            request,
            f"{count} image(s) marked as primary.",
        )

    @admin.action(description="Remove primary flag from selected")
    def make_secondary(self, request, queryset):
        updated = queryset.update(is_primary=False)
        self.message_user(
            request,
            f"{updated} image(s) unset as primary.",
        )