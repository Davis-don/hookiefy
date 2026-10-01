# subscription/admin.py
from datetime import timedelta

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):

    # ========================================================
    # LIST VIEW
    # ========================================================

    list_display = (
        "short_user",
        "plan_link",
        "status_badge",
        "start_date",
        "end_date",
        "days_remaining_display",
        "created_at",
    )

    list_filter = (
        "plan",
        "start_date",
        "end_date",
        "created_at",
    )

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "user__phone_number",
        "plan__name",
        "plan__slug",
    )

    readonly_fields = (
        "start_date",
        "end_date",
        "created_at",
        "updated_at",
        "is_active_display",
        "is_expired_display",
        "days_remaining_display_full",
        "seconds_remaining_display",
    )

    ordering = ("-start_date",)
    date_hierarchy = "start_date"
    list_select_related = ("user", "plan")
    list_per_page = 50

    # ========================================================
    # FORM LAYOUT
    # ========================================================

    fieldsets = (
        ("Subscription", {
            "fields": (
                "user",
                "plan",
            )
        }),
        ("Dates", {
            "fields": (
                "start_date",
                "end_date",
            ),
            "description": (
                "start_date is auto-set on create. "
                "end_date is auto-computed as start_date + 30 days "
                "for paid plans. Free plans never expire."
            ),
        }),
        ("Derived", {
            "fields": (
                "is_active_display",
                "is_expired_display",
                "days_remaining_display_full",
                "seconds_remaining_display",
            ),
        }),
        ("Timestamps", {
            "fields": (
                "created_at",
                "updated_at",
            )
        }),
    )

    # ========================================================
    # QUERYSET OPTIMISATION
    # ========================================================

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("user", "plan")
        )

    # ========================================================
    # LIST COLUMNS
    # ========================================================

    @admin.display(
        description="User",
        ordering="user__email",
    )
    def short_user(self, obj):
        if not obj.user:
            return "—"

        return format_html(
            '<a href="/admin/account/accounts/{}/change/">'
            '{} <span style="color:#94a3b8">({})</span>'
            "</a>",
            obj.user.id,
            obj.user.full_name or obj.user.email,
            obj.user.role,
        )

    @admin.display(description="Plan", ordering="plan__name")
    def plan_link(self, obj):
        if not obj.plan:
            return "—"

        return format_html(
            '<a href="/admin/plans/plan/{}/change/">'
            '{} <span style="color:#94a3b8">(KES {})</span>'
            "</a>",
            obj.plan.id,
            obj.plan.name,
            obj.plan.price,
        )

    @admin.display(description="Status")
    def status_badge(self, obj):
        if obj.is_free_plan:
            label = "Free"
            color = "#1d4ed8"
            bg = "rgba(59,130,246,0.14)"
        elif obj.is_active:
            label = "Active"
            color = "#047857"
            bg = "rgba(16,185,129,0.14)"
        elif obj.is_expired:
            label = "Expired"
            color = "#b91c1c"
            bg = "rgba(239,68,68,0.14)"
        else:
            label = "Unknown"
            color = "#64748b"
            bg = "#f1f5f9"

        return format_html(
            '<span style="display:inline-block;padding:2px 10px;'
            "border-radius:999px;font-size:11px;font-weight:700;"
            'color:{};background:{};">{}</span>',
            color,
            bg,
            label,
        )

    @admin.display(description="Days left")
    def days_remaining_display(self, obj):
        if obj.is_free_plan:
            return format_html(
                '<strong style="color:{};">∞</strong>',
                "#1d4ed8",
            )

        if not obj.is_active:
            return "—"

        days = obj.days_remaining

        if days <= 3:
            color = "#b91c1c"
        elif days <= 7:
            color = "#b45309"
        else:
            color = "#047857"

        return format_html(
            '<strong style="color:{};">{} day{}</strong>',
            color,
            days,
            "" if days == 1 else "s",
        )

    # ========================================================
    # READ-ONLY DERIVED FIELDS
    # ========================================================

    @admin.display(description="Is active?")
    def is_active_display(self, obj):
        return obj.is_active

    @admin.display(description="Is expired?")
    def is_expired_display(self, obj):
        return obj.is_expired

    @admin.display(description="Days remaining")
    def days_remaining_display_full(self, obj):
        if obj.is_free_plan:
            return format_html(
                '<strong style="color:{};">∞</strong>',
                "#1d4ed8",
            )
        return obj.days_remaining

    @admin.display(description="Seconds remaining")
    def seconds_remaining_display(self, obj):
        if obj.is_free_plan:
            return format_html(
                '<strong style="color:{};">∞</strong>',
                "#1d4ed8",
            )
        return obj.seconds_remaining

    # ========================================================
    # BULK ACTIONS
    # ========================================================

    actions = (
        "extend_30_days",
        "extend_90_days",
        "expire_now",
    )

    @admin.action(description="Extend selected by 30 days")
    def extend_30_days(self, request, queryset):
        count = 0
        now = timezone.now()

        for sub in queryset:
            if sub.is_free_plan:
                continue

            base = (
                sub.end_date
                if sub.end_date and sub.end_date > now
                else now
            )
            sub.end_date = base + timedelta(days=30)
            sub.save(update_fields=["end_date", "updated_at"])
            count += 1

        self.message_user(
            request,
            f"{count} subscription(s) extended by 30 days.",
        )

    @admin.action(description="Extend selected by 90 days")
    def extend_90_days(self, request, queryset):
        count = 0
        now = timezone.now()

        for sub in queryset:
            if sub.is_free_plan:
                continue

            base = (
                sub.end_date
                if sub.end_date and sub.end_date > now
                else now
            )
            sub.end_date = base + timedelta(days=90)
            sub.save(update_fields=["end_date", "updated_at"])
            count += 1

        self.message_user(
            request,
            f"{count} subscription(s) extended by 90 days.",
        )

    @admin.action(description="Expire selected now")
    def expire_now(self, request, queryset):
        # Free plans never expire — skip them.
        paid = queryset.exclude(plan__name__iexact="free")
        count = paid.update(end_date=timezone.now())
        self.message_user(
            request,
            f"{count} subscription(s) expired "
            f"(free plans skipped).",
        )

    # ========================================================
    # PERMISSIONS
    # ========================================================

    def has_add_permission(self, request):
        return True

    def has_delete_permission(self, request, obj=None):
        return True