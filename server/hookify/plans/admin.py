# plans/admin.py

from django.contrib import admin

from .models import Plan, PlanProperty


# ============================================================
# INLINE — PlanProperty
# ============================================================
# Shown inside the Plan edit page so you can add / edit /
# delete properties without leaving the plan.

class PlanPropertyInline(admin.TabularInline):
    model = PlanProperty
    extra = 1
    fields = (
        "name",
        "value",
        "is_highlighted",
        "sort_order",
    )
    ordering = ("sort_order", "created_at")
    verbose_name = "Plan Property"
    verbose_name_plural = "Plan Properties"


# ============================================================
# PLAN ADMIN
# ============================================================

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):

    # ── List view ─────────────────────────────────────────
    list_display = (
        "plan_name",
        "price_display_column",
        "billing_cycle",
        "limits_summary",
        "is_default",
        "is_active",
        "display_order",
    )

    list_display_links = ("plan_name",)

    # ── Filters ───────────────────────────────────────────
    list_filter = (
        "is_active",
        "is_default",
        "billing_cycle",
        "analytics_level",
        "connection_fee_type",
    )

    # ── Search ────────────────────────────────────────────
    search_fields = (
        "plan_name",
        "slug",
        "description",
    )

    # ── Ordering & performance ────────────────────────────
    ordering = ("display_order", "price", "plan_name")
    list_per_page = 25
    list_editable = ("is_active", "is_default", "display_order")

    # ── Detail page layout ────────────────────────────────
    fieldsets = (
        ("Identity", {
            "fields": (
                "plan_name",
                "slug",
                "description",
            ),
        }),
        ("Pricing", {
            "fields": (
                "price",
                "billing_cycle",
            ),
            "description": (
                "Set price to 0 and billing cycle to 'free' "
                "for a free plan."
            ),
        }),
        ("Limits", {
            "fields": (
                "businesses_limit",
                "posts_limit",
                "products_limit",
                "images_per_product",
                "stories_per_month",
                "profile_images_limit",
            ),
            "description": (
                "Leave any limit empty for unlimited. "
                "For example, a blank products_limit means "
                "unlimited products on this plan."
            ),
        }),
        ("Visibility", {
            "fields": (
                "featured_listing",
                "verified_premium_badge",
                "priority_visibility",
            ),
        }),
        ("Features", {
            "fields": (
                "analytics_level",
                "connection_fee_type",
            ),
        }),
        ("Status", {
            "fields": (
                "is_active",
                "is_default",
                "display_order",
            ),
            "description": (
                "Only one plan can be the default. Saving a new "
                "default automatically un-marks the previous one."
            ),
        }),
        ("Timestamps", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    readonly_fields = ("created_at", "updated_at")

    # ── Inlines ───────────────────────────────────────────
    inlines = (PlanPropertyInline,)

    # ── Bulk actions ──────────────────────────────────────
    actions = (
        "mark_active",
        "mark_inactive",
        "mark_default",
        "clear_default",
    )

    # ── Custom columns ────────────────────────────────────

    @admin.display(description="Price", ordering="price")
    def price_display_column(self, obj):
        if obj.is_free:
            return "Free"
        return f"KES {obj.price:,.0f}"

    @admin.display(description="Limits")
    def limits_summary(self, obj):
        """
        Short readable string of the plan's caps.
        Example: "3 biz · 50 posts · 200 products"
        """
        parts = []

        def cap(value, label):
            if value is None:
                parts.append(f"∞ {label}")
            else:
                parts.append(f"{value} {label}")

        cap(obj.businesses_limit, "biz")
        cap(obj.posts_limit, "posts")
        cap(obj.products_limit, "products")

        return " · ".join(parts)

    # ── Bulk actions ──────────────────────────────────────

    @admin.action(description="Activate selected plans")
    def mark_active(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} plan(s) activated.")

    @admin.action(description="Deactivate selected plans")
    def mark_inactive(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} plan(s) deactivated.")

    @admin.action(description="Mark selected plan as the default")
    def mark_default(self, request, queryset):
        if queryset.count() != 1:
            self.message_user(
                request,
                "Select exactly one plan to mark as default.",
                level="error",
            )
            return

        plan = queryset.first()

        # Un-mark any current default
        Plan.objects.exclude(pk=plan.pk).filter(
            is_default=True
        ).update(is_default=False)

        plan.is_default = True
        plan.is_active = True
        plan.save(update_fields=["is_default", "is_active", "updated_at"])

        self.message_user(request, f"{plan.plan_name} is now the default plan.")

    @admin.action(description="Remove default flag from selected plans")
    def clear_default(self, request, queryset):
        updated = queryset.filter(is_default=True).update(is_default=False)
        self.message_user(
            request,
            f"Default flag removed from {updated} plan(s).",
        )


# ============================================================
# PLAN PROPERTY ADMIN
# ============================================================
# Standalone admin, so you can edit properties directly
# across every plan. The same model is also editable inline
# inside a Plan.

@admin.register(PlanProperty)
class PlanPropertyAdmin(admin.ModelAdmin):

    list_display = (
        "name",
        "value",
        "plan",
        "is_highlighted",
        "sort_order",
    )

    list_display_links = ("name",)

    list_filter = (
        "is_highlighted",
        "plan",
    )

    search_fields = (
        "name",
        "value",
        "plan__plan_name",
    )

    ordering = ("plan", "sort_order", "created_at")

    list_select_related = ("plan",)
    raw_id_fields = ("plan",)

    readonly_fields = ("created_at",)

    list_per_page = 50