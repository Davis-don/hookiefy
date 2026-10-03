from django.contrib import admin
from .models import Businesses


@admin.register(Businesses)
class BusinessesAdmin(admin.ModelAdmin):

    list_display = (
        "business_name",
        "business_category",
        "business_type",
        "owner",
        "county",
        "city_town",
        "region",
        "created_at",
    )

    list_display_links = ("business_name",)

    list_filter = (
        "business_category",
        "county",
        "created_at",
    )

    search_fields = (
        "business_name",
        "business_type",
        "description",
        "county",
        "city_town",
        "region",
        "owner__email",
        "owner__first_name",
        "owner__last_name",
    )

    ordering = ("-created_at",)
    list_select_related = ("owner",)
    raw_id_fields = ("owner",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 25

    fieldsets = (
        ("Owner", {
            "fields": ("owner",),
        }),
        ("Business", {
            "fields": (
                "business_name",
                "business_category",
                "business_type",
                "description",
            ),
        }),
        ("Location", {
            "fields": (
                "county",
                "city_town",
                "region",
            ),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    actions = ("mark_as_services", "mark_as_goods")

    @admin.action(description="Mark selected as Services")
    def mark_as_services(self, request, queryset):
        updated = queryset.update(business_category="services")
        self.message_user(request, f"{updated} business(es) marked as Services.")

    @admin.action(description="Mark selected as Goods")
    def mark_as_goods(self, request, queryset):
        updated = queryset.update(business_category="goods")
        self.message_user(request, f"{updated} business(es) marked as Goods.")