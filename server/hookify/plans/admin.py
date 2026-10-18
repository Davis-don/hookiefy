# plans/admin.py

from django.contrib import admin, messages

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
# HELPER — is a plan in use?
# ============================================================

def _plan_in_use(plan):
    """
    Return (in_use: bool, reason: str, count: int).
    Checks both subscription rows and any User.plan FK.
    """
    from subscription.models import Subscription

    sub_count = Subscription.objects.filter(plan=plan).count()
    if sub_count > 0:
        return (
            True,
            f"{sub_count} subscription(s) reference this plan",
            sub_count,
        )

    try:
        from account.models import User
        if hasattr(User, "plan"):
            user_count = User.objects.filter(plan=plan).count()
            if user_count > 0:
                return (
                    True,
                    f"{user_count} user(s) are directly assigned to this plan",
                    user_count,
                )
    except Exception:
        pass

    return (False, "", 0)


# ============================================================
# PLAN ADMIN
# ============================================================

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):

    # ── List view ─────────────────────────────────────────
    list_display = (
        "plan_name",
        "slug",
        "price_display_column",
        "billing_cycle",
        "limits_summary",
        "is_default",
        "is_active",
        "display_order",
    )

    list_display_links = ("plan_name", "slug")

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

    # ── Slug auto-fill when creating a new plan ───────────
    prepopulated_fields = {"slug": ("plan_name",)}

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
        "delete_selected_plans_safe",
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
                level=messages.ERROR,
            )
            return

        plan = queryset.first()

        Plan.objects.exclude(pk=plan.pk).filter(
            is_default=True
        ).update(is_default=False)

        plan.is_default = True
        plan.is_active = True
        plan.save(update_fields=["is_default", "is_active", "updated_at"])

        self.message_user(
            request,
            f"{plan.plan_name} is now the default plan.",
        )

    @admin.action(description="Remove default flag from selected plans")
    def clear_default(self, request, queryset):
        updated = queryset.filter(is_default=True).update(is_default=False)
        self.message_user(
            request,
            f"Default flag removed from {updated} plan(s).",
        )

    @admin.action(
        description="Delete selected plans (blocked if in use)",
    )
    def delete_selected_plans_safe(self, request, queryset):
        """
        Bulk delete that refuses to touch any plan with
        active subscribers or direct user links.
        """
        blocked = []
        deletable = []

        for plan in queryset:
            in_use, reason, count = _plan_in_use(plan)
            if in_use:
                blocked.append((plan, reason, count))
            else:
                deletable.append(plan)

        if blocked:
            parts = [
                f"{p.plan_name} ({reason})"
                for p, reason, _ in blocked
            ]
            self.message_user(
                request,
                f"Could not delete {len(blocked)} plan(s): "
                + "; ".join(parts),
                level=messages.WARNING,
            )

        if deletable:
            names = ", ".join(p.plan_name for p in deletable)
            count = len(deletable)
            for plan in deletable:
                plan.delete()
            self.message_user(
                request,
                f"Deleted {count} plan(s): {names}.",
                level=messages.SUCCESS,
            )

        if not deletable and blocked:
            self.message_user(
                request,
                "No plans were deleted — every selected plan is in use.",
                level=messages.ERROR,
            )

    # ── Single-row delete guard ──────────────────────────

    def delete_model(self, request, obj):
        """Block single delete when the plan is in use."""
        in_use, reason, count = _plan_in_use(obj)
        if in_use:
            self.message_user(
                request,
                f"Cannot delete '{obj.plan_name}' — {reason}.",
                level=messages.ERROR,
            )
            return
        super().delete_model(request, obj)

    def delete_queryset(self, request, queryset):
        """Block bulk delete (via Django's built-in action) on in-use plans."""
        blocked = []
        deletable_ids = []

        for plan in queryset:
            in_use, reason, count = _plan_in_use(plan)
            if in_use:
                blocked.append((plan, reason))
            else:
                deletable_ids.append(plan.pk)

        if blocked:
            parts = [
                f"{p.plan_name} ({reason})"
                for p, reason in blocked
            ]
            self.message_user(
                request,
                f"Skipped {len(blocked)} plan(s) that are in use: "
                + "; ".join(parts),
                level=messages.WARNING,
            )

        if deletable_ids:
            Plan.objects.filter(pk__in=deletable_ids).delete()
            self.message_user(
                request,
                f"Deleted {len(deletable_ids)} plan(s).",
                level=messages.SUCCESS,
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