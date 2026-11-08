# products/admin.py

from django import forms
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
# DELIVERY TOWNS WIDGET
# ============================================================
#
# The model stores `delivery_towns` as a JSON list of strings.
# In the admin we want a friendly textarea (one town per line)
# rather than raw JSON. This widget serialises between the two.
# ============================================================

class DeliveryTownsWidget(forms.Textarea):
    template_name = "django/forms/widgets/textarea.html"

    def format_value(self, value):
        if isinstance(value, list):
            return "\n".join(str(v) for v in value)
        return value or ""


class ProductAdminForm(forms.ModelForm):
    delivery_towns = forms.CharField(
        required=False,
        widget=DeliveryTownsWidget(attrs={
            "rows": 4,
            "placeholder": "Nairobi\nMombasa\nKisumu",
            "style": "width: 100%; font-family: monospace;",
        }),
        help_text=(
            "One town per line. Only used when delivery scope "
            "is 'Specific towns only'. Case-insensitive."
        ),
    )

    class Meta:
        model = Products
        fields = "__all__"

    def clean_delivery_towns(self):
        raw = self.cleaned_data.get("delivery_towns") or ""
        if isinstance(raw, str):
            towns = [t.strip() for t in raw.splitlines() if t.strip()]
        else:
            towns = raw
        return towns


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
# DELIVERY FILTER
# ============================================================
#
# Sidebar filter for the three delivery scopes. Uses the
# model's own choices so it stays in sync if new scopes
# are added later.
# ============================================================

class DeliveryScopeFilter(admin.SimpleListFilter):
    title = "delivery"
    parameter_name = "delivery"

    def lookups(self, request, model_admin):
        return Products.DELIVERY_CHOICES

    def queryset(self, request, queryset):
        value = self.value()
        if value:
            return queryset.filter(delivery_scope=value)
        return queryset


# ============================================================
# PRODUCTS ADMIN
# ============================================================

@admin.register(Products)
class ProductsAdmin(admin.ModelAdmin):
    form = ProductAdminForm

    # ── List view ─────────────────────────────────────────
    #
    # `product_id` comes first so admins can scan the numeric
    # id straight off the changelist — the same id the Add-
    # order wizard asks for, the same id shown on the product
    # detail page's "Product ID" block, and the same id the
    # WhatsApp seller message embeds.
    #
    # `delivery_badge` shows the current delivery policy at a
    # glance so the admin doesn't have to open each product.
    #
    list_display = (
        "product_id",
        "name",
        "business",
        "price",
        "stock_badge",
        "delivery_badge",
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
        DeliveryScopeFilter,
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
        ("Delivery", {
            "fields": (
                "delivery_scope",
                "delivery_towns",
            ),
            "description": (
                "Choose how this product is delivered. If you pick "
                "<b>Specific towns only</b>, enter one town per line "
                "in the text area below."
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

    @admin.display(
        description="Delivery",
        ordering="delivery_scope",
    )
    def delivery_badge(self, obj):
        """
        Colour-coded delivery indicator.

        Green: everywhere
        Blue:  specific towns (shows the first town + count)
        Red:   no delivery
        """
        scope = obj.delivery_scope

        if scope == Products.DELIVERY_EVERYWHERE:
            bg, fg, label = "#ECFDF5", "#047857", "Everywhere"

        elif scope == Products.DELIVERY_SPECIFIC:
            towns = obj.delivery_towns or []
            count = len(towns)
            if count == 0:
                label = "Specific (none set)"
            elif count == 1:
                label = f"Only {towns[0]}"
            else:
                label = f"{count} towns"
            bg, fg = "#EFF6FF", "#1D4ED8"

        elif scope == Products.DELIVERY_NONE:
            bg, fg, label = "#FEF2F2", "#B91C1C", "No delivery"

        else:
            # Unknown scope (shouldn't happen with choices).
            bg, fg, label = "#F1F5F9", "#334155", scope

        return format_html(
            '<span style="display:inline-block;padding:2px 8px;'
            'border-radius:999px;font-size:0.72rem;font-weight:700;'
            'letter-spacing:0.3px;background:{};color:{};">{}</span>',
            bg,
            fg,
            label,
        )