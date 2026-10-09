# ============================================================
# admin.py
# ============================================================

from django.contrib import admin
from .models import Products, ProductImage, ProductProperty


# ============================================================
# INLINES
# ============================================================

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ("image_url", "image_public_id", "is_primary", "sort_order")
    ordering = ("sort_order",)


class ProductPropertyInline(admin.TabularInline):
    model = ProductProperty
    extra = 1
    fields = ("name", "value", "sort_order")
    ordering = ("sort_order",)


# ============================================================
# PRODUCTS ADMIN
# ============================================================

@admin.register(Products)
class ProductsAdmin(admin.ModelAdmin):

    # ── List view ─────────────────────────────────────────
    list_display = (
        "name",
        "business",
        "price",
        "has_images",
        "created_at",
    )

    list_display_links = ("name",)

    # ── Filters ───────────────────────────────────────────
    list_filter = (
        "created_at",
    )

    # ── Search ────────────────────────────────────────────
    search_fields = (
        "name",
        "description",
        "property_items__name",
        "property_items__value",
        "business__business_name",
    )

    # ── Ordering & performance ────────────────────────────
    ordering = ("-created_at",)
    list_select_related = ("business",)
    raw_id_fields = ("business",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 25

    # ── Inlines ───────────────────────────────────────────
    inlines = (
        ProductImageInline,
        ProductPropertyInline,
    )

    # ── Detail page layout ────────────────────────────────
    fieldsets = (
        ("Business", {
            "fields": ("business",),
        }),
        ("Product", {
            "fields": (
                "name",
                "description",
                "price",
            ),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(boolean=True, description="Images")
    def has_images(self, obj):
        return obj.images.exists()