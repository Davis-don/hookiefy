# account/admin.py

from django.contrib import admin

from .models import Accounts


@admin.register(Accounts)
class AccountsAdmin(admin.ModelAdmin):

    # ── List view ─────────────────────────────────────────
    list_display = (
        "email",
        "first_name",
        "last_name",
        "role",
        "current_plan",      # ← computed from subscription
        "auth_provider",
        "is_active",
        "date_joined",
    )

    # ── Filters ───────────────────────────────────────────
    list_filter = (
        "role",
        "auth_provider",
        "is_active",
        "gender",
    )

    # ── Search ────────────────────────────────────────────
    search_fields = (
        "email",
        "first_name",
        "last_name",
        "phone_number",
    )

    # ── Ordering ──────────────────────────────────────────
    ordering = ("-date_joined",)

    # ── Read-only ─────────────────────────────────────────
    readonly_fields = (
        "date_joined",
        "last_login",
        "current_plan_readonly",
    )

    # ── Detail page layout ────────────────────────────────
    fieldsets = (
        ("Identity", {
            "fields": (
                "email",
                "first_name",
                "last_name",
                "gender",
                "phone_number",
            ),
        }),
        ("Authentication", {
            "fields": (
                "auth_provider",
                "google_id",
                "is_active",
                "is_staff",
                "is_superuser",
                "role",
            ),
        }),
        ("Profile", {
            "fields": (
                "profile_image_url",
                "profile_image_public_id",
            ),
        }),
        ("Subscription", {
            "fields": ("current_plan_readonly",),
            "description": (
                "The plan below is derived from this user's "
                "active Subscription. To change it, edit the "
                "subscription from the Subscriptions admin."
            ),
        }),
        ("Important dates", {
            "fields": (
                "last_login",
                "date_joined",
            ),
            "classes": ("collapse",),
        }),
    )

    # ── Computed columns ──────────────────────────────────

    @admin.display(description="Plan")
    def current_plan(self, obj):
        """
        Show the plan name in the changelist.

        Uses the effective plan — active subscription first,
        then the system default fallback.
        """
        plan = obj.effective_plan
        if plan is None:
            return "—"

        label = plan.plan_name
        if plan.is_default:
            label += " · default"
        return label

    @admin.display(description="Plan")
    def current_plan_readonly(self, obj):
        """
        Detail-page display. Shows the subscription's plan,
        status, and how much time is left.
        """
        sub = obj.active_subscription

        if sub is None:
            plan = obj.effective_plan
            if plan is None:
                return "No subscription and no default plan configured."
            return (
                f"{plan.plan_name} "
                f"(no active subscription — falling back to default)"
            )

        return (
            f"{sub.plan.plan_name} · "
            f"status: {sub.status} · "
            f"{sub.duration_display}"
        )