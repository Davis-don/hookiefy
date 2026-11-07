# products/admin.py

from django.contrib import admin
from django.utils.html import format_html

from .models import Products, ProductImage, ProductProperty


# ============================================================
# LOW-STOCK THRESHOLD
# ============================================================
#
# Below this number, the badge turns amber. Tune to taste.
LOW_STOCK_THRESHOLD = 5


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
# STOCK FILTER
# ============================================================
#
# Custom SimpleListFilter so the sidebar shows four buckets —
# In stock / Low stock / Out of stock / All — driven by the
# quantity column rather than an equality check.
# ============================================================

class StockStatusFilter(admin.SimpleListFilter):
    title = "stock status"
    parameter_name = "stock"

    def lookups(self, request, model_admin):
        return (
            ("in",   "In stock"),
            ("low",  f"Low stock (≤ {LOW_STOCK_THRESHOLD})"),
            ("out",  "Out of stock"),
        )

    def queryset(self, request, queryset):
        value = self.value()
        if value == "in":
            return queryset.filter(quantity__gt=LOW_STOCK_THRESHOLD)
        if value == "low":
            return queryset.filter(
                quantity__gt=0,
                quantity__lte=LOW_STOCK_THRESHOLD,
            )
        if value == "out":
            return queryset.filter(quantity=0)
        return queryset


# ============================================================
# PRODUCTS ADMIN
# ============================================================

@admin.register(Products)
class ProductsAdmin(admin.ModelAdmin):

    # ── List view ─────────────────────────────────────────
    #
    # `product_id` comes first so admins can scan the numeric
    # id straight off the changelist — the same id the Add-
    # order wizard asks for, the same id shown on the product
    # detail page's "Product ID" block, and the same id the
    # WhatsApp seller message embeds.
    #
    list_display = (
        "product_id",
        "name",
        "business",
        "price",
        "stock_badge",
        "is_youpata_managed",
        "has_images",
        "likes_count",
        "follows_count",
        "created_at",
    )

    # Only `name` remains a link — `product_id` is plain text
    # so a user can select it with a double-click to copy.
    list_display_links = ("name",)

    # ── Filters ───────────────────────────────────────────
    list_filter = (
        "is_youpata_managed",
        StockStatusFilter,
        "created_at",
    )

    # ── Search ────────────────────────────────────────────
    #
    # `id` is included so pasting a numeric id into the search
    # box jumps straight to the product. Without it, typing
    # "42" would only match names/descriptions that contain
    # the digits "42" — not the product whose id is 42.
    #
    search_fields = (
        "id",
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
    readonly_fields = (
        "id",                       # ← visible on the change form
        "created_at",
        "updated_at",
        "likes_count",
        "follows_count",
    )
    list_per_page = 25

    # ── Inlines ───────────────────────────────────────────
    inlines = (
        ProductImageInline,
        ProductPropertyInline,
    )

    # ── Detail page layout ────────────────────────────────
    fieldsets = (
        ("Identity", {
            "fields": ("id",),
        }),
        ("Business", {
            "fields": ("business",),
        }),
        ("Product", {
            "fields": (
                "name",
                "description",
                "price",
                "quantity",
                "is_youpata_managed",
            ),
        }),
        ("Engagement", {
            "fields": ("likes_count", "follows_count"),
            "classes": ("collapse",),
        }),
        ("Timestamps", {
            "fields": (
                "created_at",
                "updated_at",
            ),
            "classes": ("collapse",),
        }),
    )

    # ── Computed columns ──────────────────────────────────

    @admin.display(
        description="ID",
        ordering="id",
    )
    def product_id(self, obj):
        """
        Plain numeric id, rendered monospace so it visually
        matches the "Product ID" block on the storefront and
        is easy to select/copy.
        """
        return format_html(
            '<span style="font-family:ui-monospace,SFMono-Regular,'
            'Menlo,Consolas,monospace;font-weight:700;">#{}</span>',
            obj.id,
        )

    @admin.display(boolean=True, description="Images")
    def has_images(self, obj):
        return obj.images.exists()

    @admin.display(
        description="Stock",
        ordering="quantity",
    )
    def stock_badge(self, obj):
        """
        Colour-coded stock indicator.

        Green: > LOW_STOCK_THRESHOLD
        Amber: 1..LOW_STOCK_THRESHOLD
        Red:   0 (out of stock)
        """
        qty = obj.quantity

        if qty == 0:
            bg, fg, label = "#FEF2F2", "#B91C1C", "Out of stock"
        elif qty <= LOW_STOCK_THRESHOLD:
            bg, fg, label = "#FEF3C7", "#92400E", f"{qty} left"
        else:
            bg, fg, label = "#ECFDF5", "#047857", f"{qty} in stock"

        return format_html(
            '<span style="display:inline-block;padding:2px 8px;'
            'border-radius:999px;font-size:0.72rem;font-weight:700;'
            'letter-spacing:0.3px;background:{};color:{};">{}</span>',
            bg,
            fg,
            label,
        )