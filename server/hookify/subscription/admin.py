# subscription/admin.py

from django.contrib import admin

from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):

    list_display = (
        "user",
        "plan",
        "status",
        "start_date",
        "end_date",
        "duration_short",
        "auto_renew",
    )

    list_filter = ("status", "plan", "auto_renew")

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "payment_reference",
    )

    ordering = ("-created_at",)
    list_select_related = ("user", "plan")
    raw_id_fields = ("user", "plan")
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        ("Subscription", {
            "fields": ("user", "plan", "status"),
        }),
        ("Dates", {
            "fields": ("start_date", "end_date"),
            "description": (
                "Leave End date empty for a subscription that "
                "never expires."
            ),
        }),
        ("Renewal", {
            "fields": ("auto_renew", "payment_reference"),
        }),
        ("Notes", {
            "fields": ("note",),
        }),
        ("Metadata", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )

    @admin.display(description="Time left")
    def duration_short(self, obj):
        return obj.duration_display