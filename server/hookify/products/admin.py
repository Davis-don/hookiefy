from django.contrib import admin
from .models import Products


@admin.register(Products)
class ProductsAdmin(admin.ModelAdmin):

    # ── List view ─────────────────────────────────────────
    list_display = (
        "name",
        "business",
        "price",
        "has_image",
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
        "property1",
        "property2",
        "property3",
        "property4",
        "property5",
        "business__business_name",
    )

    # ── Ordering & performance ────────────────────────────
    ordering = ("-created_at",)
    list_select_related = ("business",)
    raw_id_fields = ("business",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 25

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
        ("Image", {
            "fields": (
                "image_url",
                "image_public_id",
            ),
        }),
        ("Properties (all optional)", {
            "fields": (
                "property1",
                "property2",
                "property3",
                "property4",
                "property5",
            ),
            "classes": ("collapse",),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(boolean=True, description="Image")
    def has_image(self, obj):
        return bool(obj.image_url)