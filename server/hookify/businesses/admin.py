from django.contrib import admin
from .models import Businesses


@admin.register(Businesses)
class BusinessesAdmin(admin.ModelAdmin):

    # ── List view columns ─────────────────────────────────
    list_display = (
        "business_name",
        "business_category",
        "business_type",
        "status",
        "owner",
        "county",
        "city_town",
        "created_at",
    )

    list_display_links = ("business_name",)

    # ── Filters ───────────────────────────────────────────
    list_filter = (
        "status",
        "business_category",
        "county",
        "created_at",
    )

    # ── Search ────────────────────────────────────────────
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

    # ── Ordering & performance ────────────────────────────
    ordering = ("-created_at",)
    list_select_related = ("owner",)
    raw_id_fields = ("owner",)
    readonly_fields = ("created_at", "updated_at")
    list_per_page = 25

    # ── Detail page layout ────────────────────────────────
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
        ("Status", {
            "fields": ("status",),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    # ── Bulk actions ──────────────────────────────────────
    actions = (
        "mark_as_active",
        "mark_as_paused",
        "mark_as_closed",
        "mark_as_suspended",
        "mark_as_services",
        "mark_as_goods",
    )

    # ── Status actions ────────────────────────────────────
    @admin.action(description="Set status → Active")
    def mark_as_active(self, request, queryset):
        updated = queryset.update(status="active")
        self.message_user(request, f"{updated} business(es) set to Active.")

    @admin.action(description="Set status → Paused")
    def mark_as_paused(self, request, queryset):
        updated = queryset.update(status="paused")
        self.message_user(request, f"{updated} business(es) set to Paused.")

    @admin.action(description="Set status → Closed")
    def mark_as_closed(self, request, queryset):
        updated = queryset.update(status="closed")
        self.message_user(request, f"{updated} business(es) set to Closed.")

    @admin.action(description="Set status → Suspended")
    def mark_as_suspended(self, request, queryset):
        updated = queryset.update(status="suspended")
        self.message_user(request, f"{updated} business(es) suspended.")

    # ── Category actions ──────────────────────────────────
    @admin.action(description="Mark category → Services")
    def mark_as_services(self, request, queryset):
        updated = queryset.update(business_category="services")
        self.message_user(request, f"{updated} business(es) marked as Services.")

    @admin.action(description="Mark category → Goods")
    def mark_as_goods(self, request, queryset):
        updated = queryset.update(business_category="goods")
        self.message_user(request, f"{updated} business(es) marked as Goods.")